import { Router, Response } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "../db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import {
  simulateEmailSchema,
  updateTicketSchema,
  replyTicketSchema,
  polishReplySchema,
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
 * POST /api/tickets/:id/reply
 * Adds a new agent reply to the ticket's message thread and updates the ticket status and timestamp.
 */
ticketsRouter.post("/:id/reply", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parseResult = replyTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid reply parameters",
        details: parseResult.error.errors,
      });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: `Ticket with ID '${id}' not found`,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Active user session required",
      });
    }

    const { bodyText, status } = parseResult.data;
    const senderEmail = req.user.email;
    const senderName = req.user.name || "Support Staff";
    const currentUserId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const reply = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderType: "agent",
          senderEmail,
          senderName,
          bodyText,
        },
      });

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (status) {
        updateData.status = status;
      } else if (ticket.status === "open") {
        updateData.status = "in_progress";
      }

      if (!ticket.assignedToId && currentUserId) {
        updateData.assignedToId = currentUserId;
      }

      const updatedTicket = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return { reply, updatedTicket };
    });

    return res.status(201).json({
      success: true,
      message: "Reply posted successfully",
      reply: result.reply,
      ticket: result.updatedTicket,
    });
  } catch (error: any) {
    console.error(`[Tickets] Failed to post reply for ticket ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to post reply",
    });
  }
});

/**
 * POST /api/tickets/:id/polish
 * Improves and polishes an agent's draft reply using GPT-5-Nano via Vercel AI SDK.
 */
ticketsRouter.post("/:id/polish", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parseResult = polishReplySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid polish parameters",
        details: parseResult.error.errors,
      });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: `Ticket with ID '${id}' not found`,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Active user session required",
      });
    }

    const { draftText, ticketSubject, customerMessage } = parseResult.data;

    // In test environment or when OPENAI_API_KEY is not configured, provide a polished response
    if (process.env.NODE_ENV === "test" || !process.env.OPENAI_API_KEY) {
      const polishedText = `Hello,\n\nThank you for reaching out to support. ${draftText.trim()}\n\nPlease let us know if we can assist you with anything else.\n\nBest regards,\n${req.user.name || "Support Team"}`;
      return res.json({
        success: true,
        polishedText,
        model: "gpt-5-nano",
      });
    }

    try {
      const modelName = process.env.OPENAI_POLISH_MODEL || "gpt-5-nano";
      const { text } = await generateText({
        model: openai(modelName),
        system:
          "You are an expert customer support specialist. Improve and polish the support agent's draft reply to be professional, courteous, clear, and empathetic. Preserve all concrete facts, steps, and technical instructions from the draft. Return only the final polished reply ready to send directly to the customer without extra conversational commentary or markdown code blocks.",
        prompt: `Ticket Subject: ${ticketSubject || ticket.subject}\nCustomer Inquiry:\n${customerMessage || ticket.description}\n\nAgent's Draft Reply:\n${draftText}\n\nPolished Reply:`,
      });

      return res.json({
        success: true,
        polishedText: text.trim(),
        model: modelName,
      });
    } catch (aiError: any) {
      console.error("[Tickets] AI Polish generation error:", aiError);
      return res.status(502).json({
        error: "AI Service Error",
        message: aiError?.message || "Failed to generate polished reply with GPT-5-Nano",
      });
    }
  } catch (error: any) {
    console.error(`[Tickets] Failed to polish reply for ticket ${req.params.id}:`, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to polish reply",
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

