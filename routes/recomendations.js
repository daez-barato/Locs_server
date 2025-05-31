"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const recomendationController_1 = require("../controllers/recomendationController");
const router = express_1.default.Router();
router.get("/userRecommendations", authenticateToken_1.default, recomendationController_1.getUserBetRecommendations);
exports.default = router;
