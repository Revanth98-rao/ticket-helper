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
    test("admin request to PATCH /api/users/:id validates inputs and updates user", async ({
      page,
      request,
    }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      // Create a dedicated user for this test to avoid mutating global agent
      const initialEmail = `tempuser_${Date.now()}@test.com`;
      const createRes = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "Temp User", email: initialEmail, password: "temppassword123" },
      });
      const createData = await createRes.json();
      const testUserId = createData.user.id;

      // Invalid ID
      const res1 = await request.patch("/api/users/not-a-real-id", {
        headers: { Cookie: cookieHeader },
        data: { name: "Test User", email: "newemail@test.com" },
      });
      expect(res1.status()).toBe(404);

      // Duplicate email (another user's email)
      const res2 = await request.patch(`/api/users/${testUserId}`, {
        headers: { Cookie: cookieHeader },
        data: { name: "Test User", email: TEST_CONFIG.admin.email }, // Using admin's email
      });
      expect(res2.status()).toBe(409);

      // Valid update (no password)
      const testEmail = `updateduser_${Date.now()}@test.com`;
      const res3 = await request.patch(`/api/users/${testUserId}`, {
        headers: { Cookie: cookieHeader },
        data: { name: "Updated User", email: testEmail },
      });
      expect(res3.status()).toBe(200);
      const data3 = await res3.json();
      expect(data3.user.name).toBe("Updated User");
      expect(data3.user.email).toBe(testEmail);

      // Verify that user can still login with their OLD password since it wasn't changed
      const newUserContext = await page.context().browser()?.newContext();
      if (!newUserContext) throw new Error("Could not create new context");
      const userPage = await newUserContext.newPage();
      await userPage.goto("/login");
      await userPage.getByLabel("Email Address").fill(testEmail);
      await userPage.getByLabel("Password").fill("temppassword123");
      await userPage.getByRole("button", { name: "Sign In" }).click();
      await expect(userPage.getByText(`Welcome back, Updated User!`)).toBeVisible();
      await newUserContext.close();

      // Valid update (WITH new password)
      const res4 = await request.patch(`/api/users/${testUserId}`, {
        headers: { Cookie: cookieHeader },
        data: { name: "Updated User", email: testEmail, password: "newtemppassword" },
      });
      expect(res4.status()).toBe(200);

      // Verify user can login with NEW password
      const newUserContext2 = await page.context().browser()?.newContext();
      if (!newUserContext2) throw new Error("Could not create new context");
      const userPage2 = await newUserContext2.newPage();
      await userPage2.goto("/login");
      await userPage2.getByLabel("Email Address").fill(testEmail);
      await userPage2.getByLabel("Password").fill("newtemppassword");
      await userPage2.getByRole("button", { name: "Sign In" }).click();
      await expect(userPage2.getByText(`Welcome back, Updated User!`)).toBeVisible();
      await newUserContext2.close();
    });

    test("unauthenticated request to DELETE /api/users/:id is rejected with 401 Unauthorized", async ({
      request,
    }) => {
      const response = await request.delete("/api/users/some-id");
      expect(response.status()).toBe(401);
    });

    test("agent request to DELETE /api/users/:id is rejected with 403 Forbidden", async ({
      page,
      request,
    }) => {
      await loginAsAgent(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      const response = await request.delete("/api/users/some-id", {
        headers: { Cookie: cookieHeader },
      });
      expect(response.status()).toBe(403);
    });

    test("admin request to DELETE /api/users/:id cannot delete admin user", async ({
      page,
      request,
    }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      // Get list of users to find admin id
      const listRes = await request.get("/api/users", {
        headers: { Cookie: cookieHeader },
      });
      const data = await listRes.json();
      const adminUser = data.users.find((u: any) => u.role === "admin");

      expect(adminUser).toBeDefined();

      const deleteRes = await request.delete(`/api/users/${adminUser.id}`, {
        headers: { Cookie: cookieHeader },
      });
      expect(deleteRes.status()).toBe(400);
      const deleteData = await deleteRes.json();
      expect(deleteData.error).toMatch(/Admin users cannot be deleted/i);
    });

    test("admin request to DELETE /api/users/:id soft deletes user and excludes from active list", async ({
      page,
      request,
    }) => {
      await loginAsAdmin(page);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      // Create a dedicated user for deletion test
      const testEmail = `deluser_${Date.now()}@test.com`;
      const createRes = await request.post("/api/users", {
        headers: { Cookie: cookieHeader },
        data: { name: "User To Delete", email: testEmail, password: "testpassword123" },
      });
      expect(createRes.status()).toBe(201);
      const createData = await createRes.json();
      const userId = createData.user.id;

      // Verify user is in active list
      const listBefore = await request.get("/api/users", {
        headers: { Cookie: cookieHeader },
      });
      const listDataBefore = await listBefore.json();
      expect(listDataBefore.users.some((u: any) => u.id === userId)).toBe(true);

      // Perform soft delete
      const delRes = await request.delete(`/api/users/${userId}`, {
        headers: { Cookie: cookieHeader },
      });
      expect(delRes.status()).toBe(200);

      // Verify user is NO LONGER returned in GET /api/users
      const listAfter = await request.get("/api/users", {
        headers: { Cookie: cookieHeader },
      });
      const listDataAfter = await listAfter.json();
      expect(listDataAfter.users.some((u: any) => u.id === userId)).toBe(false);

      // Verify GET /api/users/:id returns 404 for soft-deleted user
      const singleRes = await request.get(`/api/users/${userId}`, {
        headers: { Cookie: cookieHeader },
      });
      expect(singleRes.status()).toBe(404);
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
    test("admin can edit an existing user via the User modal", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/users");

      const table = page.getByRole("table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_CONFIG.agent.email });
      await expect(agentRow).toBeVisible();

      // Click Edit on the agent
      await agentRow.getByRole("button", { name: "Edit user" }).click();

      const modal = page.getByRole("dialog", { name: "Edit User" });
      await expect(modal).toBeVisible();

      // Verify it's populated
      await expect(modal.getByLabel("Name")).toHaveValue(TEST_CONFIG.agent.name);
      await expect(modal.getByLabel("Email")).toHaveValue(TEST_CONFIG.agent.email);

      // Change name and email
      const newName = `Updated Agent Name ${Date.now()}`;
      const newEmail = `updated_${Date.now()}@example.com`;
      await modal.getByLabel("Name").fill(newName);
      await modal.getByLabel("Email").fill(newEmail);
      
      // Leave password blank (should not change)
      await modal.getByRole("button", { name: "Save Changes" }).click();
      await expect(modal).not.toBeVisible();

      // Verify row updated
      const updatedRow = table.locator("tbody tr", { hasText: newEmail });
      await expect(updatedRow).toBeVisible();
      await expect(updatedRow).toContainText(newName);

      // Log in with new email and OLD password
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("Email Address").fill(newEmail);
      await page.getByLabel("Password").fill(TEST_CONFIG.agent.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page.getByText(`Welcome back, ${newName}!`)).toBeVisible();

      // Change password now
      await page.context().clearCookies();
      await loginAsAdmin(page);
      await page.goto("/users");

      const updatedAgentRow = page.getByRole("table").locator("tbody tr", { hasText: newEmail });
      await updatedAgentRow.getByRole("button", { name: "Edit user" }).click();
      
      const modal2 = page.getByRole("dialog", { name: "Edit User" });
      await expect(modal2).toBeVisible();
      await modal2.getByLabel("Password").fill("newpassword123");
      await modal2.getByRole("button", { name: "Save Changes" }).click();
      await expect(modal2).not.toBeVisible();

      // Log in with NEW password
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("Email Address").fill(newEmail);
      await page.getByLabel("Password").fill("newpassword123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page.getByText(`Welcome back, ${newName}!`)).toBeVisible();
    });

    test("admin cannot delete admin user from the table", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/users");

      const table = page.getByRole("table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });
      await expect(adminRow).toBeVisible();

      // Verify that delete button for admin is either disabled or not actionable
      const disabledDeleteBtn = adminRow.getByRole("button", { name: "Admin cannot be deleted" });
      await expect(disabledDeleteBtn).toBeVisible();
      await expect(disabledDeleteBtn).toBeDisabled();
    });

    test("admin can delete user via confirmation modal", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/users");

      // 1. Create a dedicated user to delete
      const userToDeleteEmail = `ui_del_${Date.now()}@example.com`;
      await page.getByRole("button", { name: "Create User" }).click();
      const createModal = page.getByRole("dialog", { name: "Create New User" });
      await expect(createModal).toBeVisible();
      await createModal.getByLabel("Name").fill("User To Soft Delete");
      await createModal.getByLabel("Email").fill(userToDeleteEmail);
      await createModal.getByLabel("Password").fill("tempsecret123");
      await createModal.getByRole("button", { name: "Create User" }).click();
      await expect(createModal).not.toBeVisible();

      const table = page.getByRole("table");
      const userRow = table.locator("tbody tr", { hasText: userToDeleteEmail });
      await expect(userRow).toBeVisible();

      // 2. Click Delete button on user row
      await userRow.getByRole("button", { name: "Delete user" }).click();

      // 3. Confirm Delete modal appears
      const deleteModal = page.getByRole("dialog", { name: "Delete User" });
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText("User To Soft Delete")).toBeVisible();
      await expect(deleteModal.getByText(userToDeleteEmail)).toBeVisible();

      // 4. Test Cancel button
      await deleteModal.getByRole("button", { name: "Cancel" }).click();
      await expect(deleteModal).not.toBeVisible();
      await expect(userRow).toBeVisible();

      // 5. Open delete modal again and confirm deletion
      await userRow.getByRole("button", { name: "Delete user" }).click();
      await expect(deleteModal).toBeVisible();
      await deleteModal.getByRole("button", { name: "Delete User" }).click();

      // 6. Modal closes and user row disappears from table
      await expect(deleteModal).not.toBeVisible();
      await expect(table.locator("tbody tr", { hasText: userToDeleteEmail })).toHaveCount(0);
    });
  });
});
