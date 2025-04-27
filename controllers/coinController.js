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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCointransaction = exports.getUserCoins = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});
const getUserCoins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = yield pool.query("SELECT coins FROM users WHERE id= $1", [userId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({ coins: result.rows[0].coins });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: "Internal Server error." });
    }
});
exports.getUserCoins = getUserCoins;
const createCointransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const amount = req.body.amount;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!amount) {
        res.status(400).json({ error: "Amount should be specified." });
        return;
    }
    try {
        const result = yield pool.query("UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING coins", [amount, userId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Ensure the user's coin balance doesn't go below zero
        if (result.rows[0].coins < 0) {
            // Rollback the transaction if the balance goes negative
            yield pool.query("UPDATE users SET coins = coins - $1 WHERE id = $2", [amount, userId]);
            res.status(400).json({ error: "Insufficient coins" });
            return;
        }
        res.status(200).json({ coins: result.rows[0].coins });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: "Internal Server error" });
    }
});
exports.createCointransaction = createCointransaction;
