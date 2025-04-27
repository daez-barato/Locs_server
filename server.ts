import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors());

const PORT: number = parseInt(process.env.SERVER_PORT || "3000", 10);

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import coinRoutes from "./routes/coins";
import followersRoutes from "./routes/followers";

// Use routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/coins", coinRoutes);
app.use("/followers", followersRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});