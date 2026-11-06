import dotenv from "dotenv";
import { prisma } from "./index";
import { auth } from "../auth";

dotenv.config();

/**
 * Reusable helper to safely upsert a user with a hashed password in Better Auth.
 */
async function upsertUser(
  ctx: any,
  email: string,
  password: string,
  name: string,
  role: "admin" | "agent",
  label: string
) {
  console.log(`[Seed] Checking database for ${label}: ${email}...`);
  const hashedPassword = await ctx.password.hash(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser) {
    console.log(`[Seed] User ${email} already exists. Updating role to '${role}'...`);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role,
        name,
      },
    });

    const credentialAccount = existingUser.accounts.find(
      (acc) => acc.providerId === "credential"
    );

    if (credentialAccount) {
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashedPassword },
      });
      console.log(`[Seed] Updated password for ${email}.`);
    } else {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          accountId: existingUser.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });
      console.log(`[Seed] Created credential account for existing user ${email}.`);
    }
  } else {
    console.log(`[Seed] Creating new account for ${email}...`);
    const userId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        role,
        emailVerified: true,
        accounts: {
          create: {
            accountId: userId,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    });
    console.log(`[Seed] ${label} successfully created with role: '${role}'!`);
  }
}

async function seed() {
  const ctx = await (auth as any).$context;
  if (!ctx?.password?.hash) {
    throw new Error("Better Auth password hashing utility is not available");
  }

  // 1. MASTER / OWNER ADMIN (Has full unrestricted permissions to create and delete users)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tickethelper.internal";
  const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";
  const adminName = process.env.ADMIN_NAME || "Super Admin";

  // 2. STANDARD SUPPORT AGENT
  const agentEmail = process.env.AGENT_EMAIL || "agent@tickethelper.internal";
  const agentPassword = process.env.AGENT_PASSWORD || "agentpassword123";
  const agentName = process.env.AGENT_NAME || "Support Agent";

  // 3. DEMO ADMIN (For recruiters/visitors: read-only access to /users, creation & deletion disabled)
  const demoAdminEmail = "demo-admin@tickethelper.internal";
  const demoAdminPassword = "demopassword123";
  const demoAdminName = "Demo Admin (Recruiter)";

  // 4. DEMO AGENT (For recruiters/visitors: support ticket handling)
  const demoAgentEmail = "demo-agent@tickethelper.internal";
  const demoAgentPassword = "demopassword123";
  const demoAgentName = "Demo Agent (Recruiter)";

  try {
    await upsertUser(ctx, adminEmail, adminPassword, adminName, "admin", "Master Admin");
    await upsertUser(ctx, agentEmail, agentPassword, agentName, "agent", "Support Agent");
    await upsertUser(ctx, demoAdminEmail, demoAdminPassword, demoAdminName, "admin", "Demo Admin");
    await upsertUser(ctx, demoAgentEmail, demoAgentPassword, demoAgentName, "agent", "Demo Agent");

    console.log(`\n[Seed] Seeding completed.`);
    console.log(`[Seed] Master Admin: ${adminEmail} (Full user management)`);
    console.log(`[Seed] Demo Admin:   ${demoAdminEmail} (Read-only user management)`);
    console.log(`[Seed] Demo Agent:   ${demoAgentEmail} (Support workspace)`);
  } catch (error) {
    console.error("[Seed] Failed to seed database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
