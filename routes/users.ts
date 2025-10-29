import express, { Router } from "express";
import { changePrivacy, deleteTemplate, getUserById, getUserSavedTemplates, saveTemplate } from "../controllers/userController";
import authenticateToken from "../middleware/authenticateToken";

const router: Router = express.Router();

router.get("/profile/:id", authenticateToken, getUserById);
router.post("/save/template/:templateId", authenticateToken, saveTemplate);
router.delete("/delete/savedTemplate/:templateId", authenticateToken, deleteTemplate);
router.get("/savedTemplates", authenticateToken, getUserSavedTemplates);
router.patch("/settings/changePrivacy", authenticateToken, changePrivacy);

export default router;