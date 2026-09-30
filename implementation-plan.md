# Implementation Plan

## Phase 1: Project Setup

- [x] Initialize Bun workspace with Express backend (`server/`) and React + Vite frontend (`client/`)
- [x] Configure TypeScript, Tailwind CSS, and Lucide icons in `client/`
- [x] Configure `docker-compose.yml` with PostgreSQL and `pgvector`
- [x] Set up Drizzle ORM and PostgreSQL connection in `server/`
- [x] Configure root `package.json` with unified Bun dev scripts (`bun run dev`) and `.env.example`

## Phase 2: Authentication

- [ ] Create `users` and `sessions` database schema in Drizzle
- [ ] Implement password hashing (Argon2id/bcrypt)
- [ ] Implement database-backed sessions with secure `HttpOnly` cookies in Express
- [ ] Build Express authentication middleware and RBAC guards (`requireAuth`, `requireAdmin`)
- [ ] Build React login page (`/login`) and admin seed script (`bun run db:seed`)

## Phase 3: User Management

- [ ] Build React admin layout and role-based route guard
- [ ] Build Express API endpoints for agent listing, creation, and deactivation
- [ ] Build React agent management page (`/admin/users`) with "Add Agent" modal
- [ ] Implement activate/deactivate toggle for agent accounts
- [ ] Implement instant session revocation on agent deactivation

## Phase 4: Ticket CRUD

- [ ] Create `tickets` and `messages` database schema
  - Statuses: `open`, `resolved`, `closed`
  - Categories: `general questions`, `technical questions`, `refund request`
- [ ] Build Express REST API for tickets and messages (list, filter, sort, detail, update status/category)
- [ ] Build React ticket list view (`/tickets`) with status and category badges
- [ ] Implement filtering (status, category), sorting, and search in React UI
- [ ] Build ticket detail view (`/tickets/:id`) with conversation timeline and reply composer

## Phase 5: Features

- [ ] Build Knowledge Base CRUD API and React admin management UI
- [ ] Generate and store vector embeddings in PostgreSQL using `pgvector`
- [ ] Implement AI ticket classification (`general questions`, `technical questions`, `refund request`)
- [ ] Implement AI conversation thread summarization
- [ ] Implement RAG-grounded draft reply generator with human-in-the-loop review composer

## Phase 6: Email Integration

- [ ] Build inbound email webhook endpoint (`/api/webhooks/email`) in Express
- [ ] Implement email threading and conversation mapping (`In-Reply-To`, `References`, subject ticket ID)
- [ ] Auto-trigger AI classification and draft generation on new inbound emails
- [ ] Implement outbound email delivery for agent-approved replies
- [ ] Add spam filter and auto-reply / bounce loop protection

## Phase 7: Dashboard

- [ ] Build KPI cards (Total Tickets, Open Tickets, Resolved Today, Avg Response Time)
- [ ] Add category distribution chart (`general questions`, `technical questions`, `refund request`)
- [ ] Add ticket volume trends chart (incoming vs. resolved)
- [ ] Add agent workload and active session overview
- [ ] Add priority queue shortcuts and recent activity feed

## Phase 8: Polish and Deployment

- [ ] Conduct end-to-end testing of the complete ticket lifecycle
- [ ] Perform security and role boundary audit
- [ ] Add error boundaries, rate limiting, and edge-case handling
- [ ] Create production Dockerfile and deployment configuration
- [ ] Document admin bootstrap runbook

# Implementation Plan

## Phase 1: Project Setup

- [ ] Initialize Next.js 15 project with TypeScript, Tailwind CSS, and App Router
- [ ] Set up `shadcn/ui` components and `lucide-react`
- [ ] Configure `docker-compose.yml` with PostgreSQL and `pgvector`
- [ ] Configure Drizzle ORM and database connection
- [ ] Set up environment variables and `.env.example` validation

## Phase 2: Authentication

- [ ] Create `users` and `sessions` database schema
- [ ] Implement password hashing (Argon2id/bcrypt)
- [ ] Implement database-backed sessions with secure `HttpOnly` cookies
- [ ] Add auth middleware and session verification for protected routes
- [ ] Build login page (`/login`) and admin seed script (`npm run db:seed`)

## Phase 3: User Management

- [ ] Build admin dashboard layout and role-based route guard
- [ ] Create agent listing page (`/admin/users`)
- [ ] Create "Add Agent" modal/form
- [ ] Implement activate/deactivate toggle for agent accounts
- [ ] Implement instant session revocation on agent deactivation

## Phase 4: Ticket CRUD

- [ ] Create `tickets` and `messages` database schema
  - Statuses: `open`, `resolved`, `closed`
  - Categories: `general questions`, `technical questions`, `refund request`
- [ ] Build ticket list view (`/dashboard/tickets`) with status and category badges
- [ ] Implement filtering (status, category), sorting, and search
- [ ] Build ticket detail view (`/dashboard/tickets/[id]`) with conversation timeline
- [ ] Implement ticket status and category update actions

## Phase 5: Features

- [ ] Build Knowledge Base CRUD interface for admins
- [ ] Generate and store vector embeddings in PostgreSQL using `pgvector`
- [ ] Implement AI ticket classification (`general questions`, `technical questions`, `refund request`)
- [ ] Implement AI conversation thread summarization
- [ ] Implement RAG-grounded draft reply generator with human-in-the-loop review composer

## Phase 6: Email Integration

- [ ] Build inbound email webhook endpoint (`/api/webhooks/email`)
- [ ] Implement email threading and conversation mapping (`In-Reply-To`, `References`, subject ticket ID)
- [ ] Auto-trigger AI classification and draft generation on new inbound emails
- [ ] Implement outbound email delivery for agent-approved replies
- [ ] Add spam filter and auto-reply / bounce loop protection

## Phase 7: Dashboard

- [ ] Build KPI cards (Total Tickets, Open Tickets, Resolved Today, Avg Response Time)
- [ ] Add category distribution chart (`general questions`, `technical questions`, `refund request`)
- [ ] Add ticket volume trends chart (incoming vs. resolved)
- [ ] Add agent workload and active session overview
- [ ] Add priority queue shortcuts and recent activity feed

## Phase 8: Polish and Deployment

- [ ] Conduct end-to-end testing of the complete ticket lifecycle
- [ ] Perform security and role boundary audit
- [ ] Add error boundaries, rate limiting, and edge-case handling
- [ ] Create production Dockerfile and deployment configuration
- [ ] Document admin bootstrap runbook
