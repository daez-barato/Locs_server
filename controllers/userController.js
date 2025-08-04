"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByUsername = exports.getUserById = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getUserById = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = await pool.query("SELECT username, email, coins FROM users WHERE id = $1", [userId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.getUserById = getUserById;
const getUserByUsername = async (req, res) => {
    const userName = req.params.username;
    try {
        const created = await pool.query(`SELECT e.id, t.title, t.description 
            FROM users u
            JOIN events e ON u.id = e.creator_id
            JOIN templates t ON e.template = t.id
            WHERE u.username = $1`, [userName]);
        const participated = await pool.query(`SELECT e.id, t.title, t.description 
            FROM users u
            JOIN bets b ON u.id = b.user_id
            JOIN events e ON b.event_id = e.id
            JOIN templates t ON e.template = t.id
            WHERE u.username = $1
            GROUP BY e.id, t.title, t.description`, [userName]);
        res.status(200).json({
            created: created.rows,
            participated: participated.rows,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserByUsername = getUserByUsername;
