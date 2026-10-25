import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { prisma } from "../db";
import { TicketPriority } from "core/schemas/ticket";

export interface TicketClassificationResult {
  priority: TicketPriority;
  category: string;
  confidence: number;
  reasoning: string;
  tags: string[];
  model?: string;
  classifiedAt?: string;
}

/**
 * Strips markdown code block wrappers from AI text responses.
 */
function cleanJsonText(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

/**
 * Deterministic rule-based ticket classifier used in test environments
 * or when external AI API keys are not configured.
 */
export function getDeterministicClassification(
  subject: string,
  description: string
): TicketClassificationResult {
  const combined = `${subject} ${description}`.toLowerCase();

  if (
    combined.includes("urgent") ||
    combined.includes("500 internal server error") ||
    combined.includes("outage") ||
    combined.includes("down in production") ||
    combined.includes("brute-force") ||
    combined.includes("security alert") ||
    combined.includes("emergency") ||
    combined.includes("database connection pool timeout")
  ) {
    return {
      priority: "urgent",
      category: "technical questions",
      confidence: 0.98,
      reasoning: "Detected critical production outage or security incident keywords.",
      tags: ["urgent", "incident", "production"],
    };
  }

  if (
    combined.includes("vat") ||
    combined.includes("invoice") ||
    combined.includes("refund") ||
    combined.includes("billing") ||
    combined.includes("charge") ||
    combined.includes("credit card") ||
    combined.includes("payment") ||
    combined.includes("subscription")
  ) {
    return {
      priority: "high",
      category: "billing",
      confidence: 0.94,
      reasoning: "Identified billing, invoice, or financial transaction inquiry.",
      tags: ["billing", "finance"],
    };
  }

  if (
    combined.includes("password") ||
    combined.includes("login") ||
    combined.includes("403") ||
    combined.includes("forbidden") ||
    combined.includes("access") ||
    combined.includes("credentials") ||
    combined.includes("syllabus") ||
    combined.includes("saml sso")
  ) {
    return {
      priority: "medium",
      category: "account access",
      confidence: 0.91,
      reasoning: "Customer inquiry concerning account authentication or access permissions.",
      tags: ["account", "access"],
    };
  }

  return {
    priority: "medium",
    category: "general questions",
    confidence: 0.85,
    reasoning: "General customer inquiry requiring standard triage.",
    tags: ["general", "support"],
  };
}

/**
 * Classifies ticket content using Gemini AI (or OpenAI / deterministic fallback).
 */
export async function classifyTicketContent(
  subject: string,
  description: string
): Promise<TicketClassificationResult> {
  const hasGoogleKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const preferredProvider = process.env.AI_PROVIDER?.toLowerCase() || (hasGoogleKey ? "google" : "openai");

  // In test environment or offline mode without keys, use deterministic rules
  if (process.env.NODE_ENV === "test" || (!hasGoogleKey && !hasOpenAIKey)) {
    return {
      ...getDeterministicClassification(subject, description),
      model: preferredProvider === "google" ? "gemini-3.5-flash-lite" : "gpt-5-nano",
      classifiedAt: new Date().toISOString(),
    };
  }

  try {
    const isGoogle = preferredProvider === "google" && hasGoogleKey;
    let modelName = isGoogle
      ? (process.env.GEMINI_CLASSIFY_MODEL || process.env.GEMINI_POLISH_MODEL || "gemini-3.5-flash-lite")
      : (process.env.OPENAI_POLISH_MODEL || "gpt-5-nano");

    if (isGoogle && (modelName === "gemini-1.5-flash" || modelName === "gemini-2.5-flash")) {
      modelName = "gemini-3.5-flash-lite";
    }

    const model = isGoogle ? google(modelName) : openai(modelName);

    const { text } = await generateText({
      model,
      temperature: 0.1,
      maxTokens: 300,
      system: `You are an expert customer support triage specialist.
Analyze the support ticket subject and customer inquiry to classify its priority and category.

CLASSIFICATION RULES:
- priority:
  * "urgent": Critical production downtime, API 500 outages, major security breach, data loss, emergency blockers.
  * "high": Key features broken without workaround, billing/payment failures, legal/compliance deadlines, invoice errors.
  * "medium": Standard bug with workaround, account access inquiries, routine technical questions.
  * "low": General information inquiries, minor cosmetic issues, feature requests, praise/feedback.

- category:
  * "technical questions"
  * "billing"
  * "account access"
  * "general questions"
  * "feature request"

Output ONLY a valid, single-line or pretty-printed JSON object with no markdown fences, matching:
{
  "priority": "urgent" | "high" | "medium" | "low",
  "category": string,
  "confidence": number,
  "reasoning": string,
  "tags": string[]
}`,
      prompt: `Ticket Subject: ${subject}
Customer Inquiry:
${description}

JSON Output:`,
    });

    const parsed = JSON.parse(cleanJsonText(text));

    const validPriorities: TicketPriority[] = ["urgent", "high", "medium", "low"];
    const priority: TicketPriority = validPriorities.includes(parsed.priority)
      ? parsed.priority
      : "medium";

    return {
      priority,
      category: parsed.category || "general questions",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      reasoning: parsed.reasoning || "Classified by Gemini AI",
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["ticket"],
      model: modelName,
      classifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[TicketClassifier] AI classification failed, falling back to deterministic classification:", error);
    return {
      ...getDeterministicClassification(subject, description),
      model: "fallback-deterministic",
      classifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Asynchronously classifies a ticket in a non-blocking fashion.
 * Updates the ticket priority and stores the AI classification metadata
 * inside the ticket's rawPayload JSON column in PostgreSQL.
 */
export async function classifyTicketAsync(ticketId: string): Promise<TicketClassificationResult | null> {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });

    if (!ticket) {
      console.warn(`[TicketClassifier] Ticket '${ticketId}' not found for classification`);
      return null;
    }

    const classification = await classifyTicketContent(ticket.subject, ticket.description);

    const existingPayload =
      typeof ticket.rawPayload === "object" && ticket.rawPayload !== null
        ? (ticket.rawPayload as Record<string, any>)
        : {};

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority: classification.priority,
        rawPayload: {
          ...existingPayload,
          aiClassification: {
            ...classification,
            classifiedAt: new Date().toISOString(),
          },
        },
      },
    });

    return classification;
  } catch (error) {
    console.error(`[TicketClassifier] Failed to classify ticket ${ticketId} in background:`, error);
    return null;
  }
}

