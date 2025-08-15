"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const searchController_1 = require("../controllers/searchController");
const router = express_1.default.Router();
router.get("/searchAll/:q", authenticateToken_1.default, searchController_1.searchAll);
router.get("/trending", authenticateToken_1.default, searchController_1.fetchTrending);
exports.default = router;
