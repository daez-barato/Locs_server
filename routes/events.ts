import express, { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getEventInformation, postEvent, getEventBets, placeBet, lockEvent, endEvent, postTemplate, getTemplate, getUserLiveBets, getUserLiveEvents, getUserFollowingPosts, getUserCreatedEvents, getUserParticipatedEvents } from "../controllers/eventController";
import multer from "multer";

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/getEvent/:eventId", authenticateToken, getEventInformation);
router.post("/postEvent", upload.single("image"), authenticateToken, postEvent);
router.get("/getEventBets/:eventId", authenticateToken, getEventBets);
router.post("/placeBet/:eventId", authenticateToken, placeBet);
router.patch("/lockEvent/:eventId", authenticateToken, lockEvent);
router.post("/endEvent/:eventId", authenticateToken, endEvent);
router.patch("/postTemplate/:template", authenticateToken, postTemplate);
router.get("/getTemplate/:templateId", authenticateToken, getTemplate);
router.get("/getUserLiveBets", authenticateToken, getUserLiveBets);
router.get("/getUserLiveEvents", authenticateToken, getUserLiveEvents);
router.get("/getUserFollowingPosts/:offset", authenticateToken, getUserFollowingPosts);
router.get("/getUserCreatedEvents/:id/:offset", authenticateToken, getUserCreatedEvents);
router.get("/getUserParticipatedEvents/:id/:offset", authenticateToken, getUserParticipatedEvents);

export default router;