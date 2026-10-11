import { Router, Request, Response } from "express";
import { inboundEmailWebhookSchema } from "core/schemas/ticket";
import { ingestInboundEmail } from "../services/email-ingestion.service";

export const webhooksRouter = Router();

/**
 * Inbound Email Webhook
 * POST /api/webhooks/inbound-email
 *
 * Accepts incoming email events from Resend, SendGrid, Postmark, or test simulators.
 */
webhooksRouter.post("/inbound-email", async (req: Request, res: Response) => {
  try {
    // 1. Verify Webhook Secret / Signature if configured
    const configuredSecret = process.env.WEBHOOK_SIGNING_SECRET;
    if (configuredSecret && configuredSecret.trim().length > 0) {
      const incomingSecretHeader =
        (req.headers["x-webhook-secret"] as string) ||
        (req.headers["x-resend-signature"] as string) ||
        (req.headers["svix-signature"] as string) ||
        req.headers.authorization?.replace(/^Bearer\s+/i, "");

      if (!incomingSecretHeader || incomingSecretHeader !== configuredSecret) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing webhook signature/secret",
        });
      }
    }

    // 2. Validate payload schema
    const parseResult = inboundEmailWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid inbound email webhook payload",
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    // 3. Ingest email and convert to ticket
    const ticket = await ingestInboundEmail(parseResult.data);

    return res.status(201).json({
      success: true,
      message: `Inbound email successfully converted to Ticket #${ticket.ticketNumber}`,
      ticket,
    });
  } catch (error: any) {
    console.error("[Webhooks] Inbound email processing error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message || "Failed to process inbound email",
    });
  }
});

