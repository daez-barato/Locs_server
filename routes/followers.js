"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const followersController_1 = require("../controllers/followersController");
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const router = express_1.default.Router();
router.post("/request/:id", authenticateToken_1.default, followersController_1.followRequest);
router.delete("/unfollow/:id", authenticateToken_1.default, followersController_1.unfollow);
router.get("/userFollowers/:id/:offset", authenticateToken_1.default, followersController_1.getUserFollowersList);
router.get("/userFollowing/:id/:offset", authenticateToken_1.default, followersController_1.getUserFollowingList);
router.post("/accept/:id", authenticateToken_1.default, followersController_1.acceptFollowRequest);
router.delete("/reject/:id", authenticateToken_1.default, followersController_1.rejectFollowRequest);
router.get("/requests/:id", authenticateToken_1.default, followersController_1.updateRequests);
exports.default = router;
