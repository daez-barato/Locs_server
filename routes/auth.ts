import express, { Router } from "express";
import  { login, register }  from "../controllers/authController";

const router: Router = express.Router();

// Register route
router.post("/register", register);

// Login route
router.post("/login", login);

export default router;