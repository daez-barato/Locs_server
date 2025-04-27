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