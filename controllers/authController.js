"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const server_1 = require("../server");
const validator_1 = __importDefault(require("validator"));
dotenv_1.default.config();
const register = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400).json({ error: "Username, email, and password are required." });
        return; // Ensure the function exits after sending a response
    }
    try {
        if (!validator_1.default.isEmail(email)) {
            res.status(400).json({ error: "Invalid email format." });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, parseInt(process.env.SALT || "10", 10));
        const result = await server_1.pool.query(`INSERT INTO users (username, email, password, image_url) VALUES ($1, $2, $3, $4) RETURNING id, email, username, image_url`, [username, email, hashedPassword, process.env.PLACEHOLDER_USER_IMAGE]);
        const userInserted = result.rows[0];
        const token = jsonwebtoken_1.default.sign({ id: userInserted.id }, process.env.TOKEN_SECRET || "");
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: userInserted.id,
                email: userInserted.email,
                username: userInserted.username,
                token: token,
            },
        });
    }
    catch (err) {
        if (err.code === "23505") {
            res.status(409).json({ error: "Email/Username is already registered." });
            return;
        }
        console.error("Query failed:", err.message);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }
    try {
        const result = await server_1.pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rowCount === 0) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const user = result.rows[0];
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ error: "Wrong Password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.TOKEN_SECRET || "");
        res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                token: token,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.login = login;
