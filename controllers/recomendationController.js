"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBetRecommendations = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getUserBetRecommendations = async (req, res) => {
    // const userInfo = req.user?.id not used rn because recommendations are basic
    try {
        console.log('Getting user recokmmendations');
        const result = await pool.query(`
            SELECT id, title, description FROM events
            WHERE expire_date > now()
            ORDER BY expire_date ASC
            LIMIT 5
        `);
        res.status(200).json({ recommendations: result.rows });
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: "Internal Server error" });
        return;
    }
};
exports.getUserBetRecommendations = getUserBetRecommendations;
