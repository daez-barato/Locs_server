"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventInformation = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getEventInformation = async (req, res) => {
    const { eventId } = req.params;
    try {
    }
    catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};
exports.getEventInformation = getEventInformation;
