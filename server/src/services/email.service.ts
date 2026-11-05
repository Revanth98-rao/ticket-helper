/**
 * Email Dispatch Service
 * Sends outgoing email notifications via SendGrid (or Resend fallback).
 */

interface SendTicketReplyParams {
  to: string;
  customerName?: string | null;
  ticketId: string;
  ticketSubject: string;
  replyText: string;
  agentName: string;
}

/**
 * Sends an email notification to the customer when an agent replies to their ticket.
 */
export async function sendTicketReplyEmail(params: SendTicketReplyParams): Promise<boolean> {
  const { to, customerName, ticketId, ticketSubject, replyText, agentName } = params;

  const apiKey = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "support@tickethelper.internal";

  if (!apiKey) {
    console.log(
      `[Email Service] Outbound email skipped (no SENDGRID_API_KEY or RESEND_API_KEY configured). Target: ${to}`
    );
    return false;
  }

  const shortId = ticketId.slice(0, 8);
  const subject = `Re: [Ticket #${shortId}] ${ticketSubject}`;
  const displayName = customerName ? customerName.trim() : "Customer";

  // Build clean HTML email template
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 24px; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.05em; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 8px 0 0 0; }
    .content { font-size: 15px; color: #334155; white-space: pre-wrap; margin-bottom: 28px; }
    .footer { border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Ticket #${shortId}</span>
      <h2 class="title">${ticketSubject}</h2>
    </div>
    <div class="content">
<p>Hello ${displayName},</p>

${replyText.replace(/\n/g, "<br>")}
    </div>
    <div class="footer">
      <p>Replied by <strong>${agentName}</strong> &bull; TicketHelper Support</p>
      <p>To reply to this message, simply respond directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    // 1. Send via SendGrid REST API if key starts with SG.
    if (apiKey.startsWith("SG.") || process.env.SENDGRID_API_KEY) {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to, name: displayName }],
            },
          ],
          from: { email: fromEmail, name: "TicketHelper Support" },
          reply_to: { email: fromEmail, name: "TicketHelper Support" },
          subject: subject,
          content: [
            {
              type: "text/plain",
              value: `Hello ${displayName},\n\n${replyText}\n\n---\nReplied by ${agentName} | TicketHelper Support`,
            },
            {
              type: "text/html",
              value: htmlContent,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Email Service] SendGrid error (${response.status}):`, errorText);
        return false;
      }

      console.log(`[Email Service] SendGrid email delivered successfully to ${to} for Ticket #${shortId}`);
      return true;
    }

    // 2. Resend REST API fallback
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error(`[Email Service] Resend error (${resendResponse.status}):`, errorText);
      return false;
    }

    console.log(`[Email Service] Resend email delivered successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Exception sending email:", error);
    return false;
  }
}
