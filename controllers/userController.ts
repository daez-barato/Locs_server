import { Response, RequestHandler } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest } from "../middleware/authenticateToken";

const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const getUserById: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    try {
        const result = await pool.query("SELECT username, email, coins FROM users WHERE id = $1", [userId]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const getUserByUsername: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userName = req.params.username;

    try {

        const user = await pool.query(`
            SELECT id FROM users WHERE username = $1;
        `, [userName])

        if (user.rowCount === 0){
            throw Error('User not found');
        }
        
        const created = await pool.query(
            `SELECT e.id, t.title, t.description 
            FROM events e 
            JOIN templates t ON e.template = t.id
            WHERE $1 = e.creator_id;`, 
            [user.rows[0].id]
        );

        const participated = await pool.query(
            `SELECT e.id, t.title, t.description 
            FROM bets b  
            JOIN events e ON b.event_id = e.id
            JOIN templates t ON e.template = t.id
            WHERE $1 = b.user_id
            GROUP BY e.id, t.title, t.description`,
            [user.rows[0].id]
        );

        res.status(200).json({
            created: created.rows,
            participated: participated.rows,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};