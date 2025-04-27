import express, { Router } from "express";
import  { getUserCoins, createCointransaction }  from "../controllers/coinController";
import authenticateToken from "../middleware/authenticateToken";


const router: Router = express.Router();

// coin check route
router.get("/getUserCoins", authenticateToken, getUserCoins);
router.post("/createCoinTransaction", authenticateToken, createCointransaction);

export default router;