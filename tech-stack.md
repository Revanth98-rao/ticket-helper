# Tech Stack

## Frontend
- **Framework:** Next.js 15 (React 19, TypeScript, App Router)
- **Styling:** Tailwind CSS
- **Component Library:** shadcn/ui (accessible Radix UI primitives)
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Server State & Caching:** TanStack React Query (`@tanstack/react-query`)

## Backend
- **Runtime & API:** Next.js Server Components, Server Actions & Route Handlers (Node.js)
- **Authentication:** Database-backed sessions
  - Stored in PostgreSQL `sessions` table
  - Stateful session validation with instant revocation on logout or agent deactivation
  - Role-Based Access Control (Admin vs. Agent)
- **Validation:** Zod (runtime validation for forms, API routes, and AI outputs)

## Database
- **Database:** PostgreSQL with `pgvector` extension
- **Role:** Handles relational application data (users, sessions, tickets, messages) and vector embeddings for semantic search in a single database

## ORM
- **Tool:** Drizzle ORM
- **Role:** Type-safe SQL queries, schema migrations, and native vector column operations

## AI
- **SDK:** Vercel AI SDK (`ai`)
- **Models:** Google Gemini 1.5 Flash/Pro (or OpenAI GPT-4o-mini/4o)
- **Capabilities:**
  - Automated ticket classification (`general questions`, `technical questions`, `refund request`)
  - Conversation thread summarization
  - RAG-powered draft reply generation grounded in Knowledge Base articles

## Email
- **Provider:** Resend (or Postmark)
- **Inbound:** Webhook endpoint (`/api/webhooks/email`) to ingest incoming student emails and map replies to existing ticket threads
- **Outbound:** Deliver agent-approved email replies to students with proper email threading headers (`In-Reply-To`, `References`)

## Deployment
- **Local Environment:** Docker Compose running `pgvector/pgvector:pg16`
- **Application Deployment:** Deployed within the admin's infrastructure (Docker containerized Node.js app or cloud host like Vercel/Railway connected to managed PostgreSQL)
