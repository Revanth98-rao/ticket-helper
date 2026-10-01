# TicketHelper — Project Context & Current State

## 1. Application Overview
**TicketHelper** (branded as **TicketHelperStudent**) is an AI-powered student ticket management platform built with:
- **Backend:** Express + Bun + TypeScript
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS (v3) + shadcn/ui
- **Database:** PostgreSQL 16 + `pgvector` (Docker Compose) + Prisma ORM
- **Auth:** Better Auth (database sessions in PostgreSQL, public signup disabled)

---

## 2. Completed Milestones

### Phase 1: Environment & Foundation
- Docker Compose configured with `pgvector/pgvector:pg16` on port `5432`.
- Database schema established with Prisma (`schema.prisma`) for `User`, `Session`, `Account`, `Verification`.
- Initial migration generated at `server/prisma/migrations/0_init/migration.sql`.
- Bun configured as runtime and package manager across root, `server/`, and `client/`.

### Phase 2: Authentication & Login
- **Better Auth Backend (`server/src/auth.ts`):**
  - PostgreSQL database-persisted sessions.
  - Public registration disabled (`disableSignUp: true`).
  - Roles defined: `admin` and `agent`.
  - Dynamic trusted origins support (`BETTER_AUTH_TRUSTED_ORIGINS`, `CLIENT_URL`).
  - Express integration with `toNodeHandler(auth)` mounted *before* body parsers.
  - Session validation middleware: `requireAuth` in `server/src/middleware/auth.ts`.
- **Admin Seeding (`server/src/db/seed.ts`):**
  - Seeded admin accounts:
    - `admin@example.com` / `password123`
    - `admin@tickethelper.internal` / `adminpassword123`
- **Frontend Authentication & UI (`client/`):**
  - Better Auth React client in `src/lib/auth-client.ts`.
  - Route guarding via `ProtectedRoute.tsx`.
  - **shadcn/ui Installed & Configured:**
    - Components: `Card`, `Button`, `Input`, `Label`.
    - Utility: `src/lib/utils.ts` with `cn()` (`clsx` + `tailwind-merge`).
    - CSS variable theming in `src/index.css` and `tailwind.config.js`.
    - Path alias `@/*` configured in `tsconfig.json` and `vite.config.ts`.
  - **Login Page (`client/src/pages/Login.tsx`):**
    - Refactored cleanly with shadcn components (`Card`, `Input`, `Label`, `Button`).
    - Form handling with `react-hook-form` + `zod` schema validation.
    - Live validation mode (`mode: "onChange"`).
    - Invalid fields trigger red border (`border-destructive focus-visible:ring-destructive`) and inline error text.
    - Server error alerts with destructive alert styling.
- **Support Dashboard Preview (`client/src/pages/HomePage.tsx`):**
  - Support triage dashboard with category filtering (`general questions`, `technical questions`, `refund request`), status tabs, search, and AI draft previews.

---

## 3. Current System Status
- **PostgreSQL Container:** `ticket_helper_db` running on `localhost:5432`.
- **Dev Servers:** Running concurrently (`bun run dev`):
  - Express API: `http://localhost:5000`
  - Vite SPA: `http://localhost:5173`
- **Current Admin Login:** `admin@example.com` / `password123`

---

## 4. Next Project Phases
- **Phase 3: User Management (Admin Only):**
  - Backend endpoints to create, list, and toggle status of support `agent` accounts.
  - Role-based authorization middleware (`requireRole("admin")`).
  - Admin UI for agent invite and account management.
- **Phase 4: Ticket Model & Ingestion:**
  - Prisma schema for `Ticket`, `TicketMessage`, and `KnowledgeBaseArticle`.
  - CRUD endpoints and email webhook receiver.
- **Phase 5: AI Engine & RAG Integration:**
  - Vercel AI SDK integration with Gemini.
  - Semantic search with `pgvector` for grounded response drafting.
