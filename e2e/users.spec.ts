import { test, expect, Page } from "@playwright/test";
import { TEST_CONFIG } from "./test-env";

/**
 * Helper to authenticate as the seeded admin user.
 */
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(TEST_CONFIG.admin.email);
  await page.getByLabel("Password").fill(TEST_CONFIG.admin.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(
    page.getByText(`Welcome back, ${TEST_CONFIG.admin.name}!`)
  ).toBeVisible();
}

test.describe("User Management - CRUD Operations (Happy Paths)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // =========================================================================
  // 1. READ: View user list, statistics, and user details
  // =========================================================================
  test("Read: admin can view user list, statistics, and user details", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Navigate to /users from sidebar
    await page.getByRole("link", { name: "User Management" }).click();
    await expect(page).toHaveURL(/\/users/);

    // Verify page header and admin badge
    await expect(
      page.getByRole("heading", { name: "Users & Permissions" })
    ).toBeVisible();
    await expect(page.getByText("Admin Only")).toBeVisible();

    // Verify statistics KPI cards
    await expect(page.getByText("Total Users", { exact: true })).toBeVisible();
    await expect(page.getByText("Administrators", { exact: true })).toBeVisible();
    await expect(page.getByText("Support Agents", { exact: true })).toBeVisible();

    // Verify table columns
    await expect(page.getByRole("columnheader", { name: "User" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Created At" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();

    const table = page.getByRole("table");

    // Verify seeded Admin user row details
    const adminRow = table.locator("tbody tr", { hasText: TEST_CONFIG.admin.email });
    await expect(adminRow).toBeVisible();
    await expect(adminRow).toContainText(TEST_CONFIG.admin.name);
    await expect(adminRow).toContainText("Admin");
    await expect(adminRow).toContainText("You");

    // Verify seeded Agent user row details
    const agentRow = table.locator("tbody tr", { hasText: TEST_CONFIG.agent.email });
    await expect(agentRow).toBeVisible();
    await expect(agentRow).toContainText(TEST_CONFIG.agent.name);
    await expect(agentRow).toContainText("Support Agent");
  });

  // =========================================================================
  // 2. CREATE: Create a new user via modal
  // =========================================================================
  test("Create: admin can create a new user and user can log in", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    // Open Create User modal
    await page.getByRole("button", { name: "Create User" }).click();

    const modal = page.getByRole("dialog", { name: "Create New User" });
    await expect(modal).toBeVisible();

    // Fill valid user details
    const timestamp = Date.now();
    const newName = `New Agent ${timestamp}`;
    const newEmail = `agent_${timestamp}@example.com`;
    const newPassword = "securepassword123";

    await modal.getByLabel("Name").fill(newName);
    await modal.getByLabel("Email").fill(newEmail);
    await modal.getByLabel("Password").fill(newPassword);

    // Submit form
    await modal.getByRole("button", { name: "Create User" }).click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify new user appears in table with correct role and status
    const table = page.getByRole("table");
    const userRow = table.locator("tbody tr", { hasText: newEmail });
    await expect(userRow).toBeVisible();
    await expect(userRow).toContainText(newName);
    await expect(userRow).toContainText("Support Agent");
    await expect(userRow).toContainText("Active");

    // Verify the newly created user can log in with their credentials
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email Address").fill(newEmail);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(`Welcome back, ${newName}!`)).toBeVisible();
  });

  // =========================================================================
  // 3. UPDATE: Edit existing user details and password
  // =========================================================================
  test("Update: admin can edit user details and password via edit modal", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    // Create a dedicated user to edit
    const timestamp = Date.now();
    const originalName = `Editable User ${timestamp}`;
    const originalEmail = `to_edit_${timestamp}@example.com`;
    const initialPassword = "initialpassword123";

    await page.getByRole("button", { name: "Create User" }).click();
    const createModal = page.getByRole("dialog", { name: "Create New User" });
    await expect(createModal).toBeVisible();
    await createModal.getByLabel("Name").fill(originalName);
    await createModal.getByLabel("Email").fill(originalEmail);
    await createModal.getByLabel("Password").fill(initialPassword);
    await createModal.getByRole("button", { name: "Create User" }).click();
    await expect(createModal).not.toBeVisible();

    const table = page.getByRole("table");
    const userRow = table.locator("tbody tr", { hasText: originalEmail });
    await expect(userRow).toBeVisible();

    // Click Edit button on the user row
    await userRow.getByRole("button", { name: "Edit user" }).click();

    const editModal = page.getByRole("dialog", { name: "Edit User" });
    await expect(editModal).toBeVisible();

    // Verify fields are pre-populated with existing data
    await expect(editModal.getByLabel("Name")).toHaveValue(originalName);
    await expect(editModal.getByLabel("Email")).toHaveValue(originalEmail);

    // Update name and email (leaving password blank)
    const updatedName = `Updated User ${timestamp}`;
    const updatedEmail = `updated_${timestamp}@example.com`;
    await editModal.getByLabel("Name").fill(updatedName);
    await editModal.getByLabel("Email").fill(updatedEmail);

    await editModal.getByRole("button", { name: "Save Changes" }).click();
    await expect(editModal).not.toBeVisible();

    // Verify table reflects updated details
    const updatedRow = table.locator("tbody tr", { hasText: updatedEmail });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText(updatedName);

    // Verify user can log in with new email and unchanged password
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email Address").fill(updatedEmail);
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(`Welcome back, ${updatedName}!`)).toBeVisible();

    // Update password for the user
    await page.context().clearCookies();
    await loginAsAdmin(page);
    await page.goto("/users");

    const rowToChangePassword = table.locator("tbody tr", { hasText: updatedEmail });
    await rowToChangePassword.getByRole("button", { name: "Edit user" }).click();
    await expect(editModal).toBeVisible();

    const newPassword = "newpassword123";
    await editModal.getByLabel("Password").fill(newPassword);
    await editModal.getByRole("button", { name: "Save Changes" }).click();
    await expect(editModal).not.toBeVisible();

    // Verify user can log in with new password
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email Address").fill(updatedEmail);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(`Welcome back, ${updatedName}!`)).toBeVisible();
  });

  // =========================================================================
  // 4. DELETE: Soft-delete user via confirmation modal
  // =========================================================================
  test("Delete: admin can delete a user via confirmation modal", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    // Create a dedicated user to delete
    const timestamp = Date.now();
    const nameToDelete = `User For Deletion ${timestamp}`;
    const emailToDelete = `to_delete_${timestamp}@example.com`;

    await page.getByRole("button", { name: "Create User" }).click();
    const createModal = page.getByRole("dialog", { name: "Create New User" });
    await expect(createModal).toBeVisible();
    await createModal.getByLabel("Name").fill(nameToDelete);
    await createModal.getByLabel("Email").fill(emailToDelete);
    await createModal.getByLabel("Password").fill("deletesecret123");
    await createModal.getByRole("button", { name: "Create User" }).click();
    await expect(createModal).not.toBeVisible();

    const table = page.getByRole("table");
    const userRow = table.locator("tbody tr", { hasText: emailToDelete });
    await expect(userRow).toBeVisible();

    // Click Delete button on user row
    await userRow.getByRole("button", { name: "Delete user" }).click();

    // Verify Delete confirmation dialog opens with user info
    const deleteModal = page.getByRole("dialog", { name: "Delete User" });
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.getByText(nameToDelete)).toBeVisible();
    await expect(deleteModal.getByText(emailToDelete)).toBeVisible();

    // Confirm deletion
    await deleteModal.getByRole("button", { name: "Delete User" }).click();

    // Verify modal closes and user is removed from table
    await expect(deleteModal).not.toBeVisible();
    await expect(table.locator("tbody tr", { hasText: emailToDelete })).toHaveCount(0);
  });

  // =========================================================================
  // 5. LIFECYCLE: Full Create -> Read -> Update -> Delete sequential workflow
  // =========================================================================
  test("Full CRUD lifecycle: Create -> Read -> Update -> Delete in sequence", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    const table = page.getByRole("table");
    const timestamp = Date.now();
    const initialName = `Lifecycle Agent ${timestamp}`;
    const initialEmail = `lifecycle_${timestamp}@example.com`;
    const initialPassword = "initialpassword123";

    // --- 1. CREATE ---
    await page.getByRole("button", { name: "Create User" }).click();
    const createModal = page.getByRole("dialog", { name: "Create New User" });
    await expect(createModal).toBeVisible();
    await createModal.getByLabel("Name").fill(initialName);
    await createModal.getByLabel("Email").fill(initialEmail);
    await createModal.getByLabel("Password").fill(initialPassword);
    await createModal.getByRole("button", { name: "Create User" }).click();
    await expect(createModal).not.toBeVisible();

    // --- 2. READ ---
    const createdRow = table.locator("tbody tr", { hasText: initialEmail });
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText(initialName);
    await expect(createdRow).toContainText("Support Agent");
    await expect(createdRow).toContainText("Active");

    // --- 3. UPDATE ---
    await createdRow.getByRole("button", { name: "Edit user" }).click();
    const editModal = page.getByRole("dialog", { name: "Edit User" });
    await expect(editModal).toBeVisible();
    await expect(editModal.getByLabel("Name")).toHaveValue(initialName);
    await expect(editModal.getByLabel("Email")).toHaveValue(initialEmail);

    const updatedName = `Updated Lifecycle ${timestamp}`;
    const updatedEmail = `updated_lifecycle_${timestamp}@example.com`;
    await editModal.getByLabel("Name").fill(updatedName);
    await editModal.getByLabel("Email").fill(updatedEmail);
    await editModal.getByRole("button", { name: "Save Changes" }).click();
    await expect(editModal).not.toBeVisible();

    const updatedRow = table.locator("tbody tr", { hasText: updatedEmail });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText(updatedName);

    // --- 4. DELETE ---
    await updatedRow.getByRole("button", { name: "Delete user" }).click();
    const deleteModal = page.getByRole("dialog", { name: "Delete User" });
    await expect(deleteModal).toBeVisible();
    await deleteModal.getByRole("button", { name: "Delete User" }).click();
    await expect(deleteModal).not.toBeVisible();

    // Verify row is removed from table
    await expect(table.locator("tbody tr", { hasText: updatedEmail })).toHaveCount(0);
  });

  // =========================================================================
  // 6. UNASSIGN ON DELETE: Deleting an agent unassigns their assigned tickets
  // =========================================================================
  test("Deleting a user unassigns all tickets assigned to that user", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const agentName = `Assigned Agent ${timestamp}`;
    const agentEmail = `assigned_agent_${timestamp}@example.com`;
    const testSubject = `Ticket For Unassign Test ${timestamp}`;

    // 1. Ingest an unassigned ticket via webhook
    const ticketRes = await request.post("/api/webhooks/inbound-email", {
      data: {
        from: `Customer <customer_${timestamp}@example.com>`,
        to: "support@tickethelper.internal",
        subject: testSubject,
        text: "Please resolve my issue.",
      },
    });
    expect(ticketRes.status()).toBe(201);

    // 2. Admin logs in and creates a new agent
    await loginAsAdmin(page);
    await page.goto("/users");

    await page.getByRole("button", { name: "Create User" }).click();
    const createModal = page.getByRole("dialog", { name: "Create New User" });
    await expect(createModal).toBeVisible();
    await createModal.getByLabel("Name").fill(agentName);
    await createModal.getByLabel("Email").fill(agentEmail);
    await createModal.getByLabel("Password").fill("agentpass123");
    await createModal.getByRole("button", { name: "Create User" }).click();
    await expect(createModal).not.toBeVisible();

    const usersTable = page.getByRole("table");
    const userRow = usersTable.locator("tbody tr", { hasText: agentEmail });
    await expect(userRow).toBeVisible();

    // 3. Navigate to inbox and assign the ticket to this newly created agent
    await page.goto("/");
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);
    const ticketsTable = page.getByRole("table");
    const ticketRow = ticketsTable.locator("tbody tr", { hasText: testSubject });
    await expect(ticketRow).toBeVisible();

    await ticketRow.click();
    const detailModal = page.getByRole("dialog");
    await expect(detailModal).toBeVisible();

    const assigneeSelect = detailModal.getByLabel("Assigned Agent");
    await assigneeSelect.selectOption({ label: `${agentName} (agent)` });
    await detailModal.getByLabel("Close dialog").click();
    await expect(detailModal).not.toBeVisible();

    // Verify row displays the assigned agent's name
    await expect(ticketRow).toContainText(agentName);

    // 4. Return to /users and delete this agent
    await page.goto("/users");
    const agentRowToDelete = page.getByRole("table").locator("tbody tr", { hasText: agentEmail });
    await agentRowToDelete.getByRole("button", { name: "Delete user" }).click();

    const deleteModal = page.getByRole("dialog", { name: "Delete User" });
    await expect(deleteModal).toBeVisible();
    await deleteModal.getByRole("button", { name: "Delete User" }).click();
    await expect(deleteModal).not.toBeVisible();

    // 5. Navigate back to inbox and verify the ticket is now "Unassigned"
    await page.goto("/");
    await page.getByPlaceholder("Search by subject, email, or #...").fill(testSubject);
    await expect(ticketRow).toBeVisible();
    await expect(ticketRow).toContainText("Unassigned");
    await expect(ticketRow).not.toContainText(agentName);
  });
});
