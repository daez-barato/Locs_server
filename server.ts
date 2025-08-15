import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors({
  origin: '*', // or your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));



const PORT: number = parseInt(process.env.SERVER_PORT || "3000", 10);

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import coinRoutes from "./routes/coins";
import followersRoutes from "./routes/followers";
import eventRoutes from "./routes/events";
import searchRoutes from "./routes/search";

// Use routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/coins", coinRoutes);
app.use("/followers", followersRoutes); 
app.use("/event", eventRoutes);
app.use("/search", searchRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});