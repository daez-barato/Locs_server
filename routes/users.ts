import express, { Router } from "express";
import { changePrivacy, deleteTemplate, getUserById, getUserSavedTemplates, saveTemplate, uploadProfilePicture } from "../controllers/userController";
import authenticateToken from "../middleware/authenticateToken";
import multer from "multer";

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/profile/:id", authenticateToken, getUserById);
router.post("/save/template/:templateId", authenticateToken, saveTemplate);
router.delete("/delete/savedTemplate/:templateId", authenticateToken, deleteTemplate);
router.get("/savedTemplates", authenticateToken, getUserSavedTemplates);
router.patch("/settings/changePrivacy", authenticateToken, changePrivacy);
router.post("/settings/uploadProfilePicture", upload.single("image"), authenticateToken, uploadProfilePicture);

export default router;