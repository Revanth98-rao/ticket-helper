---
name: data-fetching
description: Standards and guidelines for frontend data fetching and API communication using Axios and React Query (TanStack Query). Use whenever building or modifying frontend data-fetching logic, API clients, caching, or mutations.
---

# Frontend Data Fetching: Axios & React Query Guidelines

This document defines the mandatory architectural standard for client-side HTTP communication, data fetching, and server state management in the TicketHelper platform.

---

## 1. Core Mandate

All client-side API requests and server-state management in the frontend (`client/`) MUST use:

1. **Axios** as the exclusive HTTP client library.
2. **TanStack React Query (`@tanstack/react-query`)** as the server state management and caching layer.

> [!IMPORTANT]
> Do NOT use raw `fetch` or manual `useEffect` + `useState` for API data fetching in components. Always wrap API requests in React Query hooks using a configured Axios instance.

---

## 2. Axios Architecture & Configuration

### A. Centralized Axios Instance

All API requests must go through a centralized Axios client (`client/src/lib/axios.ts` or `client/src/lib/api.ts`):

- **Base URL:** `/api`
- **Credentials:** `withCredentials: true` is strictly required so Better Auth `HttpOnly` session cookies (`better-auth.session_token`) are sent with every request.
- **Headers:** Default `Content-Type: application/json`.
- **Interceptors:**
  - Standardize error extraction so `error.response?.data?.message || error.response?.data?.error || error.message` is returned cleanly.
  - Automatically handle `401 Unauthorized` responses by redirecting to `/login` when sessions expire.

```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected network error occurred";
    return Promise.reject(new Error(message));
  },
);
```

---

## 3. React Query (TanStack Query) Guidelines

### A. Query Client Configuration

The global `QueryClient` (`client/src/lib/query-client.ts`) governs caching policies:

- `staleTime: 1000 * 60 * 2` (2 minutes fresh cache)
- `gcTime: 1000 * 60 * 10` (10 minutes garbage collection retention)
- `retry: 1`
- `refetchOnWindowFocus: false`

### B. Custom Hooks Pattern

Every resource or domain entity must have dedicated React Query hooks in `client/src/hooks/`:

1. **Queries (`useQuery`):**
   - Define structured, hierarchical query keys: `["users", { role }]`, `["tickets", { status, category }]`.
   - Pass query parameters cleanly through Axios.
   - Return typed responses.

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export function useUsers(role: "all" | "admin" | "agent" = "all") {
  return useQuery({
    queryKey: ["users", { role }],
    queryFn: async () => {
      const params = role !== "all" ? { role } : {};
      const { data } = await api.get<UsersApiResponse>("/users", { params });
      return data;
    },
  });
}
```

2. **Mutations (`useMutation`):**
   - For POST, PATCH, PUT, and DELETE operations.
   - Always invalidate relevant queries on success using `queryClient.invalidateQueries({ queryKey: [...] })`.
   - Implement optimistic updates where appropriate for instant UI feedback.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newUser: CreateUserInput) => {
      const { data } = await api.post("/users", newUser);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

---

## 4. Component Implementation Rules

1. **Declarative State:** Use `isLoading`, `isFetching`, `isRefetching`, and `error` provided directly by React Query. Do not maintain separate redundant `useState` flags for loading or errors.
2. **Refetching & Refresh:** Use `refetch()` for manual user-triggered refreshes.
3. **Instant Filtering:** For instantaneous UI search filtering on small datasets, use `useMemo` over the query result. For large paginated datasets, pass filter/search terms to query keys.
4. **DevTools:** Keep `<ReactQueryDevtools initialIsOpen={false} />` enabled in development for cache inspection and query debugging.
