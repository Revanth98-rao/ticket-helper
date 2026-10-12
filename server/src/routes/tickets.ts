import { Router, Response } from "express";
import { prisma } from "../db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import {
  simulateEmailSchema,
  updateTicketSchema,
} from "core/schemas/ticket";
import { ingestInboundEmail } from "../services/email-ingestion.service";

export const ticketsRouter = Router();

// All ticket routes require an active authenticated session (Admin or Agent)
ticketsRouter.use(requireAuth);

/**
 * GET /api/tickets
 * Returns a list of active tickets with status metrics and optional filtering.
 */
ticketsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      search,
      page = "1",
      limit = "50",
      sort = "newest",
      sortBy = "createdAt",
      sortOrder,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deletedAt: null,
    };

    if (status && status !== "all") {
      where.status = String(status);
    }

    if (priority && priority !== "all") {
      where.priority = String(priority);
    }

    if (assignedTo && assignedTo !== "all") {
      if (assignedTo === "unassigned") {
        where.assignedToId = null;
      } else if (assignedTo === "me") {
        where.assignedToId = req.user?.id;
      } else {
        where.assignedToId = String(assignedTo);
      }
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const q = search.trim();
      const orConditions: any[] = [
        { subject: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { assignedTo: { name: { contains: q, mode: "insensitive" } } },
        { assignedTo: { email: { contains: q, mode: "insensitive" } } },
      ];

      const cleanNum = q.replace(/^#/, "").trim();
      if (/^\d+$/.test(cleanNum)) {
        const parsed = parseInt(cleanNum, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 2147483647) {
          orConditions.push({ ticketNumber: parsed });
        }
      }

      where.OR = orConditions;
    }

    // Determine sorting: defaults to newest first (createdAt: desc)
    let sortField = "createdAt";
    if (["createdAt", "updatedAt", "ticketNumber", "priority", "status"].includes(String(sortBy))) {
      sortField = String(sortBy);
    }

    // "newest" = desc, "oldest" = asc; or explicit sortOrder
    const direction: "asc" | "desc" =
      sort === "oldest" || String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy = { [sortField]: direction };

    // Parallel query for tickets and counts
    const [tickets, totalFiltered, totalAll, openCount, inProgressCount, resolvedCount, closedCount] =
      await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.ticket.count({ where }),
        prisma.ticket.count({ where: { deletedAt: null } }),
        prisma.ticket.count({ where: { deletedAt: null, status: "open" } }),
        prisma.ticket.count({ where: { deletedAt: null, status: "in_progress" } }),
        prisma.ticket.count({ where: { deletedAt: null, status: "resolved" } }),
        prisma.ticket.count({ where: { deletedAt: null, status: "closed" } }),
      ]);

    return res.json({
      tickets,
      counts: {
        total: totalAll,
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum),
        totalItems: totalFiltered,
      },
      sort: {
        sortBy: sortField,
        sortOrder: direction,
      },
    });
  } catch (error: any) {
    console.error("[Tickets] Failed to fetch tickets:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to fetch tickets",
    });
  }
});

/**
 * GET /api/tickets/assignees
 * Returns a list of active staff members (admins and agents) who can be assigned to tickets.
 * Accessible to all authenticated staff (admin and agent).
 */
ticketsRouter.get("/assignees", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const assignees = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.json({ assignees });
  } catch (error: any) {
    console.error("[Tickets] Failed to fetch assignees:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to fetch assignees",
    });
  }
});

/**
 * GET /api/tickets/:id
 * Returns a single ticket with full message history and assigned agent info.
 */
ticketsRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: `Ticket with ID '${id}' not found`,
      });
    }

    return res.json({ ticket });
  } catch (error: any) {
    console.error(`[Tickets] Failed to fetch ticket ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to fetch ticket",
    });
  }
});

/**
 * PATCH /api/tickets/:id
 * Updates ticket status, priority, or assigned agent.
 */
ticketsRouter.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parseResult = updateTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket update parameters",
        details: parseResult.error.errors,
      });
    }

    const existingTicket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingTicket) {
      return res.status(404).json({
        error: "Not Found",
        message: `Ticket with ID '${id}' not found`,
      });
    }

    const { status, priority, assignedToId } = parseResult.data;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) {
      if (assignedToId === null) {
        updateData.assignedToId = null;
      } else {
        const userExists = await prisma.user.findFirst({
          where: { id: assignedToId, deletedAt: null },
        });
        if (!userExists) {
          return res.status(400).json({
            error: "Bad Request",
            message: "Assigned user not found or inactive",
          });
        }
        updateData.assignedToId = assignedToId;
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error: any) {
    console.error(`[Tickets] Failed to update ticket ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to update ticket",
    });
  }
});

/**
 * POST /api/tickets/simulate-inbound
 * Simulation endpoint allowing authenticated staff to simulate receiving an email
 * at the support address directly from the frontend or automated tests.
 */
ticketsRouter.post(
  "/simulate-inbound",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = simulateEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid simulation payload",
          details: parseResult.error.errors,
        });
      }

      const { fromName, fromEmail, to, subject, body } = parseResult.data;

      const ticket = await ingestInboundEmail({
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to: to || process.env.EMAIL_FROM || "support@yourdomain.com",
        subject,
        text: body,
        date: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        message: `Simulated inbound email converted to Ticket #${ticket.ticketNumber}`,
        ticket,
      });
    } catch (error: any) {
      console.error("[Tickets] Simulation failed:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to simulate inbound email",
      });
    }
  }
);

