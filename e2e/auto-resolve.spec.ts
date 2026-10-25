import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

/**
 * Helper to log in as the seeded admin user
 */
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Support Ticket Inbox")).toBeVisible();
}

test.describe("Knowledge Base Auto-Resolution Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // =========================================================================
  // 1. Inbound email matching KB is auto-resolved and hidden from default list
  // =========================================================================
  test("Inbound ticket matching KB is auto-resolved and hidden from default ticket list", async ({
    request,
    page,
  }) => {
    const timestamp = Date.now();
    const testSubject = `I forgot my password. What should I do? ${timestamp}`;
    const testSenderName = "Alex Rivera";
    const testSenderEmail = `alex_${timestamp}@example.com`;
    const testBody =
      "Hello support, I forgot my account password and cannot log in to my courses. How do I reset it?";

    // 1. Send inbound email webhook
    const response = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `"${testSenderName}" <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
        messageId: `<pw-reset-${timestamp}@example.com>`,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);

    // 2. Log in and navigate to Support Ticket Inbox
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Search for the ticket in the default ticket table
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);

    // 4. Verify that the ticket is NOT displayed in the default list
    const table = page.getByRole("table");
    await expect(table.locator("tbody tr", { hasText: testSubject })).not.toBeVisible();

    // 5. Clear search and switch to the "AI Resolved" tab
    await page.getByPlaceholder("Search by subject, email, or #...").fill("");
    const aiResolvedTab = page.getByRole("button", { name: /AI Resolved/i });
    await expect(aiResolvedTab).toBeVisible({ timeout: 10000 });
    await aiResolvedTab.click();

    // 6. Verify the ticket appears under the "AI Resolved" tab
    const autoResolvedRow = table.locator("tbody tr", { hasText: testSubject });
    await expect(autoResolvedRow).toBeVisible({ timeout: 5000 });
    await expect(autoResolvedRow).toContainText("AI Resolved");

    // 7. Click to open TicketDetailModal
    await autoResolvedRow.click();

    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    // 8. Verify the Auto-Resolved by AI banner is present
    await expect(detailModal.getByText(/Auto-Resolved by AI/i)).toBeVisible();
    await expect(
      detailModal.getByText(/1\. Account & Login Issues/i)
    ).toBeVisible();

    // 9. Verify the reply thread contains the automated response with Revanth Rao signature
    await expect(detailModal.getByText("✨ AI Auto-Reply")).toBeVisible();
    await expect(
      detailModal.getByText("Click **Forgot Password**.")
    ).toBeVisible();
    await expect(detailModal.getByText("Revanth Rao")).toBeVisible();
    await expect(
      detailModal.getByText("Code with Mosh Support Team")
    ).not.toBeVisible();
  });

  // =========================================================================
  // 2. Escalated inquiry is NOT auto-resolved and appears in default list
  // =========================================================================
  test("Inbound ticket triggering escalation rules is NOT auto-resolved and appears in agent list", async ({
    request,
    page,
  }) => {
    const timestamp = Date.now();
    const testSubject = `URGENT: Legal action regarding my course refund ${timestamp}`;
    const testSenderName = "Litigious Learner";
    const testSenderEmail = `litigious_${timestamp}@example.com`;
    const testBody =
      "I demand an immediate refund or my lawyer will file legal action in court against Code with Mosh!";

    // 1. Send inbound email webhook triggering Section 10 Escalation (legal action)
    const response = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `"${testSenderName}" <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
        messageId: `<legal-threat-${timestamp}@example.com>`,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);

    // 2. Log in and navigate to Support Ticket Inbox
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Search for the escalated ticket in the default ticket table
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);

    // 4. Verify that the escalated ticket DOES appear in the default list for agent triage
    const table = page.getByRole("table");
    const ticketRow = table.locator("tbody tr", { hasText: testSubject });
    await expect(ticketRow).toBeVisible({ timeout: 5000 });
    await expect(ticketRow).toContainText("Open");

    // 5. Open detail modal to verify escalation state
    await ticketRow.click();
    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    // Verify it was NOT auto-resolved and status remains Open
    await expect(detailModal.getByText(/Auto-Resolved by AI/i)).not.toBeVisible();
    const statusSelect = detailModal.getByLabel("Ticket Status");
    await expect(statusSelect).toHaveValue("open");
  });
});

