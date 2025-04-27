import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { Request, RequestHandler, Response } from "express";

const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

export const register: RequestHandler = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        res.status(400).json({ error: "Username, email, and password are required." });
        return; // Ensure the function exits after sending a response
    }

    try {
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT || "10", 10));
        const result = await pool.query(
            `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, email, username`,
            [username, email, hashedPassword]
        );
        
        const userInserted = result.rows[0];
        const token = jwt.sign({ id: userInserted.id }, process.env.TOKEN_SECRET || "");

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: userInserted.id,
                email: userInserted.email,
                username: userInserted.username,
                token: token,
            },
        });
    } catch (err: any) {
        if (err.code === "23505") {
            res.status(409).json({ error: "Email/Username is already registered." });
            return;
        }
        console.error("Query failed:", err.message);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const login: RequestHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }

    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

        if (result.rowCount === 0) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET || "");
        res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                token: token,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};