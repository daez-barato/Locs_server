import express, { Router } from "express";
import  {followRequest, unfollow, getUserFollowingList, getUserFollowersList, acceptFollowRequest, rejectFollowRequest, updateRequests }  from "../controllers/followersController";
import authenticateToken from "../middleware/authenticateToken";


const router: Router = express.Router();

router.post("/request/:id", authenticateToken, followRequest);
router.delete("/unfollow/:id", authenticateToken, unfollow);
router.get("/userFollowers/:id/:offset", authenticateToken, getUserFollowersList);
router.get("/userFollowing/:id/:offset", authenticateToken, getUserFollowingList);
router.post("/accept/:id", authenticateToken, acceptFollowRequest);
router.delete("/reject/:id", authenticateToken, rejectFollowRequest);
router.get("/requests/:id", authenticateToken, updateRequests);

export default router;