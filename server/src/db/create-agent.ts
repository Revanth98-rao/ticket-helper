import { prisma } from "./index";
import { auth } from "../auth";

async function createAgent() {
  const email = "agent@example.com";
  const password = "password123";
  const name = "Support Agent";
  const role = "agent";

  try {
    const ctx = await (auth as any).$context;
    if (!ctx?.password?.hash) {
      throw new Error("Password hasher not available");
    }
    const hashedPassword = await ctx.password.hash(password);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role, name },
      });

      const cred = existingUser.accounts.find((a) => a.providerId === "credential");
      if (cred) {
        await prisma.account.update({
          where: { id: cred.id },
          data: { password: hashedPassword },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            accountId: existingUser.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
      }
      console.log("[Success] Agent user updated successfully!");
    } else {
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
      console.log("[Success] Agent user created successfully!");
    }

    console.log("Credentials:");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${role}`);
  } catch (err) {
    console.error("Failed to create agent:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAgent();
