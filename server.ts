import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";

// Load environment variables
dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors({
  origin: '*', // or your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const PORT: number = parseInt(process.env.SERVER_PORT || "3000", 10);

export const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
});

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