import dotenv from "dotenv";
import { prisma } from "./index";
import { auth } from "../auth";

dotenv.config();

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "password123";
  const adminName = process.env.ADMIN_NAME || "Super Admin";

  console.log(`[Seed] Checking database for admin user: ${adminEmail}...`);

  try {
    // 1. Generate password hash using Better Auth's internal scrypt hasher
    const ctx = await (auth as any).$context;
    if (!ctx?.password?.hash) {
      throw new Error("Better Auth password hashing utility is not available");
    }
    const hashedPassword = await ctx.password.hash(adminPassword);

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { accounts: true },
    });

    if (existingUser) {
      console.log(`[Seed] User ${adminEmail} already exists. Updating role to 'admin'...`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: "admin",
          name: adminName,
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
        console.log(`[Seed] Updated admin password for ${adminEmail}.`);
      } else {
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            accountId: existingUser.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
        console.log(`[Seed] Created credential account for existing user ${adminEmail}.`);
      }
    } else {
      console.log(`[Seed] Creating new admin account for ${adminEmail}...`);
      const userId = crypto.randomUUID();

      await prisma.user.create({
        data: {
          id: userId,
          email: adminEmail,
          name: adminName,
          role: "admin",
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
      console.log(`[Seed] Admin user successfully created with role: 'admin'!`);
    }

    // --- SEED AGENT USER ---
    const agentEmail = process.env.AGENT_EMAIL || "agent@tickethelper.internal";
    const agentPassword = process.env.AGENT_PASSWORD || "agentpassword123";
    const agentName = process.env.AGENT_NAME || "Support Agent";

    console.log(`\n[Seed] Checking database for agent user: ${agentEmail}...`);
    const hashedAgentPassword = await ctx.password.hash(agentPassword);

    const existingAgent = await prisma.user.findUnique({
      where: { email: agentEmail },
      include: { accounts: true },
    });

    if (existingAgent) {
      console.log(`[Seed] User ${agentEmail} already exists. Updating role to 'agent'...`);
      await prisma.user.update({
        where: { id: existingAgent.id },
        data: {
          role: "agent",
          name: agentName,
        },
      });

      const credentialAccount = existingAgent.accounts.find(
        (acc) => acc.providerId === "credential"
      );

      if (credentialAccount) {
        await prisma.account.update({
          where: { id: credentialAccount.id },
          data: { password: hashedAgentPassword },
        });
        console.log(`[Seed] Updated agent password for ${agentEmail}.`);
      } else {
        await prisma.account.create({
          data: {
            userId: existingAgent.id,
            accountId: existingAgent.id,
            providerId: "credential",
            password: hashedAgentPassword,
          },
        });
        console.log(`[Seed] Created credential account for existing user ${agentEmail}.`);
      }
    } else {
      console.log(`[Seed] Creating new agent account for ${agentEmail}...`);
      const agentId = crypto.randomUUID();

      await prisma.user.create({
        data: {
          id: agentId,
          email: agentEmail,
          name: agentName,
          role: "agent",
          emailVerified: true,
          accounts: {
            create: {
              accountId: agentId,
              providerId: "credential",
              password: hashedAgentPassword,
            },
          },
        },
      });
      console.log(`[Seed] Agent user successfully created with role: 'agent'!`);
    }

    console.log(`\n[Seed] Seeding completed.`);
    console.log(`[Seed] Credentials:`);
    console.log(`       Admin Email: ${adminEmail}`);
    console.log(`       Agent Email: ${agentEmail}`);
  } catch (error) {
    console.error("[Seed] Failed to seed database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
