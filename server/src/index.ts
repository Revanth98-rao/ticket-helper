import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    runtime: "bun",
    timestamp: new Date().toISOString(),
  });
});

// Basic error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`[Express + Bun Server] running on http://localhost:${PORT}`);
});
