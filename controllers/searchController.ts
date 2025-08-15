import { Pool } from "pg";
import { AuthenticatedRequest } from "../middleware/authenticateToken";
import { RequestHandler, Response } from "express";



const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const searchAll: RequestHandler = async (req: AuthenticatedRequest, res: Response) =>{
    const q = decodeURI(req.params.q);


    if (!q || typeof q !== "string") {
        res.status(400).json({ error: "Missing or invalid query parameter 'q'" });
        return;
    }

    try {
        const searchTerm = `%${q}%`;

        const users = await pool.query(`
            SELECT id, username AS title, image_url AS thumbnail, 'user' AS type
            FROM users
            WHERE username ILIKE $1
            LIMIT 20;
        `, [searchTerm]);

        const templates = await pool.query(`
            SELECT id, title, image_url AS thumbnail, 'template' AS type
            FROM templates
            WHERE title ILIKE $1 OR description ILIKE $1 AND public = TRUE
            LIMIT 20;
        `, [searchTerm]);

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
            LIMIT 20;
        `, [searchTerm, req.user?.id]);


        res.status(200).json({events: events.rows, templates: templates.rows, users: users.rows});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const fetchTrending: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
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
            LIMIT 10;
        `, [req.user?.id]);

        console.log("Fetched trending events:", eventResults.rows);

        const templateResults = await pool.query(`
            SELECT id, title, description, image_url AS thumbnail, 'template' AS type
            FROM templates
            WHERE public = TRUE
            ORDER BY created_at DESC
            LIMIT 10;
        `);

        console.log("Fetched trending templates:", templateResults.rows);

        res.status(200).json({events: eventResults.rows, templates: templateResults.rows});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};