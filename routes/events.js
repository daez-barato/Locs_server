"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const eventController_1 = require("../controllers/eventController");
const router = express_1.default.Router();
router.get("/getEvent/:eventId", authenticateToken_1.default, eventController_1.getEventInformation);
router.post("/postEvent", authenticateToken_1.default, eventController_1.postEvent);
router.get("/getEventBets/:eventId", authenticateToken_1.default, eventController_1.getEventBets);
router.post("/placeBet/:eventId", authenticateToken_1.default, eventController_1.placeBet);
router.patch("/lockEvent/:eventId", authenticateToken_1.default, eventController_1.lockEvent);
router.post("/endEvent/:eventId", authenticateToken_1.default, eventController_1.endEvent);
exports.default = router;
