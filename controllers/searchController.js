"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrending = exports.searchAll = void 0;
const imageUtils_1 = require("../utils/imageUtils");
const server_1 = require("../server");
const searchAll = async (req, res) => {
    var _a;
    const q = decodeURI(req.params.q);
    const eventOffset = parseInt(req.params.eventoffset) || 0;
    const templateOffset = parseInt(req.params.templateoffset) || 0;
    const userOffset = parseInt(req.params.useroffset) || 0;
    if (!q || typeof q !== "string") {
        res.status(400).json({ error: "Missing or invalid query parameter 'q'" });
        return;
    }
    try {
        const searchTerm = `%${q}%`;
        const users = await server_1.pool.query(`
            SELECT 
                id, 
                username, 
                image_url AS profile_image, 
                'user' AS type
            FROM users
            WHERE username ILIKE $1
            LIMIT 10 OFFSET $2;
        `, [searchTerm, userOffset]);
        const cleanUsers = await Promise.all(users.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.profile_image); // 1h expiry
            return {
                ...row,
                profile_image: signedUrl,
            };
        }));
        const templates = await server_1.pool.query(`
            SELECT id, 
            title, 
            image_url AS thumbnail, 
            'template' AS type
            FROM templates
            WHERE title ILIKE $1 OR description ILIKE $1 AND public = TRUE
            LIMIT 10 OFFSET $2;
        `, [searchTerm, templateOffset]);
        const templateRowsWithSignedUrls = await Promise.all(templates.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        const events = await server_1.pool.query(`
            SELECT 
                e.id,
                t.title, 
                t.description, 
                e.expire_date, 
                t.image_url AS thumbnail, 
                e.locked,
                CASE 
                    WHEN e.creator_id = $2 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT(DISTINCT b.user_id) AS participants_count,
                'event' AS type
            FROM events e
            JOIN templates t ON t.id = e.template
            LEFT JOIN bets b ON e.id = b.event_id
            WHERE (t.title ILIKE $1 OR t.description ILIKE $1) AND e.expire_date > NOW() AND e.locked = false AND e.public = TRUE
            GROUP BY e.id, t.id
            ORDER BY e.expire_date ASC
            LIMIT 10 OFFSET $3;
        `, [searchTerm, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, eventOffset]);
        const eventRowsWithSignedUrls = await Promise.all(events.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        res.status(200).json({ events: eventRowsWithSignedUrls, templates: templateRowsWithSignedUrls, users: cleanUsers });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.searchAll = searchAll;
const fetchTrending = async (req, res) => {
    var _a;
    const eventOffset = parseInt(req.params.eventoffset) || 0;
    const templateOffset = parseInt(req.params.templateoffset) || 0;
    try {
        const eventResults = await server_1.pool.query(`
            SELECT 
                e.id,
                t.title, 
                t.description, 
                e.expire_date, 
                t.image_url AS thumbnail, 
                e.locked,
                CASE 
                    WHEN e.creator_id = $1 THEN TRUE 
                    ELSE FALSE 
                END AS is_creator,
                COUNT(DISTINCT b.user_id) AS participants_count,
                'event' AS type
            FROM events e
            JOIN templates t ON t.id = e.template
            LEFT JOIN bets b ON e.id = b.event_id
            WHERE e.expire_date > NOW() AND e.locked = false AND e.public = TRUE
            GROUP BY e.id, t.id
            ORDER BY e.expire_date ASC
            LIMIT 10 OFFSET $2;
        `, [(_a = req.user) === null || _a === void 0 ? void 0 : _a.id, eventOffset]);
        const eventRowsWithSignedUrls = await Promise.all(eventResults.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        const templateResults = await server_1.pool.query(`
            SELECT id, title, description, image_url AS thumbnail, 'template' AS type
            FROM templates
            WHERE public = TRUE
            ORDER BY created_at DESC
            LIMIT 10 OFFSET $1;
        `, [templateOffset]);
        const templateRowsWithSignedUrls = await Promise.all(templateResults.rows.map(async (row) => {
            const signedUrl = await (0, imageUtils_1.createSignedUrl)(row.thumbnail); // 1h expiry
            return {
                ...row,
                thumbnail: signedUrl,
            };
        }));
        res.status(200).json({ events: eventRowsWithSignedUrls, templates: templateRowsWithSignedUrls });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.fetchTrending = fetchTrending;
