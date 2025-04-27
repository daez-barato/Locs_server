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

export const getUserCoins: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    try{
        const result = await pool.query("SELECT coins FROM users WHERE id= $1", [userId]);

        if (result.rowCount === 0){
            res.status(404).json({error: "User not found"});
            return;
        }

        res.status(200).json({coins: result.rows[0].coins});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error."});
    }
};

export const createCointransaction: RequestHandler = async (req: AuthenticatedRequest, res:Response) => {
    const amount: number = req.body.amount;
    const userId = req.user?.id;

    if (!amount) {
        res.status(400).json({ error: "Amount should be specified." });
        return;
    }

    try {
        const result = await pool.query(
            "UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING coins",
            [amount, userId]
        );

        if (result.rowCount === 0){
            res.status(404).json({error: "User not found"});
            return;
        }

        // Ensure the user's coin balance doesn't go below zero
        if (result.rows[0].coins < 0) {
            // Rollback the transaction if the balance goes negative
            await pool.query(
                "UPDATE users SET coins = coins - $1 WHERE id = $2",
                [amount, userId]
            );
            res.status(400).json({ error: "Insufficient coins" });
            return;
        }

        res.status(200).json({coins: result.rows[0].coins});

    } catch(err){
        console.error(err);
        res.status(500).json({err: "Internal Server error"});
    }
}