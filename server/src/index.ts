import { Sentry } from "./instrument";
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth, getTrustedOrigins } from "./auth";
import { usersRouter } from "./routes/users";
import { webhooksRouter } from "./routes/webhooks";
import { ticketsRouter } from "./routes/tickets";
import { startQueue, stopQueue, getQueueStatus } from "./services/queue.service";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = getTrustedOrigins();

// HTTP Security Response Headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
});

// Dynamic CORS configuration supporting multiple/comma-delimited origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server or tools) or matched origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Better Auth route handler (mounted before express.json to preserve request stream)
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());
app.use(cookieParser());

// Protected User Management routes (Admin only)
app.use("/api/users", usersRouter);

// Inbound Webhooks (email ingestion)
app.use("/api/webhooks", webhooksRouter);

// Ticket Management routes (Staff)
app.use("/api/tickets", ticketsRouter);

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Ticket Helper API Server is running",
    status: "ok",
    docs: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      tickets: "/api/tickets",
      webhooks: "/api/webhooks/inbound-email",
    },
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  });
});

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    runtime: "bun",
    queue: getQueueStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Sentry debug route to test error logging


// Basic error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

const server = app.listen(PORT, async () => {
  console.log(`[Express + Bun Server] running on http://localhost:${PORT}`);
  try {
    await startQueue();
  } catch (err) {
    console.error("[Queue] Initialization error:", err);
  }
});

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);
  await stopQueue();
  server.close(() => {
    console.log("[Server] HTTP listener closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

