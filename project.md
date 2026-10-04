# TicketHelper — Project Specification

## 1. Problem Statement

Support teams receive hundreds of student support emails daily. Support agents manually read, classify, and respond to each ticket, leading to slow turnaround times, agent burnout, and generic canned responses.

---

## 2. Solution

Build an **AI-powered student ticket management system** that automatically classifies incoming tickets and drafts human-friendly, personalized responses grounded in an institutional knowledge base, while keeping human agents in control of critical decisions.

---

## 3. Core Features

- **Email Ingestion:** Inbound webhooks parse incoming emails and create or thread tickets automatically.
- **AI Ticket Classification:** Automatically classifies tickets into pre-defined categories.
- **AI Draft Generation (RAG):** Uses vector embeddings (`pgvector`) to find relevant Knowledge Base articles and draft responses.
- **AI Conversation Summarization:** Instant context summaries for multi-turn ticket threads.
- **Agent Review Workflow:** Agents review, edit, or approve AI-generated draft replies before sending.
- **Ticket Management & Triage:** Filtering, searching, and sorting tickets by status, category, and assigned agent.
- **User Management:** Internal role-based access control (Admin vs. Agent). Admins create and manage agent accounts.
- **Standalone Analytics Dashboard:** Dedicated dashboard for ticket volume, response times, and category breakdown.

---

## 4. Domain Rules & Specifications

### Ticket Statuses

- `open`
- `resolved`
- `closed`

### Ticket Categories (Single Choice)

- `general questions`
- `technical questions`
- `refund request`

### User Roles

- **Admin:** System deployment, configuration, knowledge base curation, and agent account management.
- **Agent:** Triage tickets, review/edit/send AI drafts, and update ticket status and category.

### AI Draft Policy

- All AI replies are generated strictly as **drafts** — human agents must review and approve before sending.

---

## 5. Technical Stack

- **Runtime & Package Manager:** Bun (v1.4+)
- **Backend:** Express.js + TypeScript
- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons + React Router DOM
- **Database:** PostgreSQL 16 with `pgvector` extension (Docker Compose)
- **ORM:** Prisma (`prisma@6.19.3`, `@prisma/client@6.19.3`)
- **Authentication:** Better Auth (`better-auth@1.7.6`)
  - Database-persisted sessions in PostgreSQL (`session` table)
  - `HttpOnly` session cookies (`better-auth.session_token`)
  - Public sign-up disabled (`disableSignUp: true`)
  - Roles: `admin` | `agent`
- **AI Engine:** Vercel AI SDK (`ai`) with Google Gemini 1.5 Flash/Pro
- **Documentation Tool:** Context7 (`ctx7`)

---

## 6. Testing & Quality Assurance

- **E2E Testing Framework:** Playwright (`@playwright/test`)
- **Database & Port Isolation:** All automated tests run against a dedicated PostgreSQL database (`ticket_helper_test`) on isolated test ports (Backend: `5001`, Frontend: `5174`), configured via `.env.test` to prevent collisions with the active development environment.
- **Automated Test Lifecycle:**
  - Pre-test database provisioning, Prisma migrations, and test admin seeding are automatically handled via Playwright's `globalSetup` (`scripts/setup-test-db.ts`).
  - Backend and frontend test instances are orchestrated automatically via Playwright's `webServer` configuration.
  - Shared test credentials and Prisma test utilities are standardized in `e2e/test-env.ts`.
- **Test Writing Ownership:**
  - Writing, maintaining, and updating all E2E test suites is **strictly delegated to the E2E Test Writer agent**.
  - When creating new test specifications, validating user journeys (e.g., authentication, role-based access, ticket review), or expanding test coverage, direct the task to the **E2E Test Writer agent**.
