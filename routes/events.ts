import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getEventInformation } from "../controllers/eventController";


const router: Router = express.Router();

router.get("/:eventId", authenticateToken, getEventInformation);

export default router;