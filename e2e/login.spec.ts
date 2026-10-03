import { test, expect } from "@playwright/test";

test("admin can sign in and access the dashboard", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await page.getByLabel("Email Address").fill("admin@tickethelper.internal");
  await page.getByLabel("Password").fill("adminpassword123");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Welcome back, Super Admin!")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket Workspace" })).toBeVisible();
});
