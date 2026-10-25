import fs from "fs";
import path from "path";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { prisma } from "../db";
import { classifyTicketAsync } from "./ticket-classification.service";
import {
  formatCustomerGreetingName,
  formatAgentSignature,
} from "./polish-formatter.service";

export interface AutoResolutionEvaluation {
  shouldAutoResolve: boolean;
  matchedSection: string | null;
  confidence: number;
  reasoning: string;
  escalationReason: string | null;
  resolutionReply: string | null;
  model?: string;
}

let cachedKnowledgeBase: string | null = null;

/**
 * Loads the official Code with Mosh knowledge base markdown file.
 */
export function getKnowledgeBaseContent(): string {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const possiblePaths = [
    path.resolve(__dirname, "../../knowledge-base.md"),
    path.resolve(__dirname, "../../../server/knowledge-base.md"),
    path.resolve(process.cwd(), "server/knowledge-base.md"),
    path.resolve(process.cwd(), "knowledge-base.md"),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      cachedKnowledgeBase = fs.readFileSync(filePath, "utf-8");
      return cachedKnowledgeBase;
    }
  }

  console.warn("[AutoResolve] knowledge-base.md not found in expected paths, using empty fallback");
  return "";
}

/**
 * Deterministic rule-based evaluation of support tickets against the Knowledge Base.
 * Used in test environments, offline execution, or as a fast safety filter.
 */
