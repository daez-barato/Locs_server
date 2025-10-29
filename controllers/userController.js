"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePrivacy = exports.getUserSavedTemplates = exports.deleteTemplate = exports.saveTemplate = exports.getUserById = void 0;
const imageUtils_1 = require("../utils/imageUtils");
const server_1 = require("../server");
const getUserById = async (req, res) => {
    var _a, _b, _c, _d, _e;
    const userId = req.params.id;
    const owner = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) == userId;
    try {
        const user = await server_1.pool.query(`
            SELECT
                u.id,
                u.username,
                u.coins,
                u.image_url AS profile_image,
                u.created_at,
                u.public,
                CASE
                    WHEN f.follower_id IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS is_following,
                CASE
                    WHEN fr.requester IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS has_requested
            FROM users u
            LEFT JOIN followers f ON f.followed_id = u.id AND f.follower_id = $2
            LEFT JOIN follow_requests fr ON fr.requester = $2 AND fr.requested = $1
            WHERE u.id = $1;
        `, [userId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.id]);
        if (user.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        ;
        const followerCount = await server_1.pool.query(`
            SELECT COUNT(*) AS follower_count
            FROM users u
            JOIN followers f ON f.followed_id = u.id
            WHERE u.id = $1;
        `, [userId]);
        const followingCount = await server_1.pool.query(`
            SELECT COUNT(*) AS following_count
            FROM users u
            JOIN followers f ON f.follower_id = u.id
            WHERE u.id = $1;
        `, [userId]);
        if (!user.rows[0].public && (!owner && !user.rows[0].is_following)) {
            res.status(200).json({
                user: { ...user.rows[0],
                    ...followerCount.rows[0],
                    ...followingCount.rows[0],
                    profile_image: await (0, imageUtils_1.createSignedUrl)(user.rows[0].profile_image),
                    owner: owner,
                    created: [],
                    participated: [],
                }
            });
            return;
        }
        ;
        const created = await server_1.pool.query(`SELECT
                e.id,
                e.expire_date,
                t.title,
                t.description,
                e.locked,
                e.decided,
                t.image_url as thumbnail,
                c.username AS creator_username,
                CASE 
                    WHEN e.creator_id = $2 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT(DISTINCT b.user_id) as participants_count
            FROM events e
            JOIN users c ON e.creator_id = c.id
            JOIN templates t ON e.template = t.id
            LEFT JOIN bets b ON e.id = b.event_id
            WHERE $1 = e.creator_id
            GROUP BY e.id, t.id, t.image_url, c.username
            ORDER BY 
                CASE 
                    WHEN e.decided = TRUE THEN 2   -- decided last
                    WHEN e.locked = TRUE THEN 1    -- locked after unlocked
                    ELSE 0                         -- unlocked first
                END,
                e.expire_date ASC,
                e.created_at DESC
            LIMIT 10;`, [userId, (_c = req.user) === null || _c === void 0 ? void 0 : _c.id]);
        const createdRowsWithSignedUrls = await Promise.all(created.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        const participated = await server_1.pool.query(`SELECT
                e.id,
                e.expire_date,
                t.title,
                t.description,
                e.locked,
                e.decided,
                t.image_url as thumbnail,
                c.username AS creator_username,
                CASE 
                    WHEN e.creator_id = $2 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT(DISTINCT d.user_id) as participants_count
            FROM bets b  
            JOIN events e ON b.event_id = e.id
            JOIN users c ON e.creator_id = c.id
            JOIN templates t ON e.template = t.id
            LEFT JOIN bets d ON d.event_id = e.id
            WHERE $1 = b.user_id
            GROUP BY e.id, t.title, t.description, t.image_url, c.username
            ORDER BY 
                CASE 
                    WHEN e.decided = TRUE THEN 2   -- decided last
                    WHEN e.locked = TRUE THEN 1    -- locked after unlocked
                    ELSE 0                         -- unlocked first
                END,
                e.expire_date ASC,
                e.created_at DESC
            LIMIT 10;`, [userId, (_d = req.user) === null || _d === void 0 ? void 0 : _d.id]);
        const participatedRowsWithSignedUrls = await Promise.all(participated.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        let requestList = [];
        if (owner) {
            const requests = await server_1.pool.query(`SELECT
                    u.id,
                    u.username, 
                    u.image_url AS profile_image,
                    u.coins,
                    u.created_at,
                    u.public,
                    TRUE AS requester,
                    CASE 
                        WHEN fo.follower_id IS NOT NULL THEN TRUE
                        ELSE FALSE
                    END AS is_following,
                    CASE 
                        WHEN fr.requester IS NOT NULL THEN TRUE
                        ELSE FALSE
                    END AS has_requested
                    FROM follow_requests f
                    JOIN users u ON f.requester = u.id
                    LEFT JOIN followers fo ON fo.follower_id = $2 AND fo.followed_id = $1
                    LEFT JOIN follow_requests fr ON fr.requester = $2 AND fr.requested = $1
                    WHERE f.requested = $1;
                `, [userId, (_e = req.user) === null || _e === void 0 ? void 0 : _e.id]);
            requestList = await Promise.all(requests.rows.map(async (row) => {
                const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.profile_image); // 1h expiry
                return {
                    ...row,
                    profile_image: signedUrl,
                };
            }));
        }
        res.status(200).json({
            user: { ...user.rows[0],
                ...followerCount.rows[0],
                ...followingCount.rows[0],
                profile_image: await (0, imageUtils_1.createSignedUrl)(user.rows[0].profile_image),
                owner: owner,
                created: createdRowsWithSignedUrls,
                participated: participatedRowsWithSignedUrls,
                requests: requestList,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.getUserById = getUserById;
const saveTemplate = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { templateId } = req.params;
    try {
        const result = await server_1.pool.query(`INSERT INTO saved_templates (user_id, template_id) VALUES ($1, $2)
            ON CONFLICT (user_id, template_id) DO NOTHING
            RETURNING *;`, [userId, templateId]);
        if (result.rowCount === 0) {
            res.status(409).json({ error: "Error updating template" });
            console.error("Error saving template");
            return;
        }
        res.status(200).json({ message: "Success" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.saveTemplate = saveTemplate;
const deleteTemplate = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { templateId } = req.params;
    try {
        const result = await server_1.pool.query(`DELETE FROM saved_templates 
             WHERE user_id = $1 AND template_id = $2
             RETURNING *;`, [userId, templateId]);
        if (result.rowCount === 0) {
            // No row was deleted — maybe it didn’t exist
            res.status(404).json({ error: "Template not found" });
            console.error("Error deleting template: not found");
            return;
        }
        res.status(200).json({ message: "Template deleted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.deleteTemplate = deleteTemplate;
const getUserSavedTemplates = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = await server_1.pool.query(`
            SELECT t.id, t.title, t.description, t.creator_id, t.image_url as thumbnail
            FROM saved_templates s
            JOIN templates t ON s.template_id = t.id
            WHERE s.user_id = $1;
        `, [userId]);
        const rowsWithSignedUrls = await Promise.all(result.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        res.status(200).json({ result: rowsWithSignedUrls });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.getUserSavedTemplates = getUserSavedTemplates;
const changePrivacy = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(400).json({ error: "Missing user ID" });
        return;
    }
    try {
        const result = await server_1.pool.query(`
      UPDATE users
      SET public = NOT public
      WHERE id = $1
      RETURNING public;
      `, [userId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({ public: result.rows[0].public });
    }
    catch (err) {
        console.error("Error changing privacy:", err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.changePrivacy = changePrivacy;
