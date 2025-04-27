import express, { Router } from "express";
import  { getUserFollowingCount, getUserFollowerCount }  from "../controllers/followersController";
import authenticateToken from "../middleware/authenticateToken";


const router: Router = express.Router();

// coin check route
router.get("/UserFollowerCount", authenticateToken, getUserFollowerCount);
router.get("/UserFollowingCount", authenticateToken, getUserFollowingCount);


export default router;