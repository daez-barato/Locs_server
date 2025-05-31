import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getUserBetRecommendations } from "../controllers/recomendationController";

const router: Router = express.Router();

router.get("/userRecommendations", authenticateToken, getUserBetRecommendations)

export default router;