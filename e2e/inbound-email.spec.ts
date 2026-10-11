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
  await expect(page.getByText(`Support Ticket Inbox`)).toBeVisible();
}

test.describe("Inbound Email Ticket Ingestion", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // =========================================================================
  // 1. Webhook Ingestion API: Receives email and creates ticket in database
  // =========================================================================
  test("Inbound webhook receives email and converts it to a support ticket", async ({
    request,
  }) => {
    const timestamp = Date.now();
    const testSubject = `Grade submission problem ${timestamp}`;
    const testSenderName = "Professor Charles";
    const testSenderEmail = `charles_${timestamp}@university.edu`;
    const testBody = "Hello support, I am getting an error when uploading final exam grades.";

    const response = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `"${testSenderName}" <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
        messageId: `<grade-sub-${timestamp}@university.edu>`,
        date: new Date().toISOString(),
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.ticket).toBeDefined();
    expect(body.ticket.ticketNumber).toBeGreaterThan(0);
    expect(body.ticket.subject).toBe(testSubject);
    expect(body.ticket.customerEmail).toBe(testSenderEmail);
    expect(body.ticket.customerName).toBe(testSenderName);
    expect(body.ticket.status).toBe("open");
    expect(body.ticket.priority).toBe("medium");
  });

  // =========================================================================
  // 2. UI Reflection: Staff sees ticket in inbox and opens detail modal
  // =========================================================================
  test("Agent sees email ticket in workspace inbox and views message details", async ({
    page,
    request,
  }) => {
    // 1. Ingest an email via webhook
    const timestamp = Date.now();
    const testSubject = `Lab equipment request ${timestamp}`;
    const testSenderEmail = `lab_tech_${timestamp}@college.edu`;
    const testBody = "We need three new multimeters for Room 402 by Friday.";

    const webhookRes = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Lab Tech <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
      },
    });
    expect(webhookRes.status()).toBe(201);

    // 2. Log in and view tickets dashboard
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Verify ticket appears in table
    const table = page.getByRole("table");
    const ticketRow = table.locator("tbody tr", { hasText: testSubject });
    await expect(ticketRow).toBeVisible();
    await expect(ticketRow).toContainText("Open");
    await expect(ticketRow).toContainText(testSenderEmail);

    // 4. Click row to open detail modal
    await ticketRow.click();

    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();
    await expect(detailModal.getByText(testSubject)).toBeVisible();
    await expect(detailModal.getByText(testBody)).toBeVisible();
    await expect(detailModal.getByText(testSenderEmail, { exact: true })).toBeVisible();

    // 5. Change ticket status to 'In Progress'
    const statusSelect = detailModal.locator("select");
    await statusSelect.selectOption("in_progress");

    // Close modal
    await detailModal.getByRole("button", { name: "Close", exact: true }).click();
    await expect(detailModal).not.toBeVisible();

    // Verify row now shows 'In Progress'
    await expect(ticketRow).toContainText("In Progress");
  });

  // =========================================================================
  // 3. UI Inbound Simulation: Staff simulates inbound email from dashboard
  // =========================================================================
  test("Staff can simulate inbound email directly from workspace UI", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/");

    // Click "Simulate Inbound Email" button
    await page.getByRole("button", { name: "Simulate Inbound Email" }).click();

    const modal = page.getByRole("dialog", { name: "Simulate Inbound Email" });
    await expect(modal).toBeVisible();

    const timestamp = Date.now();
    const customerName = `Student Sarah ${timestamp}`;
    const customerEmail = `sarah_${timestamp}@college.edu`;
    const subject = `Library account access ${timestamp}`;
    const emailBody = "My student card was locked when trying to borrow books.";

    await modal.getByLabel("Customer Name").fill(customerName);
    await modal.getByLabel("Customer Email").fill(customerEmail);
    await modal.getByLabel("Subject").fill(subject);
    await modal.getByLabel("Email Body").fill(emailBody);

    // Submit simulation
    await modal.getByRole("button", { name: "Send Inbound Email" }).click();

    // Modal closes upon success
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify newly simulated ticket appears in table
    const table = page.getByRole("table");
    const newRow = table.locator("tbody tr", { hasText: subject });
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText(customerName);
    await expect(newRow).toContainText("Open");
  });
});

