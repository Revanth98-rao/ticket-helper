import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(
    page.getByText(`Welcome back, ${TEST_CONFIG.admin.name}!`)
  ).toBeVisible();
}

async function loginAsAgent(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.agent.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.agent.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(
    page.getByText(`Welcome back, ${TEST_CONFIG.agent.name}!`)
  ).toBeVisible();
}

test.describe("User List & Management (Admin Only)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // =========================================================================
  // 1. Backend Security & RBAC Enforcement on /api/users
  // =========================================================================
  test.describe("Backend API Security", () => {
    test("unauthenticated request to GET /api/users is rejected with 401 Unauthorized", async ({
      request,
    }) => {
      const response = await request.get("/api/users");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toMatch(/Unauthorized/i);
    });

    test("agent request to GET /api/users is rejected with 403 Forbidden", async ({
      page,
      request,
    }) => {
      // 1. Authenticate as agent on the frontend to get active session cookie
      await loginAsAgent(page);

      // 2. Obtain session cookies from the authenticated agent browser context
      const cookies = await page.context().cookies();
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      // 3. Directly hit the admin-only /api/users endpoint with agent's credentials
      const apiResponse = await request.get("/api/users", {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(apiResponse.status()).toBe(403);
      const data = await apiResponse.json();
      expect(data.error).toMatch(/Forbidden/i);
    });

    test("admin request to GET /api/users succeeds with 200 and returns users array with counts", async ({
      page,
      request,
    }) => {
      // 1. Authenticate as admin
      await loginAsAdmin(page);

      // 2. Obtain session cookies
      const cookies = await page.context().cookies();
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      // 3. Request /api/users
      const apiResponse = await request.get("/api/users", {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(apiResponse.status()).toBe(200);
      const data = await apiResponse.json();

      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThanOrEqual(2);

      // Verify counts
      expect(data.counts).toBeDefined();
      expect(data.counts.total).toBeGreaterThanOrEqual(2);
      expect(data.counts.admin).toBeGreaterThanOrEqual(1);
      expect(data.counts.agent).toBeGreaterThanOrEqual(1);

      // Verify no sensitive account/password fields are exposed
      for (const u of data.users) {
        expect(u.password).toBeUndefined();
        expect(u.accounts).toBeUndefined();
        expect(u.id).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
      }
    });

    test("unauthenticated request to POST /api/users is rejected with 401 Unauthorized", async ({
      request,
    }) => {
      const response = await request.post("/api/users", {
        data: { name: "Test", email: "test@test.com", password: "password123" },
      });
      expect(response.status()).toBe(401);
    });

    test("agent request to POST /api/users is rejected with 403 Forbidden", async ({
      page,
      request,
    }) => {
      await loginAsAgent(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      const response = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Test", email: "test@test.com", password: "password123" },
      });
      expect(response.status()).toBe(403);
    });

    test("admin request to POST /api/users validates inputs and creates user", async ({
      page,
      request,
    }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      // Invalid name
      const res1 = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Ab", email: "test@test.com", password: "password123" },
      });
      expect(res1.status()).toBe(400);

      // Invalid email
      const res2 = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Test User", email: "notanemail", password: "password123" },
      });
      expect(res2.status()).toBe(400);

      // Duplicate email
      const res3 = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Test User", email: TEST_CONFIG.agent.email, password: "password123" },
      });
      expect(res3.status()).toBe(409);

      // Success
      const testEmail = `newuser_${Date.now()}@test.com`;
      const res4 = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Brand New User", email: testEmail, password: "securepassword123" },
      });
      expect(res4.status()).toBe(201);
      const data = await res4.json();
      expect(data.user.email).toBe(testEmail);
      expect(data.user.role).toBe("agent");
    });
  });

  // =========================================================================
  // 2. Frontend UI, Access Control & User List Interactions
  // =========================================================================
  test.describe("Frontend User List Interactions", () => {
    test("admin can navigate to /users from sidebar and view complete user list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Click User Management sidebar link
      await page.getByRole("link", { name: "User Management" }).click();
      await expect(page).toHaveURL(/\/users/);

      // Verify Page Header & Admin Badge
      await expect(
        page.getByRole("heading", { name: "Users & Permissions" })
      ).toBeVisible();
      await expect(page.getByText("Admin Only")).toBeVisible();

      // Verify Stat KPI Cards
      await expect(page.getByText("Total Users", { exact: true })).toBeVisible();
      await expect(page.getByText("Administrators", { exact: true })).toBeVisible();
      await expect(page.getByText("Support Agents", { exact: true })).toBeVisible();

      // Verify Table Headers
      await expect(page.getByRole("columnheader", { name: "User" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Created At" })).toBeVisible();

      const table = page.getByRole("table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });
      const agentRow = table.locator("tbody tr", { hasText: TEST_CONFIG.agent.email });

      // Verify Seeded Admin is displayed with Admin badge and "You" indicator
      await expect(adminRow).toBeVisible();
      await expect(adminRow).toContainText(TEST_CONFIG.admin.name);
      await expect(adminRow).toContainText("Admin");
      await expect(adminRow).toContainText("You");

      // Verify Seeded Agent is displayed
      await expect(agentRow).toBeVisible();
      await expect(agentRow).toContainText(TEST_CONFIG.agent.name);
      await expect(agentRow).toContainText("Support Agent");
    });

    test("admin can search users by name or email", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/users");
      const table = page.getByRole("table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });
      const agentRow = table.locator("tbody tr", { hasText: TEST_CONFIG.agent.email });

      await expect(adminRow).toBeVisible();
      await expect(agentRow).toBeVisible();

      // Search for agent
      const searchInput = page.getByPlaceholder("Search by name, email, or role...");
      await searchInput.fill(TEST_CONFIG.agent.name);

      // Agent is visible, Admin is filtered out
      await expect(agentRow).toBeVisible();
      await expect(adminRow).toHaveCount(0);

      // Clear search
      await searchInput.fill("");
      await expect(adminRow).toBeVisible();
      await expect(agentRow).toBeVisible();
    });

    test("admin can filter users by role (Admins Only / Agents Only / All Roles)", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.goto("/users");
      const table = page.getByRole("table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });
      const agentRow = table.locator("tbody tr", { hasText: TEST_CONFIG.agent.email });

      await expect(adminRow).toBeVisible();
      await expect(agentRow).toBeVisible();

      // Filter: Admins Only
      await page.getByRole("button", { name: "Admins Only" }).click();
      await expect(adminRow).toBeVisible();
      await expect(agentRow).toHaveCount(0);

      // Filter: Agents Only
      await page.getByRole("button", { name: "Agents Only" }).click();
      await expect(agentRow).toBeVisible();
      await expect(adminRow).toHaveCount(0);

      // Filter: All Roles
      await page.getByRole("button", { name: "All Roles" }).click();
      await expect(adminRow).toBeVisible();
      await expect(agentRow).toBeVisible();
    });

    test("empty state is shown when search has no matches", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/users");
      const table = page.getByRole("table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });

      const searchInput = page.getByPlaceholder("Search by name, email, or role...");
      await searchInput.fill("NonExistentUserQuery12345");

      await expect(page.getByText("No users found")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Clear Filters" })
      ).toBeVisible();

      // Click Clear Filters
      await page.getByRole("button", { name: "Clear Filters" }).click();
      await expect(adminRow).toBeVisible();
    });

    test("agent cannot access /users and is redirected to /", async ({ page }) => {
      await loginAsAgent(page);

      // Attempt to access admin-only /users directly
      await page.goto("/users");

      // ProtectedRoute redirects agent to "/"
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: "Ticket Workspace" })
      ).toBeVisible();
    });

    test("admin can create a new user via the Create User modal", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/users");

      // Click Create User
      await page.getByRole("button", { name: "Create User" }).click();
      
      const modal = page.getByRole("dialog", { name: "Create New User" });
      await expect(modal).toBeVisible();

      // Test validation
      await modal.getByLabel("Name").fill("Ab");
      await modal.getByLabel("Email").fill("invalid-email");
      await modal.getByLabel("Password").fill("short");
      await modal.getByRole("button", { name: "Create User" }).click();

      await expect(modal.getByText("Name must be at least 3 characters")).toBeVisible();
      await expect(modal.getByText("Please enter a valid email address")).toBeVisible();
      await expect(modal.getByText("Password must be at least 8 characters")).toBeVisible();

      // Fill valid data
      const newEmail = `ui_created_${Date.now()}@example.com`;
      await modal.getByLabel("Name").fill("UI Created User");
      await modal.getByLabel("Email").fill(newEmail);
      await modal.getByLabel("Password").fill("securepassword123");
      
      await modal.getByRole("button", { name: "Create User" }).click();

      // Modal should close and new user appears in table
      await expect(modal).not.toBeVisible();
      const table = page.getByRole("table");
      await expect(table.locator("tbody tr", { hasText: newEmail })).toBeVisible();
      
      // Verify login with new user works
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("Email Address").fill(newEmail);
      await page.getByLabel("Password").fill("securepassword123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(
        page.getByText(`Welcome back, UI Created User!`)
      ).toBeVisible();
    });
  });
});