export function getDeterministicAutoResolution(
  subject: string,
  description: string,
  customerName?: string | null
): AutoResolutionEvaluation {
  const combined = `${subject} ${description}`.toLowerCase();
  const greetingName = formatCustomerGreetingName(customerName || "");
  const greeting = `Hello ${greetingName},`;
  const signature = "Best regards,\nRevanth Rao";

  // =========================================================================
  // Section 10: Escalation Rules Check
  // =========================================================================
  if (
    combined.includes("legal action") ||
    combined.includes("lawyer") ||
    combined.includes("attorney") ||
    combined.includes("sue you") ||
    combined.includes("litigation") ||
    combined.includes("court")
  ) {
    return {
      shouldAutoResolve: false,
      matchedSection: "10. Escalation Rules",
      confidence: 0.99,
      reasoning: "Customer mentions legal action or attorney representation.",
      escalationReason: "Legal threat requires human staff and management review.",
      resolutionReply: null,
      model: "deterministic-rules",
    };
  }

  if (
    combined.includes("chargeback") ||
    combined.includes("dispute the charge") ||
    combined.includes("bank dispute") ||
    combined.includes("credit card dispute")
  ) {
    return {
      shouldAutoResolve: false,
      matchedSection: "10. Escalation Rules",
      confidence: 0.98,
      reasoning: "Customer mentions payment chargeback or bank dispute.",
      escalationReason: "Chargeback and payment dispute requires manual billing review.",
      resolutionReply: null,
      model: "deterministic-rules",
    };
  }

  if (
    combined.includes("outside the 30-day") ||
    combined.includes("past 30 days") ||
    combined.includes("after 30 days") ||
    combined.includes("purchased 45 days ago") ||
    combined.includes("purchased 60 days ago") ||
    combined.includes("purchased 2 months ago") ||
    combined.includes("purchased 3 months ago") ||
    combined.includes("more than 30 days")
  ) {
    return {
      shouldAutoResolve: false,
      matchedSection: "10. Escalation Rules",
      confidence: 0.97,
      reasoning: "Refund requested outside the 30-day refund guarantee window.",
      escalationReason: "Refund request outside 30-day policy requires human agent review.",
      resolutionReply: null,
      model: "deterministic-rules",
    };
  }

  if (
    combined.includes("account hacked") ||
    combined.includes("account stolen") ||
    combined.includes("unauthorized login") ||
    combined.includes("unauthorized charge") ||
    combined.includes("security breach")
  ) {
    return {
      shouldAutoResolve: false,
      matchedSection: "10. Escalation Rules",
      confidence: 0.96,
      reasoning: "Security issue or suspected unauthorized account compromise.",
      escalationReason: "Account security concern requires manual verification.",
      resolutionReply: null,
      model: "deterministic-rules",
    };
  }

  // =========================================================================
  // Knowledge Base Section Matchers
  // =========================================================================

  // 1. Account & Login Issues (Password reset)
  if (
    combined.includes("forgot my password") ||
    combined.includes("forgot password") ||
    combined.includes("reset password") ||
    combined.includes("reset my password") ||
    combined.includes("password reset email") ||
    combined.includes("password reset link")
  ) {
    const reply = `${greeting}

Thank you for reaching out to Code with Mosh Support.

Here is how you can reset your account password:
1. Go to the login page on Code with Mosh.
2. Click **Forgot Password**.
3. Enter your registered email address.
4. Follow the instructions sent in the password reset email.

If the email does not appear in your inbox within a few minutes, please check your Spam or Promotions folders. If you still do not receive it within 10 minutes, verify that the email address matches the one used during registration.

Please let us know if you need any further assistance!

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "1. Account & Login Issues",
      confidence: 0.96,
      reasoning: "Direct match for password reset instructions from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 2. Course Access & Purchases
  if (
    (combined.includes("purchased a course") && combined.includes("cannot see")) ||
    combined.includes("cannot see my course") ||
    combined.includes("course is missing from my dashboard") ||
    combined.includes("transfer a purchased course") ||
    combined.includes("transfer course to another account")
  ) {
    if (combined.includes("transfer")) {
      const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

Regarding course transfers: courses are non-transferable and permanently tied to the purchasing account on our platform.

If you purchased the course under an accidental duplicate email address, please reply with your purchase receipt and details so we can guide you further.

${signature}`;

      return {
        shouldAutoResolve: true,
        matchedSection: "2. Course Access & Purchases",
        confidence: 0.95,
        reasoning: "Direct match for course transfer policy from Knowledge Base.",
        escalationReason: null,
        resolutionReply: reply,
        model: "deterministic-rules",
      };
    }

    const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

If you recently purchased a course and cannot see it in your dashboard, please check the following:
1. Verify that you are logged in with the exact email address used during checkout.
2. Allow a few moments for the payment provider to finish processing.
3. Check your email receipt to confirm the transaction completed successfully.

If the course is still not visible after confirming your account email, please reply with your order receipt and we will gladly investigate.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "2. Course Access & Purchases",
      confidence: 0.94,
      reasoning: "Direct match for purchased course visibility from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 3. Lifetime Access
  if (
    combined.includes("lifetime access") ||
    combined.includes("what does lifetime access mean")
  ) {
    const reply = `${greeting}

Thank you for reaching out to Code with Mosh Support.

Here is what **Lifetime Access** means for our courses:
- You pay once with no recurring fees.
- You keep access to the course content permanently.
- You receive all future updates and additions released for that specific course.

Note that Lifetime Access applies specifically to the individual course purchased.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "3. Lifetime Access",
      confidence: 0.97,
      reasoning: "Direct match for Lifetime Access policy from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 4. Refund Policy (Standard inquiry or request within 30 days)
  if (
    combined.includes("refund policy") ||
    combined.includes("what is the refund policy") ||
    combined.includes("request a refund") ||
    combined.includes("money-back guarantee") ||
    combined.includes("30-day money-back")
  ) {
    const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

Here is our official **Refund Policy**:
- We offer a **30-day money-back guarantee** from the date of purchase.
- You are eligible for a full refund if requested within 30 days of purchase.
- A partial refund is available if less than 80% of the course has been completed.
- No refund is available if 80% or more of the course has been completed.
- Refunds are processed back to your original payment method within 5–10 business days.

To request a refund:
1. Ensure your request is within 30 days of purchase.
2. Reply with your order receipt.
3. Include the reason for your request.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "4. Refund Policy",
      confidence: 0.95,
      reasoning: "Direct match for 30-day refund policy and submission steps.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 5. Certificates
  if (
    combined.includes("certificate") ||
    combined.includes("do you provide certificates") ||
    combined.includes("certificate of completion")
  ) {
    const reply = `${greeting}

Thank you for reaching out to Code with Mosh Support.

Yes! A certificate of completion is automatically issued once you complete 100% of the course curriculum. 

Your certificate will be available to download directly inside your student dashboard. Please note that our certificates confirm course completion and are not accredited university degrees.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "5. Certificates",
      confidence: 0.96,
      reasoning: "Direct match for course completion certificate policy from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 6. Downloading Content
  if (
    combined.includes("download videos") ||
    combined.includes("can i download videos") ||
    combined.includes("download video") ||
    combined.includes("offline video") ||
    combined.includes("watch offline")
  ) {
    const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

Regarding video downloads:
- Course video lessons are streamed online in high definition through your browser. Offline video downloads are not supported.
- All course source code, exercise files, and project assets are fully downloadable for offline practice.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "6. Downloading Content",
      confidence: 0.96,
      reasoning: "Direct match for offline video download policy from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 7. Technical Issues (Videos not playing / quality)
  if (
    combined.includes("video is not playing") ||
    combined.includes("videos are not playing") ||
    combined.includes("video won't play") ||
    combined.includes("video quality is low") ||
    combined.includes("video buffering")
  ) {
    const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

If video lessons are not playing or buffering, please try these troubleshooting steps:
1. Clear your browser cache and cookies.
2. Ensure you are using the latest version of Google Chrome or Microsoft Edge.
3. Temporarily disable browser extensions (such as ad blockers) that might block video players.
4. Check your internet connection. Video quality adjusts automatically based on your current network speed.

If you continue experiencing issues, please reply with your browser and operating system details.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "7. Technical Issues",
      confidence: 0.93,
      reasoning: "Direct match for video playback troubleshooting from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 8. Coupon Codes
  if (
    combined.includes("coupon code") ||
    combined.includes("promo code") ||
    combined.includes("discount code")
  ) {
    const reply = `${greeting}

Thank you for reaching out to Code with Mosh Support.

If your coupon code is not working at checkout, please check the following:
- The coupon may have expired.
- The coupon may have already reached its maximum usage limit.
- The coupon might apply only to specific courses or bundles.
- Please note that only one coupon code may be applied per purchase.

If you believe there is an error with an active promotional code, please reply with the coupon code and the course you wish to purchase.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "8. Coupon Codes",
      confidence: 0.94,
      reasoning: "Direct match for coupon code troubleshooting from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // 9. Account Changes (Email address)
  if (
    combined.includes("change my email") ||
    combined.includes("change email address") ||
    combined.includes("update my email")
  ) {
    const reply = `${greeting}

Thank you for contacting Code with Mosh Support.

To change the email address registered on your Code with Mosh account, please reply to this ticket with:
1. Your current registered email address.
2. The new email address you would like to use.
3. A copy of a recent course purchase receipt for verification.

Our support team will verify your details and update your account promptly.

${signature}`;

    return {
      shouldAutoResolve: true,
      matchedSection: "9. Account Changes",
      confidence: 0.94,
      reasoning: "Direct match for account email update procedure from Knowledge Base.",
      escalationReason: null,
      resolutionReply: reply,
      model: "deterministic-rules",
    };
  }

  // Fallback: Not covered in Knowledge Base
  return {
    shouldAutoResolve: false,
    matchedSection: null,
    confidence: 0.5,
    reasoning: "Inquiry topic is not covered in the Knowledge Base.",
    escalationReason: "Unmatched inquiry requiring human agent triage.",
    resolutionReply: null,
    model: "deterministic-rules",
  };
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
 * Evaluates support ticket against Code with Mosh Knowledge Base using AI (or deterministic fallback).
 */
export async function evaluateAutoResolution(
  subject: string,
  description: string,
  customerName?: string | null
): Promise<AutoResolutionEvaluation> {
  const hasGoogleKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const preferredProvider = process.env.AI_PROVIDER?.toLowerCase() || (hasGoogleKey ? "google" : "openai");

  // In test environment or when API keys are absent, use deterministic rules
  if (process.env.NODE_ENV === "test" || (!hasGoogleKey && !hasOpenAIKey)) {
    return getDeterministicAutoResolution(subject, description, customerName);
  }

  try {
    const kbContent = getKnowledgeBaseContent();
    const isGoogle = preferredProvider === "google" && hasGoogleKey;
    const modelName = isGoogle
      ? (process.env.GEMINI_CLASSIFY_MODEL || "gemini-3.5-flash-lite")
      : (process.env.OPENAI_POLISH_MODEL || "gpt-5-nano");

    const model = isGoogle ? google(modelName) : openai(modelName);

    const { text } = await generateText({
      model,
      temperature: 0.1,
      maxTokens: 800,
      system: `You are an automated support resolution assistant for Code with Mosh.
Evaluate incoming support tickets against the official Knowledge Base below:

${kbContent}

DECISION RULES:
1. Section 10 Escalation Rules:
   You MUST set "shouldAutoResolve": false and provide "escalationReason" if:
   - The customer threatens legal action, attorney, or suing.
   - The customer requests a refund outside the 30-day window.
   - The customer disputes a charge or mentions a credit card / bank chargeback.
   - The issue involves account security concerns (compromised/hacked account).
   - Your confidence score is low (< 0.85).

2. Auto-Resolution:
   If the inquiry is explicitly and accurately answered by sections 1-9 of the Knowledge Base and no escalation rule is triggered:
   - Set "shouldAutoResolve": true
   - Generate "resolutionReply": A complete, polite, and helpful resolution text.
     * Greet the customer by name: "Hello ${customerName || "there"},"
     * Provide the exact solution from the Knowledge Base.
     * End with:
Best regards,
Revanth Rao

3. If the inquiry is custom, ambiguous, or not in the Knowledge Base:
   - Set "shouldAutoResolve": false
   - Set "resolutionReply": null

Output ONLY valid JSON matching:
{
  "shouldAutoResolve": boolean,
  "matchedSection": string | null,
  "confidence": number,
  "reasoning": string,
  "escalationReason": string | null,
  "resolutionReply": string | null
}`,
      prompt: `Customer Name: ${customerName || "Not provided"}
Ticket Subject: ${subject}
Customer Inquiry:
${description}

JSON Output:`,
    });

    const parsed = JSON.parse(cleanJsonText(text));

    let resolutionReply: string | null = parsed.resolutionReply || null;
    if (resolutionReply) {
      resolutionReply = resolutionReply
        .replace(/Code with Mosh Support Team\s*\n?/gi, "")
        .trim();
    }

    return {
      shouldAutoResolve: Boolean(parsed.shouldAutoResolve && resolutionReply),
      matchedSection: parsed.matchedSection || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
      reasoning: parsed.reasoning || "Evaluated by AI",
      escalationReason: parsed.escalationReason || null,
      resolutionReply,
      model: modelName,
    };
  } catch (error) {
    console.warn("[AutoResolve] AI evaluation failed, using deterministic fallback:", error);
    return getDeterministicAutoResolution(subject, description, customerName);
  }
}

/**
 * Evaluates ticket for automatic resolution upon arrival.
 *
 * If eligible:
 * - Appends an AI resolution message to the ticket thread.
 * - Sets ticket status to "resolved".
 * - Sets ticket autoResolved flag to true.
 *
 * If not eligible (escalated or not in KB):
 * - Leaves ticket autoResolved flag as false.
 * - Keeps status as "open".
 * - Delegates to classifyTicketAsync for priority & category classification.
 */
export async function autoResolveTicketIfEligible(ticketId: string): Promise<{
  autoResolved: boolean;
  evaluation: AutoResolutionEvaluation;
}> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
  });

  if (!ticket) {
    console.warn(`[AutoResolve] Ticket '${ticketId}' not found for evaluation`);
    return {
      autoResolved: false,
      evaluation: {
        shouldAutoResolve: false,
        matchedSection: null,
        confidence: 0,
        reasoning: "Ticket not found",
        escalationReason: "Not found",
        resolutionReply: null,
      },
    };
  }

  const evaluation = await evaluateAutoResolution(
    ticket.subject,
    ticket.description,
    ticket.customerName
  );

  const existingPayload =
    typeof ticket.rawPayload === "object" && ticket.rawPayload !== null
      ? (ticket.rawPayload as Record<string, any>)
      : {};

  if (evaluation.shouldAutoResolve && evaluation.resolutionReply) {
    // 1. Post AI response message into ticket thread
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderType: "ai",
        senderName: "Code with Mosh Support (AI)",
        senderEmail: "support@tickethelper.internal",
        bodyText: evaluation.resolutionReply,
      },
    });

    // 2. Mark ticket resolved and autoResolved: true
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "resolved",
        autoResolved: true,
        rawPayload: {
          ...existingPayload,
          autoResolution: {
            matchedSection: evaluation.matchedSection,
            confidence: evaluation.confidence,
            reasoning: evaluation.reasoning,
            model: evaluation.model,
            resolvedAt: new Date().toISOString(),
          },
        },
      },
    });

    console.log(
      `[AutoResolve] Ticket #${ticket.ticketNumber} auto-resolved by AI based on '${evaluation.matchedSection}'`
    );

    return { autoResolved: true, evaluation };
  }

  // Not auto-resolved: classify priority and category for human staff triage
  await classifyTicketAsync(ticketId);

  // Store escalation reason in rawPayload for staff audit without overwriting aiClassification
  if (evaluation.escalationReason) {
    const freshTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { rawPayload: true },
    });
    const latestPayload =
      typeof freshTicket?.rawPayload === "object" && freshTicket.rawPayload !== null
        ? (freshTicket.rawPayload as Record<string, any>)
        : {};

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        autoResolved: false,
        rawPayload: {
          ...latestPayload,
          autoResolutionEscalated: {
            reason: evaluation.escalationReason,
            matchedSection: evaluation.matchedSection,
            evaluatedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  console.log(
    `[AutoResolve] Ticket #${ticket.ticketNumber} not auto-resolved (${evaluation.escalationReason || evaluation.reasoning}). Assigned for staff triage.`
  );

  return { autoResolved: false, evaluation };
}
