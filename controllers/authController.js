"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400).json({ error: "Username, email, and password are required." });
        return; // Ensure the function exits after sending a response
    }
    try {
        const hashedPassword = yield bcryptjs_1.default.hash(password, parseInt(process.env.SALT || "10", 10));
        const result = yield pool.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, email, username`, [username, email, hashedPassword]);
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
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }
    try {
        const result = yield pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rowCount === 0) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const user = result.rows[0];
        const valid = yield bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ error: "Invalid credentials" });
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
});
exports.login = login;
