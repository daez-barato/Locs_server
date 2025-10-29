import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { fetchTrending, searchAll } from "../controllers/searchController";


const router: Router = express.Router();

router.get("/searchAll/:q/:eventoffset/:templateoffset/:useroffset", authenticateToken, searchAll);
router.get("/trending/:eventoffset/:templateoffset", authenticateToken, fetchTrending);

export default router;