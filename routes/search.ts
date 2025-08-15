import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { fetchTrending, searchAll } from "../controllers/searchController";


const router: Router = express.Router();

router.get("/searchAll/:q", authenticateToken, searchAll);
router.get("/trending", authenticateToken, fetchTrending);

export default router;