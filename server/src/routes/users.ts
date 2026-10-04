import { Router, Response } from "express";
import { prisma } from "../db";
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth";
import { auth } from "../auth";
import crypto from "crypto";

export const usersRouter = Router();

// Apply authentication and admin-only role guard to all user management routes
usersRouter.use(requireAuth);
usersRouter.use(requireRole(["admin"]));

/**
 * GET /api/users
 * Returns a list of users with optional filtering by role and search query.
 * Accessible strictly to Admins.
 */
usersRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search } = req.query;

    const where: any = {};

    // Filter by role if specified
    if (role && typeof role === "string" && (role === "admin" || role === "agent")) {
      where.role = role;
    }

    // Filter by search query (matching name or email case-insensitively)
    if (search && typeof search === "string" && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [users, totalCount, adminCount, agentCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { role: "agent" } }),
    ]);

    return res.json({
      users,
      counts: {
        total: totalCount,
        admin: adminCount,
        agent: agentCount,
      },
    });
  } catch (error) {
    console.error("[Users API] Failed to fetch users:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve user list",
    });
  }
});

/**
 * GET /api/users/:id
 * Returns a single user by ID.
 * Accessible strictly to Admins.
 */
usersRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    console.error(`[Users API] Failed to fetch user ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve user details",
    });
  }
});

/**
 * POST /api/users
 * Creates a new user (default role 'agent').
 * Accessible strictly to Admins.
 */
usersRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return res.status(400).json({ error: "Name must be at least 3 characters long" });
    }
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const trimmedName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    // 2. Duplicate email check
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: "A user with this email address already exists" });
    }

    // 3. Password hashing
    const ctx = await (auth as any).$context;
    const hashedPassword = await ctx.password.hash(password);

    // 4. Create user in database
    const userId = crypto.randomUUID();
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        name: trimmedName,
        email: cleanEmail,
        role: "agent",
        emailVerified: true, // Assuming admins create verified users
        accounts: {
          create: {
            accountId: userId,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      user: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("[Users API] Failed to create user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create user",
    });
  }
});
