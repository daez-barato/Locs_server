import express, { Router } from "express";
import { getUserById } from "../controllers/userController";
import authenticateToken from "../middleware/authenticateToken";

const router: Router = express.Router();

// Get user by ID (protected route)
router.get("/user", authenticateToken, getUserById);

export default router;