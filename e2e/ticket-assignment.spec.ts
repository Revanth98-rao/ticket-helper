import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Support Ticket Inbox")).toBeVisible();
}

test.describe("Ticket Assignment Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("Staff can assign an unassigned ticket to an agent via detail modal", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const testSubject = `Assignment Test Subject ${timestamp}`;
    const testSenderEmail = `user_${timestamp}@example.com`;

    // 1. Ingest an unassigned ticket via webhook
    const res = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Sender <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: "Please assist with our account migration.",
      },
    });
    expect(res.status()).toBe(201);

    // 2. Log in and navigate to inbox
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Search for the specific ticket
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);
    const table = page.getByRole("table");
    const row = table.locator("tbody tr", { hasText: testSubject });
    await expect(row).toBeVisible();

    // 4. Verify initial table state shows "Unassigned"
    await expect(row).toContainText("Unassigned");

    // 5. Open ticket detail modal
    await row.click();
    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    const assigneeSelect = detailModal.getByLabel("Assigned Agent");
    await expect(assigneeSelect).toBeVisible();
    await expect(assigneeSelect).toHaveValue("");

    // 6. Select "Support Agent" from the assignees dropdown
    await assigneeSelect.selectOption({ label: "Support Agent (agent)" });

    // 7. Close modal and verify the table row now displays "Support Agent"
    await detailModal.getByLabel("Close dialog").click();
    await expect(row).toContainText("Support Agent");

    // 8. Re-open modal and use the "Me" shortcut to reassign to Super Admin
    await row.click();
    await expect(detailModal).toBeVisible();

    const meButton = detailModal.getByTitle("Assign ticket to yourself");
    await expect(meButton).toBeVisible();
    await meButton.click();

    // Verify select value updated to admin user
    await detailModal.getByLabel("Close dialog").click();
    await expect(row).toContainText("Super Admin");

    // 9. Unassign the ticket
    await row.click();
    await expect(detailModal).toBeVisible();
    await assigneeSelect.selectOption("");
    await detailModal.getByLabel("Close dialog").click();

    await expect(row).toContainText("Unassigned");
  });

  test("User can filter tickets by Assignee in toolbar", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const subjectPending = `PendingApproval Ticket ${timestamp}`;
    const subjectClaimed = `ClaimedTicket Ticket ${timestamp}`;

    // 1. Create two tickets
    const res1 = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Client A <client_a_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: subjectPending,
        text: "Pending inquiry body",
      },
    });
    expect(res1.status()).toBe(201);

    const res2 = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Client B <client_b_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: subjectClaimed,
        text: "Claimed inquiry body",
      },
    });
    expect(res2.status()).toBe(201);

    // 2. Log in
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Assign the second ticket to Support Agent via detail modal
    await page.getByPlaceholder("Search by subject, email, or #...").fill(subjectClaimed);
    const row2 = page.getByRole("table").locator("tbody tr", { hasText: subjectClaimed });
    await expect(row2).toBeVisible();
    await row2.click();

    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();
    await detailModal.getByLabel("Assigned Agent").selectOption({ label: "Support Agent (agent)" });
    await detailModal.getByLabel("Close dialog").click();
    await expect(row2).toContainText("Support Agent");

    // 4. Clear search and test the Assignee filter dropdown
    await page.getByPlaceholder("Search by subject, email, or #...").fill("");
    const assigneeFilter = page.getByLabel("Filter by Assignee");
    await expect(assigneeFilter).toBeVisible();

    // Filter by "Unassigned"
    await assigneeFilter.selectOption("unassigned");
    await page.getByPlaceholder("Search by subject, email, or #...").fill(subjectPending);
    await expect(page.getByRole("table").locator("tbody tr", { hasText: subjectPending })).toBeVisible();

    // When searching for assigned subject while filter is "unassigned", it should not appear
    await page.getByPlaceholder("Search by subject, email, or #...").fill(subjectClaimed);
    await expect(page.getByText("No matching tickets found")).toBeVisible();

    // Reset filter to All Assignees
    await assigneeFilter.selectOption("all");
    await expect(page.getByRole("table").locator("tbody tr", { hasText: subjectClaimed })).toBeVisible();
  });
});
