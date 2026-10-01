---
name: auth-checker
description: Audit, test, and verify authentication (AuthN) and authorization (AuthZ) across the full stack (Better Auth, Express APIs, Prisma DB, and React route guards). Use when reviewing security, testing login/session flows, verifying RBAC, or inspecting permissions.
---

# Authentication & Authorization (AuthN/AuthZ) Checker

This skill guides the auditing, verification, and hardening of authentication and authorization mechanisms across both server-side (Express, Better Auth, Prisma) and client-side (React, Vite, React Router) components.

---

## 1. Scope of Audit

### A. Authentication (AuthN)
- **Session Lifecycle & Storage:** Validate session creation, token storage, expiration (`expiresIn`), renewal intervals (`updateAge`), and logout invalidation.
- **Cookie Security:** Ensure cookies are set with `HttpOnly`, `SameSite: "lax"` or `"strict"`, and `Secure` (in production).
- **Origin & CSRF Defense:** Verify `trustedOrigins` in Better Auth and Express `cors()` configurations strictly restrict origins (`BETTER_AUTH_TRUSTED_ORIGINS`, `CLIENT_URL`) without permissive fallbacks.
- **Signup & Credential Security:** Confirm `disableSignUp` is set if registration is invite-only/internal. Verify password strength policies and prevention of username/email enumeration in error messages.
- **Rate Limiting & Brute Force Defense:** Ensure authentication endpoints are rate-limited.

### B. Authorization (AuthZ) & Access Control
- **Role-Based Access Control (RBAC):** Check role validation on both backend endpoints and frontend views. Roles must be verified against server-side session data (`session.user.role`), never trusted from client request bodies or query parameters.
- **Route Guarding:**
  - **Server-Side:** Confirm protected endpoints execute authentication middleware (`requireAuth`) and role authorization (`requireRole`). Check middleware order (`toNodeHandler` before body parsers, auth middleware before route handlers).
  - **Client-Side:** Confirm `<ProtectedRoute>` verifies session presence, handles `isPending` state without flash of protected content, and enforces `allowedRoles`.
- **Insecure Direct Object References (IDOR):** Check Prisma queries to ensure resource retrieval and mutation filters by authenticated `userId` or administrative role.
- **Privilege Escalation:** Verify user update endpoints disallow unauthorized modification of sensitive fields (e.g., `role`, `emailVerified`).

---

## 2. Audit Workflow

1. **Discover Routes & Endpoints:**
   - Scan `server/src/index.ts` and all route handlers.
   - Catalog all endpoints into Public, Authenticated, and Role-Restricted (e.g., Admin-only).

2. **Inspect Middleware Chain:**
   - Verify `server/src/middleware/auth.ts`: Ensure `requireAuth` properly extracts and validates sessions via `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`.
   - Ensure a dedicated `requireRole(allowedRoles)` middleware exists and correctly blocks unauthorized roles with `403 Forbidden`.

3. **Inspect Better Auth Configuration:**
   - Inspect `server/src/auth.ts`: Check `trustedOrigins`, session duration, `disableSignUp`, and role extension schema.

4. **Inspect Frontend Guards:**
   - Inspect `client/src/components/ProtectedRoute.tsx` and route definitions in `App.tsx` or router configuration.

5. **Generate Audit Report:**
   - Group findings by severity: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`, and `[SECURE]`.
   - Provide concrete remediations with code snippets.
