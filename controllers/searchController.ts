import { AuthenticatedRequest } from "../middleware/authenticateToken";
import { RequestHandler, Response } from "express";
import { createSignedUrl } from "../utils/imageUtils";
import { pool } from "../server";

export const searchAll: RequestHandler = async (req: AuthenticatedRequest, res: Response) =>{
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

        const users = await pool.query(`
            SELECT 
                id, 
                username, 
                image_url AS profile_image, 
                'user' AS type
            FROM users
            WHERE username ILIKE $1
            LIMIT 10 OFFSET $2;
        `, [searchTerm, userOffset]);

        const cleanUsers = await Promise.all(
        users.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.profile_image) // 1h expiry
            return {
            ...row,
            profile_image: signedUrl,
            };
        })
        );

        const templates = await pool.query(`
            SELECT id, 
            title, 
            image_url AS thumbnail, 
            'template' AS type
            FROM templates
            WHERE title ILIKE $1 OR description ILIKE $1 AND public = TRUE
            LIMIT 10 OFFSET $2;
        `, [searchTerm, templateOffset]);

        const templateRowsWithSignedUrls = await Promise.all(
            templates.rows.map(async (row) => {
                const signedUrl = await createSignedUrl(row.thumbnail) // 1h expiry
                return {
                ...row,
                thumbnail: signedUrl,
                };
            })
        );

        const events = await pool.query(`
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
        `, [searchTerm, req.user?.id, eventOffset]);

        const eventRowsWithSignedUrls = await Promise.all(
        events.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.thumbnail) // 1h expiry
            return {
            ...row,
            thumbnail: signedUrl,
            };
        })
        );

        res.status(200).json({events: eventRowsWithSignedUrls, templates: templateRowsWithSignedUrls, users: cleanUsers});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const fetchTrending: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const eventOffset = parseInt(req.params.eventoffset) || 0;
    const templateOffset = parseInt(req.params.templateoffset) || 0;

    try {
        const eventResults = await pool.query(`
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
        `, [req.user?.id, eventOffset]);

        const eventRowsWithSignedUrls = await Promise.all(
        eventResults.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.thumbnail) // 1h expiry
            return {
            ...row,
            thumbnail: signedUrl,
            };
        })
        );

        const templateResults = await pool.query(`
            SELECT id, title, description, image_url AS thumbnail, 'template' AS type
            FROM templates
            WHERE public = TRUE
            ORDER BY created_at DESC
            LIMIT 10 OFFSET $1;
        `, [templateOffset]);

        const templateRowsWithSignedUrls = await Promise.all(
        templateResults.rows.map(async (row) => {
            const signedUrl = await createSignedUrl(row.thumbnail) // 1h expiry
            return {
            ...row,
            thumbnail: signedUrl,
            };
        })
        );

        res.status(200).json({events: eventRowsWithSignedUrls, templates: templateRowsWithSignedUrls});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};