"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const followersController_1 = require("../controllers/followersController");
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const router = express_1.default.Router();
// coin check route
router.get("/UserFollowerCount/:username", authenticateToken_1.default, followersController_1.getUserFollowerCount);
router.get("/UserFollowingCount/:username", authenticateToken_1.default, followersController_1.getUserFollowingCount);
router.post("/request/:username", authenticateToken_1.default, followersController_1.followRequest);
router.get("/checkFollowing/:username", authenticateToken_1.default, followersController_1.checkFollow);
router.delete("/unfollow/:username", authenticateToken_1.default, followersController_1.unfollow);
router.get("/userFollowers/:username", authenticateToken_1.default, followersController_1.getUserFollowersList);
router.get("/userFollowing/:username", authenticateToken_1.default, followersController_1.getUserFollowingList);
exports.default = router;
