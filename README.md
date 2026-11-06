# TicketHelper — AI-Powered Student Support & Helpdesk Workspace

[![CI](https://github.com/Revanth98-rao/ticket-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/Revanth98-rao/ticket-helper/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Bun](https://img.shields.io/badge/Bun-000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)](https://railway.app/)

> An enterprise-grade, fullstack customer support helpdesk featuring **Google Gemini 3.5 AI ticket classification**, **tone-polishing assistants**, **knowledge base auto-resolution**, and **Better Auth RBAC**.

---

## 🚀 Live Demo & Recruiter Quick-Access

- **Live URL:** **[https://ticket-helper-production.up.railway.app](https://ticket-helper-production.up.railway.app)**

### Instant 1-Click Access (No Typing Required)
On the live login page, you can access the system in one click:
- **`[ 👑 Demo Admin ]`** — One-click login into the full workspace. Inspect tickets, test AI polish, and view the User Directory (`/users`). *(Note: User creation and deletion are locked in Demo Mode to protect the portfolio database).*
- **`[ 🎧 Demo Agent ]`** — One-click login to experience the support workflow, ticket triage, and AI customer replies.

| Account Type | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Demo Admin** | `demo-admin@tickethelper.internal` | `demopassword123` | Full workspace + Read-Only `/users` |
| **Demo Agent** | `demo-agent@tickethelper.internal` | `demopassword123` | Ticket Queue & AI Assistant |
| **Workspace Owner** | *Private Admin Credentials* | *Configured in `.env`* | Full administrative powers (Create & Delete Users) |

---

## ✨ Key Features

- **🤖 Automated AI Ticket Classification:** Analyzes inbound support tickets in real-time using Google Gemini, extracting category, sentiment, priority, and urgency level.
- **✨ AI Polish & Tone Refinement:** Refines support agent drafts into polite, empathetic responses with automated recipient greeting and signature insertion.
- **📚 10-Point Knowledge Base Auto-Resolver:** Automatically scans tickets against a structured student knowledge base to resolve common inquiries (refund policies, deadlines, certificate access) while escalating legal or security risks.
- **🛡️ Better Auth RBAC Security:** Role-based access control protecting administrative endpoints and routes, with production-grade session management.
- **✉️ Dual-Mode Outbound Emailing:** Dispatches replies directly to customer inboxes via direct Gmail SMTP (`nodemailer`) with fallback to SendGrid and Resend.
- **⚡ Bun & React 19 Unified Stack:** Ultra-fast bundling, lightweight API layer, and real-time UI updates powered by TanStack Query.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, React Router v7.
- **Backend:** Express, Node.js / Bun runtime, Better Auth.
- **Database & ORM:** PostgreSQL, Prisma ORM, pgvector.
- **Background Jobs:** PG-Boss (Postgres-native transactional queue).
- **Deployment & CI:** Docker multi-stage container, Railway cloud hosting, GitHub Actions CI.

---

## 💻 Local Development Setup

### 1. Prerequisites
- [Bun](https://bun.sh/) (v1.2+) or Node.js (v20+)
- PostgreSQL (v15+) or Docker

### 2. Clone and Install
```bash
git clone git@github.com:Revanth98-rao/ticket-helper.git
cd ticket-helper
bun install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/ticket_helper
BETTER_AUTH_SECRET=your-random-32-char-secret-key-here
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
ADMIN_EMAIL=admin@tickethelper.internal
ADMIN_PASSWORD=adminpassword123
```

### 4. Database Setup & Seeding
```bash
bun run db:migrate
bun run db:seed
bun run db:seed:tickets
```

### 5. Start Development Server
```bash
bun run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 🧪 Running Tests

The test suite covers unit logic, AI schema validations, knowledge base auto-resolution rules, and background queue resiliency:

```bash
bun test
```

---

## 👤 Author

**Revanth Rao**
- GitHub: [@Revanth98-rao](https://github.com/Revanth98-rao)
