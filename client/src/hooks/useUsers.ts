import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersApiResponse {
  users: UserItem[];
  counts: {
    total: number;
    admin: number;
    agent: number;
  };
}

export async function fetchUsersApi(role: "all" | "admin" | "agent" = "all"): Promise<UsersApiResponse> {
  const params = new URLSearchParams();
  if (role !== "all") {
    params.append("role", role);
  }

  const url = `/api/users${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Access forbidden: Admin privileges required to view users.");
    }
    if (response.status === 401) {
      throw new Error("Unauthorized: Please sign in again.");
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Failed to load users");
  }

  return response.json();
}

export function useUsers(role: "all" | "admin" | "agent" = "all") {
  return useQuery({
    queryKey: ["users", { role }],
    queryFn: () => fetchUsersApi(role),
  });
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await api.post<{ user: UserItem; message: string }>("/users", input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
