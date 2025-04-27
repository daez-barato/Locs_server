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


export const getUserFollowerCount: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    try {
        const result = await pool.query(`
            SELECT COUNT(*) AS follower_count
            FROM users u
            JOIN followers f ON f.follower_id = u.id
            WHERE f.following_id = $1;`, [userId]
        )

        res.status(200).json({followers: result.rows[0].follower_count});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
}



export const getUserFollowingCount: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;


    try{
        const result = await pool.query(`
            SELECT COUNT(*) AS following_count
            FROM users u
            JOIN followers f ON f.following_id = u.id
            WHERE f.follower_id = $1;`, [userId]
        )

        res.status(200).json({following: result.rows[0].following_count});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
}