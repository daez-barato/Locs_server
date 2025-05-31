import { RequestHandler, Request, Response } from "express";
import { Pool } from "pg";

const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const getEventInformation: RequestHandler = async (req: Request, res: Response) => {
    const { eventId }  = req.params;
    
    try {

    } catch(err){
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return
    }
}