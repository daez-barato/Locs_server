"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFollowingCount = exports.getUserFollowerCount = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getUserFollowerCount = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = await pool.query(`
            SELECT COUNT(*) AS follower_count
            FROM users u
            JOIN followers f ON f.follower_id = u.id
            WHERE f.followed_id = $1;`, [userId]);
        res.status(200).json({ followers: result.rows[0].follower_count });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: "Internal Server error" });
    }
};
exports.getUserFollowerCount = getUserFollowerCount;
const getUserFollowingCount = async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = await pool.query(`
            SELECT COUNT(*) AS following_count
            FROM users u
            JOIN followers f ON f.followed_id = u.id
            WHERE f.follower_id = $1;`, [userId]);
        res.status(200).json({ following: result.rows[0].following_count });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: "Internal Server error" });
    }
};
exports.getUserFollowingCount = getUserFollowingCount;
