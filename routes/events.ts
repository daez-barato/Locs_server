import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getEventInformation, postEvent, getEventBets, placeBet, lockEvent, endEvent } from "../controllers/eventController";


const router: Router = express.Router();

router.get("/getEvent/:eventId", authenticateToken, getEventInformation);
router.post("/postEvent", authenticateToken, postEvent);
router.get("/getEventBets/:eventId", authenticateToken, getEventBets);
router.post("/placeBet/:eventId", authenticateToken, placeBet);
router.patch("/lockEvent/:eventId", authenticateToken, lockEvent);
router.post("/endEvent/:eventId", authenticateToken, endEvent);

export default router;