import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Support Ticket Inbox")).toBeVisible();
}

test.describe("Ticket Reply Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("Staff can view thread and reply to a ticket with status transition", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const testSubject = `Reply Flow Test Subject ${timestamp}`;
    const testSenderEmail = `customer_${timestamp}@example.com`;
    const testBody = "Hello, I am having issues logging into my account.";
    const agentReplyText = `Hi there! I have reset your access credentials. (${timestamp})`;

    // 1. Ingest an inbound ticket via webhook
    const res = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Alex Customer <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
      },
    });
    expect(res.status()).toBe(201);

    // 2. Log in and navigate to inbox
    await loginAsAdmin(page);
    await page.goto("/");

    // 3. Find and open the ticket
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);
    const table = page.getByRole("table");
    const row = table.locator("tbody tr", { hasText: testSubject });
    await expect(row).toBeVisible();

    await row.click();
    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    // 4. Verify initial customer inquiry message is displayed
    await expect(detailModal.getByText("Initial Inquiry")).toBeVisible();
    await expect(detailModal.getByText(testBody)).toBeVisible();
    await expect(detailModal.getByText("Reply Thread (0)")).toBeVisible();
    await expect(
      detailModal.getByText("No replies in this thread yet")
    ).toBeVisible();

    // 5. Fill out the reply form
    const replyTextarea = detailModal.getByLabel("Reply message");
    await expect(replyTextarea).toBeVisible();
    await replyTextarea.fill(agentReplyText);

    // Select status after reply: "Resolved"
    const replyStatusSelect = detailModal.getByLabel("Status after reply");
    await replyStatusSelect.selectOption("resolved");

    // Click "Send Reply"
    const sendReplyButton = detailModal.getByRole("button", { name: "Send Reply" });
    await sendReplyButton.click();

    // 6. Verify successful feedback and thread update
    await expect(detailModal.getByText("Reply sent successfully!")).toBeVisible();
    await expect(detailModal.getByText("Reply Thread (1)")).toBeVisible();
    await expect(detailModal.getByText(agentReplyText)).toBeVisible();
    await expect(detailModal.getByText("Staff Reply")).toBeVisible();
    await expect(replyTextarea).toHaveValue("");

    // 7. Verify ticket status select in meta bar updated to "Resolved"
    const mainStatusSelect = detailModal.getByLabel("Ticket Status");
    await expect(mainStatusSelect).toHaveValue("resolved");

    // 8. Close modal and verify the inbox table row reflects "Resolved"
    await detailModal.getByLabel("Close dialog").click();
    await expect(detailModal).not.toBeVisible();
    await expect(row).toContainText("Resolved");

    // 9. Re-open modal to test submitting a second reply
    await row.click();
    await expect(detailModal).toBeVisible();
    await expect(detailModal.getByText("Reply Thread (1)")).toBeVisible();
    await expect(detailModal.getByText(agentReplyText)).toBeVisible();

    const secondReplyText = `Follow-up note: verified user successfully logged in. (${timestamp})`;
    await replyTextarea.fill(secondReplyText);
    await replyStatusSelect.selectOption("closed");
    await detailModal.getByRole("button", { name: "Send Reply" }).click();

    await expect(detailModal.getByText("Reply Thread (2)")).toBeVisible();
    await expect(detailModal.getByText(secondReplyText)).toBeVisible();
    await expect(mainStatusSelect).toHaveValue("closed");
  });

  test("Staff can polish a rough draft reply using AI (GPT-5-Nano) before sending", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const testSubject = `Polish AI Test Ticket ${timestamp}`;
    const testSenderEmail = `student_${timestamp}@example.com`;
    const testBody = "I can't seem to access my course syllabus on the portal.";
    const roughDraft = "reset your password and clearing cache should fix it";

    // 1. Ingest inbound ticket
    const res = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Student Sam <${testSenderEmail}>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: testBody,
      },
    });
    expect(res.status()).toBe(201);

    // 2. Login and open ticket
    await loginAsAdmin(page);
    await page.goto("/");
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);
    const table = page.getByRole("table");
    const row = table.locator("tbody tr", { hasText: testSubject });
    await expect(row).toBeVisible();
    await row.click();

    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    // 3. Verify Polish button exists and is disabled when textarea is empty
    const polishButton = detailModal.getByRole("button", { name: "Polish" });
    await expect(polishButton).toBeVisible();
    await expect(polishButton).toBeDisabled();

    // 4. Fill in rough draft reply
    const replyTextarea = detailModal.getByLabel("Reply message");
    await replyTextarea.fill(roughDraft);
    await expect(polishButton).toBeEnabled();

    // 5. Click Polish
    await polishButton.click();

    // 6. Verify polish feedback and improved reply content
    await expect(
      detailModal.getByText(/Draft polished & grammatically verified using/i)
    ).toBeVisible();
    const polishedVal = await replyTextarea.inputValue();
    expect(polishedVal).not.toBe(roughDraft);
    expect(polishedVal.length).toBeGreaterThan(roughDraft.length);
    expect(polishedVal.toLowerCase()).toContain("reaching out");

    // 7. Send the polished reply
    const sendReplyButton = detailModal.getByRole("button", { name: "Send Reply" });
    await sendReplyButton.click();

    await expect(detailModal.getByText("Reply sent successfully!")).toBeVisible();
    await expect(detailModal.getByText("Reply Thread (1)")).toBeVisible();
    await expect(detailModal.getByText("Staff Reply")).toBeVisible();
  });
});

