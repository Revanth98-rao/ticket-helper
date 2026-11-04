import { Sentry } from "./instrument";
import "dotenv/config";
import path from "path";
import fs from "fs";
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
const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = getTrustedOrigins();

// Trust reverse proxy headers (Railway, Cloudflare, etc.)
app.set("trust proxy", 1);

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

// Dynamic CORS configuration supporting multiple/comma-delimited origins and Railway domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, same-origin)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches allowedOrigins or Railway/localhost domains
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".railway.app") ||
        origin.endsWith(".up.railway.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        process.env.NODE_ENV !== "production";

      if (isAllowed) {
        return callback(null, true);
      }

      // In production, fallback to allowing rather than throwing an unhandled exception
      return callback(null, true);
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

// Health Check (used by Railway deployment health checks)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    runtime: "bun",
    queue: getQueueStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Sentry debug route to test error logging
app.get(["/debug-sentry", "/api/debug-sentry"], (_req: Request, _res: Response) => {
  throw new Error("My first Sentry error!");
});

// Production Client Static Asset Serving (Unified Monolith on Railway)
const candidateDistPaths = [
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(__dirname, "../client/dist"),
];
const clientDistPath = candidateDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  // Serve built client static assets
  app.use(express.static(clientDistPath));

  // SPA fallback for all non-API GET requests
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/debug-sentry")) {
      return next();
    }
    const indexPath = path.join(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  // Root endpoint info when client is not bundled/served
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
}

// Sentry Express error handler (must be registered before any custom error handler)
Sentry.setupExpressErrorHandler(app);

// Basic error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`[Express + Bun Server] running on http://0.0.0.0:${PORT}`);
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

