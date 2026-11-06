import { Router, Response } from "express";
import { prisma } from "../db";
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth";
import { auth } from "../auth";
import crypto from "crypto";
import { createUserSchema } from "core/schemas/user";

export const usersRouter = Router();

// Apply authentication and admin-only role guard to all user management routes
usersRouter.use(requireAuth);
usersRouter.use(requireRole(["admin"]));

/**
 * Check if the authenticated user is a demo account.
 * Demo accounts have read-only access to /users to inspect the team and metrics,
 * but cannot create, modify, or delete accounts.
 */
function isRestrictedDemoUser(reqUser?: { email?: string | null }): boolean {
  if (!reqUser?.email) return true;
  const email = reqUser.email.toLowerCase().trim();
  return (
    email.startsWith("demo") ||
    email.includes("demo-admin") ||
    email.includes("demo-agent")
  );
}

/**
 * GET /api/users
 * Returns a list of users with optional filtering by role and search query.
 * Accessible strictly to Admins.
 */
usersRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search } = req.query;

    const where: any = {
      deletedAt: null,
    };

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
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "admin", deletedAt: null } }),
      prisma.user.count({ where: { role: "agent", deletedAt: null } }),
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

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
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
    if (isRestrictedDemoUser(req.user)) {
      return res.status(403).json({
        error: "Forbidden in Demo Mode",
        message: "Creating new users is restricted to the workspace owner. Demo accounts have read-only access to user management.",
      });
    }

    const parsedBody = createUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.issues[0].message });
    }

    const { name, email, password } = parsedBody.data;
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

import { editUserSchema } from "core/schemas/user";

/**
 * PATCH /api/users/:id
 * Updates an existing user's details.
 * Accessible strictly to Admins.
 */
usersRouter.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isRestrictedDemoUser(req.user)) {
      return res.status(403).json({
        error: "Forbidden in Demo Mode",
        message: "Modifying user accounts is restricted to the workspace owner. Demo accounts have read-only access to user management.",
      });
    }

    const { id } = req.params;
    
    // 1. Verify user exists
    const existingUser = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { accounts: true },
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const parsedBody = editUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.issues[0].message });
    }

    const { name, email, password } = parsedBody.data;
    const trimmedName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    // 2. Duplicate email check if email is changed
    if (cleanEmail !== existingUser.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: cleanEmail, deletedAt: null },
      });

      if (emailTaken) {
        return res.status(409).json({ error: "A user with this email address already exists" });
      }
    }

    // 3. Update user data
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: trimmedName,
        email: cleanEmail,
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

    // 4. Update password if provided
    if (password && password.length >= 8) {
      const ctx = await (auth as any).$context;
      const hashedPassword = await ctx.password.hash(password);
      
      const credentialAccount = existingUser.accounts.find(
        (acc) => acc.providerId === "credential"
      );

      if (credentialAccount) {
        await prisma.account.update({
          where: { id: credentialAccount.id },
          data: { password: hashedPassword },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            accountId: existingUser.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
      }
    }

    return res.status(200).json({
      user: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(`[Users API] Failed to update user ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user",
    });
  }
});

/**
 * DELETE /api/users/:id
 * Soft-deletes a user. Admin users cannot be deleted.
 * Accessible strictly to Admins.
 */
usersRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isRestrictedDemoUser(req.user)) {
      return res.status(403).json({
        error: "Forbidden in Demo Mode",
        message: "Deleting users is restricted to the workspace owner. Demo accounts have read-only access to user management.",
      });
    }

    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Rule: Admin cannot be deleted
    if (user.role === "admin") {
      return res.status(400).json({
        error: "Admin users cannot be deleted",
        message: "Administrator accounts cannot be deleted.",
      });
    }

    // Atomically soft-delete user, unassign all assigned tickets, and revoke sessions
    await prisma.$transaction(async (tx) => {
      // 1. Soft-delete user
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // 2. Unassign all tickets currently assigned to this user
      await tx.ticket.updateMany({
        where: { assignedToId: id },
        data: {
          assignedToId: null,
          updatedAt: new Date(),
        },
      });

      // 3. Invalidate active sessions
      await tx.session.deleteMany({
        where: { userId: id },
      });
    });

    return res.status(200).json({
      message: "User deleted successfully",
      id,
    });
  } catch (error) {
    console.error(`[Users API] Failed to delete user ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete user",
    });
  }
});
