# TicketHelper — Project Context & Current State

## 1. Application Overview
**TicketHelper** (branded as **TicketHelperStudent**) is an AI-powered student ticket management platform built with:
- **Backend:** Express + Bun + TypeScript
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS (v3) + shadcn/ui
- **Database:** PostgreSQL 16 + `pgvector` (Docker Compose) + Prisma ORM
- **Auth:** Better Auth (database sessions in PostgreSQL, public signup disabled)
- **E2E Testing:** Playwright + Isolated PostgreSQL Test Database

---

## 2. Completed Milestones

### Phase 1: Environment & Foundation
- Docker Compose configured with `pgvector/pgvector:pg16` on port `5432`.
- Database schema established with Prisma (`schema.prisma`) for `User`, `Session`, `Account`, `Verification`.
- Initial migration generated at `server/prisma/migrations/0_init/migration.sql`.
- Bun configured as runtime and package manager across root, `server/`, and `client/`.
- Root NTFS junction `prisma -> server/prisma` and root `.env` configured so Prisma CLI commands (`npx prisma studio`, `npx prisma validate`) work seamlessly from any directory.

### Phase 2: Authentication, Security & UI
- **Better Auth Backend (`server/src/auth.ts`):**
  - PostgreSQL database-persisted sessions.
  - Public registration disabled (`disableSignUp: true`).
  - Roles defined: `admin` and `agent`.
  - Dynamic trusted origins support (`BETTER_AUTH_TRUSTED_ORIGINS`, `CLIENT_URL`).
  - Express integration with `toNodeHandler(auth)` mounted *before* body parsers.
  - Session validation middleware: `requireAuth` in `server/src/middleware/auth.ts`.
  - **Environment-Aware Rate Limiting:** Enforced *only* in production (`rateLimit.enabled: process.env.NODE_ENV === "production"`), disabled in dev/test to avoid 429 throttling.
- **Admin Seeding (`server/src/db/seed.ts`):**
  - Seeded admin accounts:
    - `admin@example.com` / `password123`
    - `admin@tickethelper.internal` / `adminpassword123`
- **Backend API Friendly Root Route (`server/src/index.ts`):**
  - Friendly `GET /` JSON endpoint providing status and links to `/api/health`, `/api/auth`, and frontend URL.
- **Frontend Authentication & UI (`client/`):**
  - Better Auth React client in `src/lib/auth-client.ts`.
  - Route guarding via `ProtectedRoute.tsx`.
  - **shadcn/ui Installed & Configured:** `Card`, `Button`, `Input`, `Label`, `cn()` utility.
  - **Login Page (`client/src/pages/Login.tsx`):**
    - Refactored cleanly with shadcn components.
    - Form handling with `react-hook-form` + `zod` schema validation (`mode: "onChange"`).
    - Inline destructive validation styling and error text.
  - **Support Dashboard Preview (`client/src/pages/HomePage.tsx`):**
    - Support triage dashboard with category filtering (`general questions`, `technical questions`, `refund request`), status tabs, search, and AI draft previews.
  - **Dynamic Proxy Configuration (`client/vite.config.ts`):**
    - Dynamically reads `VITE_PORT` and `VITE_PROXY_TARGET` from environment for testing without hardcoding.

### Phase 3: Testing Infrastructure (Playwright + Isolated DB)
- **Isolated Database:** `ticket_helper_test` created on PostgreSQL with `vector` extension.
- **Test Environments:** `.env.test` and `server/.env.test` with dedicated test ports (backend: `5001`, frontend: `5174`).
- **Database Automation:**
  - `scripts/setup-test-db.ts`: Automatically provisions `ticket_helper_test`, creates pgvector extension, deploys Prisma migrations, and seeds test admin (`admin@tickethelper.internal`). Includes guards against mutating dev DB.
  - `scripts/teardown-test-db.ts`: Terminates active connections and drops test database.
- **Playwright Configuration (`playwright.config.ts`):**
  - Configured for Chromium with pre-installed browser binaries.
  - `globalSetup`: Automatically runs `setupTestDatabase()` before test suites execute.
  - `globalTeardown`: Optional teardown if `TEARDOWN_DB_AFTER_TESTS=true`.
  - `webServer`: Automatically boots isolated backend (`PORT=5001`) and frontend (`PORT=5174`) via `bun --env-file=.env.test`.
  - Helpers in `e2e/test-env.ts` (`TEST_CONFIG`, `getTestPrismaClient()`).
  - No test spec files written (pure setup & configuration per spec).
- **NPM / Bun Scripts in `package.json`:**
  - `bun run dev`: Runs server (`5000`) and client (`5173`) concurrently.
  - `bun run db:studio`: Opens Prisma Studio on development DB (`ticket_helper`).
  - `bun run test:db:studio`: Opens Prisma Studio on test DB (`ticket_helper_test`).
  - `bun run test:db:setup`: Provisions & seeds test DB manually.
  - `bun run test:db:teardown`: Drops test DB manually.
  - `bun run test:e2e`: Runs Playwright E2E suite.
  - `bun run test:e2e:ui`: Opens interactive Playwright UI runner.

---

## 3. Current System Status
- **PostgreSQL Container:** `ticket_helper_db` running on `localhost:5432`.
- **Databases:**
  - `ticket_helper`: Development database.
  - `ticket_helper_test`: Test database with migrations and seeded test admin.
- **Dev Servers:** Running concurrently (`bun run dev`):
  - Express API: `http://localhost:5000`
  - Vite SPA: `http://localhost:5173`
- **Current Admin Login:** `admin@example.com` / `password123` (or `admin@tickethelper.internal` / `adminpassword123`)

---

## 4. Next Project Phases
- **Phase 4: User Management (Admin Only):**
  - Backend endpoints to create, list, and toggle status of support `agent` accounts.
  - Role-based authorization middleware (`requireRole("admin")`).
  - Admin UI for agent invite and account management.
- **Phase 5: Ticket Model & Ingestion:**
  - Prisma schema for `Ticket`, `TicketMessage`, and `KnowledgeBaseArticle`.
  - CRUD endpoints and email webhook receiver.
- **Phase 6: AI Engine & RAG Integration:**
  - Vercel AI SDK integration with Gemini.
  - Semantic search with `pgvector` for grounded response drafting.
