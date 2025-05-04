import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getStreamToken } from "../controllers/streamController";



const router: Router = express.Router();

router.get("/getStreamToken", authenticateToken, getStreamToken);



export default router;