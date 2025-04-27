"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const coinController_1 = require("../controllers/coinController");
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const router = express_1.default.Router();
// coin check route
router.get("/getUserCoins", authenticateToken_1.default, coinController_1.getUserCoins);
router.post("/createCoinTransaction", authenticateToken_1.default, coinController_1.createCointransaction);
exports.default = router;
