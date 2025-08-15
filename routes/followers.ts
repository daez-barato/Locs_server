import express, { Router } from "express";
import  { getUserFollowingCount, getUserFollowerCount, followRequest, checkFollow, unfollow, getUserFollowingList, getUserFollowersList }  from "../controllers/followersController";
import authenticateToken from "../middleware/authenticateToken";


const router: Router = express.Router();

// coin check route
router.get("/UserFollowerCount/:username", authenticateToken, getUserFollowerCount);
router.get("/UserFollowingCount/:username", authenticateToken, getUserFollowingCount);
router.post("/request/:username", authenticateToken, followRequest);
router.get("/checkFollowing/:username", authenticateToken, checkFollow);
router.delete("/unfollow/:username", authenticateToken, unfollow);
router.get("/userFollowers/:username", authenticateToken, getUserFollowersList);
router.get("/userFollowing/:username", authenticateToken, getUserFollowingList);

export default router;