import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Support Ticket Inbox")).toBeVisible();
}

test.describe("Ticket List Feature - Newest First & Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("Tickets list displays tickets sorted by newest first by default", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const olderSubject = `Older Ticket ${timestamp}`;
    const newerSubject = `Newer Ticket ${timestamp + 1000}`;

    // 1. Ingest an earlier ticket
    const res1 = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Older Sender <older_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: olderSubject,
        text: "This is the older ticket message body.",
        date: new Date(timestamp - 5000).toISOString(),
      },
    });
    expect(res1.status()).toBe(201);

    // 2. Ingest a newer ticket
    const res2 = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Newer Sender <newer_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: newerSubject,
        text: "This is the newer ticket message body.",
        date: new Date(timestamp).toISOString(),
      },
    });
    expect(res2.status()).toBe(201);

    // 3. Log in and open tickets workspace
    await loginAsAdmin(page);
    await page.goto("/");

    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // 4. Verify that the newer ticket appears before the older ticket in the table rows
    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    const firstRowText = await rows.nth(0).innerText();
    const secondRowText = await rows.nth(1).innerText();

    expect(firstRowText).toContain(newerSubject);
    expect(secondRowText).toContain(olderSubject);
  });

  test("User can toggle sort order between newest first and oldest first", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const tag = `ToggleSort_${timestamp}`;
    const firstSubject = `Alpha Ticket ${tag}`;
    const secondSubject = `Omega Ticket ${tag}`;

    await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Alpha User <alpha_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: firstSubject,
        text: "Alpha content",
      },
    });

    await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Omega User <omega_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: secondSubject,
        text: "Omega content",
      },
    });

    await loginAsAdmin(page);
    await page.goto("/");

    // Search by unique tag to isolate the test rows
    await page.getByPlaceholder("Search by subject, email, or #...").fill(tag);

    const table = page.getByRole("table");
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // By default, newest first: Omega appears before Alpha
    await expect(rows.nth(0)).toContainText(secondSubject);
    await expect(rows.nth(1)).toContainText(firstSubject);

    // Click "Received" header to switch to Oldest First
    await page.getByRole("columnheader", { name: "Received" }).click();

    // Now oldest first: Alpha appears before Omega
    await expect(rows.nth(0)).toContainText(firstSubject);
    await expect(rows.nth(1)).toContainText(secondSubject);

    // Click "Received" header again to toggle back to Newest First
    await page.getByRole("columnheader", { name: "Received" }).click();
    await expect(rows.nth(0)).toContainText(secondSubject);
    await expect(rows.nth(1)).toContainText(firstSubject);
  });

  test("User can search tickets by subject, customer email, or ticket number", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const uniqueTerm = `QuantumPhysics${timestamp}`;
    const subject = `Question about ${uniqueTerm}`;
    const customerEmail = `einstein_${timestamp}@princeton.edu`;

    const createRes = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Albert Einstein <${customerEmail}>`,
        to: "support@tickethelper.internal",
        subject,
        text: "Help with relativity calculations",
      },
    });
    const createdData = await createRes.json();
    const ticketNumber = createdData.ticket.ticketNumber;

    await loginAsAdmin(page);
    await page.goto("/");

    const searchInput = page.getByPlaceholder("Search by subject, email, or #...");
    const table = page.getByRole("table");

    // Search by subject unique term
    await searchInput.fill(uniqueTerm);
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody tr").first()).toContainText(subject);

    // Clear search
    await page.getByTitle("Clear search").click();
    await expect(searchInput).toHaveValue("");

    // Search by customer email
    await searchInput.fill(customerEmail);
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody tr").first()).toContainText(customerEmail);

    // Clear search
    await page.getByTitle("Clear search").click();

    // Search by ticket number e.g. #1
    await searchInput.fill(`#${ticketNumber}`);
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody tr").first()).toContainText(`#${ticketNumber}`);
  });

  test("User can filter tickets by status tabs", async ({ page, request }) => {
    const timestamp = Date.now();
    const openSubject = `Open Inquiry ${timestamp}`;
    const inProgressSubject = `Investigating Issue ${timestamp}`;

    // Create an open ticket
    await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `User One <user1_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: openSubject,
        text: "Need help",
      },
    });

    // Create another ticket and update it to in_progress
    const res = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `User Two <user2_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: inProgressSubject,
        text: "Already being handled",
      },
    });
    const ticket2 = (await res.json()).ticket;

    // Log in
    await loginAsAdmin(page);

    // Update ticket2 to in_progress via API
    await page.request.patch(`/api/tickets/${ticket2.id}`, {
      data: { status: "in_progress" },
    });

    await page.goto("/");

    const table = page.getByRole("table");

    // "All" tab should show both
    await expect(table.locator("tbody tr", { hasText: openSubject })).toBeVisible();
    await expect(table.locator("tbody tr", { hasText: inProgressSubject })).toBeVisible();

    // Click "In Progress" tab
    await page.getByRole("button", { name: /^In Progress/ }).click();
    await expect(table.locator("tbody tr", { hasText: inProgressSubject })).toBeVisible();
    await expect(table.locator("tbody tr", { hasText: openSubject })).toHaveCount(0);

    // Click "Open" tab
    await page.getByRole("button", { name: /^Open/ }).click();
    await expect(table.locator("tbody tr", { hasText: openSubject })).toBeVisible();
    await expect(table.locator("tbody tr", { hasText: inProgressSubject })).toHaveCount(0);
  });
});

