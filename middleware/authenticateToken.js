"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        res.status(401).json({ error: "Missing token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    jsonwebtoken_1.default.verify(token, process.env.TOKEN_SECRET || "", (err, user) => {
        if (err) {
            res.status(403).json({ error: "Invalid token" });
            console.log("Token invalid: ", token);
            return;
        }
        req.user = user; // Attach the decoded user to the request object
        next();
    });
};
exports.default = authenticateToken;
