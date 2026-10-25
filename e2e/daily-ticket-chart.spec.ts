import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Support Ticket Inbox")).toBeVisible();
}

test.describe("30-Day Daily Ticket Volume Bar Chart Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("Renders 30-day ticket volume bar chart below metrics and displays daily breakdown on hover", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const testSubject = `Volume Test Ticket ${timestamp}`;

    // 1. Create a ticket today via inbound email webhook
    const inboundRes = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Chart Tester <tester_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: "Testing daily volume chart visualization.",
        date: new Date().toISOString(),
      },
    });
    expect(inboundRes.status()).toBe(201);

    // 2. Log in and navigate to the dashboard
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Verify KPI cards are visible
    await expect(page.getByText("Total Ingested")).toBeVisible();
    await expect(page.getByText("Open Tickets")).toBeVisible();

    // 4. Verify 30-Day Bar Chart component is rendered below metrics
    const chartCard = page.getByTestId("ticket-daily-volume-chart");
    await expect(chartCard).toBeVisible();

    // Verify title and badges
    await expect(chartCard.getByText("Ticket Volume (Past 30 Days)")).toBeVisible();
    await expect(chartCard.getByText("30d Total")).toBeVisible();
    await expect(chartCard.getByText("Daily Avg")).toBeVisible();
    await expect(chartCard.getByText("Peak Day")).toBeVisible();

    // 5. Verify 30 daily bar elements exist
    const bars = chartCard.locator('[data-testid^="bar-"]');
    await expect(bars).toHaveCount(30);

    // 6. Hover over the last bar (Today) and verify interactive tooltip displays
    const todayBar = bars.last();
    await todayBar.hover();

    const tooltip = chartCard.getByTestId("chart-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip.getByText(/Today/i)).toBeVisible();
    await expect(tooltip.getByText(/ticket/i)).toBeVisible();
  });
});
