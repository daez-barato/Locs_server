import { RequestHandler, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authenticateToken";
import { Pool } from "pg";


const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const getUserBetRecommendations: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    // const userInfo = req.user?.id not used rn because recommendations are basic

    try {
        console.log('Getting user recokmmendations');
        const result = await pool.query(`
            SELECT id, title, description FROM events
            WHERE expire_date > now()
            ORDER BY expire_date ASC
            LIMIT 5
        `);

        res.status(200).json({recommendations: result.rows });
        return
    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
        return
    }
}