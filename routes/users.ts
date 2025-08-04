import express, { Router } from "express";
import { getUserById, getUserByUsername } from "../controllers/userController";
import authenticateToken from "../middleware/authenticateToken";

const router: Router = express.Router();

// Get user by ID (protected route)
router.get("/user", authenticateToken, getUserById);
router.get("/user/:username", authenticateToken, getUserByUsername); 

export default router;