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
    const { username } = req.params;
    
    try {

        const result = await pool.query(`
            SELECT COUNT(*) AS follower_count
            FROM users u
            JOIN followers f ON f.followed_id = u.id
            WHERE u.username = $1;`, [username]
        )

        res.status(200).json({followers: result.rows[0].follower_count});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const getUserFollowingCount: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;


    try{
        const result = await pool.query(`
            SELECT COUNT(*) AS following_count
            FROM users u
            JOIN followers f ON f.follower_id = u.id
            WHERE u.username = $1;`, [username]
        )

        res.status(200).json({following: result.rows[0].following_count});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const followRequest: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const followerId = req.user?.id; //requester id
    const { username } = req.params; // requested username


    if (!followerId || !username) {
        res.status(400).json({ error: "Missing data" });
        return
    }

    try{
        const followed = await pool.query(`
            SELECT id from users WHERE username = $1;`
            , [username]
        );

        if (followed.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return
        };

        const followedId = followed.rows[0].id;

        // 2. Insert the follow relationship
        await pool.query(
            `INSERT INTO followers (follower_id, followed_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`, // avoids duplicate follows
            [followerId, followedId]
        );


        res.status(200).json({success : true});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const checkFollow: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    const userId = req.user?.id


    try{
        const result = await pool.query(`
            SELECT *
            FROM followers f
            JOIN users u ON f.followed_id = u.id 
            WHERE f.follower_id = $1 AND u.username = $2;`, [userId, username]
        );

        if (result.rowCount === 0){
            res.status(200).json({isFollowing: false});
        } else {
            res.status(200).json({isFollowing: true});
        }

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const unfollow: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const followerId = req.user?.id;
    const { username } = req.params;

    if (!followerId || !username) {
        res.status(400).json({ error: "Missing data" });
        return;
    }

    try {
        const followed = await pool.query(
            `SELECT id FROM users WHERE username = $1;`,
            [username]
        );

        if (followed.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const followedId = followed.rows[0].id;

        // Remover a relação de seguimento
        await pool.query(
            `DELETE FROM followers
             WHERE follower_id = $1 AND followed_id = $2;`,
            [followerId, followedId]
        );

        res.status(200).json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserFollowersList: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    
    try {

        const followed = await pool.query(
            `SELECT id FROM users WHERE username = $1;`,
            [username]
        );

        if (followed.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const followedId = followed.rows[0].id;

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username, 
                u.image_url AS avatar,
                CASE 
                    WHEN fb.follower_id IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS following
            FROM followers f 
            JOIN users u ON f.follower_id = u.id
            LEFT JOIN followers fb
                ON fb.follower_id = $1 AND fb.followed_id = u.id
            WHERE f.followed_id = $1;`, [followedId]
        );

        res.status(200).json({followersList: result.rows});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};

export const getUserFollowingList: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    const userId = req.user?.id;
    
    try {

        const follower = await pool.query(
            `SELECT id FROM users WHERE username = $1;`,
            [username]
        );

        if (follower.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const followerId = follower.rows[0].id;

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username, 
                u.image_url AS avatar,
                TRUE AS following
            FROM followers f 
            JOIN users u ON f.followed_id = u.id
            WHERE f.follower_id = $1;`, [followerId]
        );

        res.status(200).json({followingList: result.rows});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
};
