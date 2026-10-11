import { auth } from "./src/auth";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:postgrespassword@localhost:5432/ticket_helper_test" }
  }
});

async function main() {
  try {
    const ctx = await (auth as any).$context;
    // Explicitly use the agent password from env or default
    const agentPassword = process.env.AGENT_PASSWORD || "agentpassword123";
    const newHash = await ctx.password.hash(agentPassword);
    
    await prisma.account.updateMany({
      where: { 
        user: { email: "agent@tickethelper.internal" },
        providerId: "credential"
      },
      data: {
        password: newHash
      }
    });
    
    console.log("Successfully hashed and updated password for agent@tickethelper.internal");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
