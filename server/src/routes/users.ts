import { Router, Response } from "express";
import { prisma } from "../db";
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth";

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
