import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type {
  SimulateEmailInput,
  UpdateTicketInput,
  ReplyTicketInput,
  PolishReplyInput,
} from "core/schemas/ticket";

export interface TicketMessageItem {
  id: string;
  senderType: "customer" | "agent" | "system";
  senderEmail: string;
  senderName: string | null;
  bodyText: string;
  bodyHtml: string | null;
  createdAt: string;
}

export interface TicketItem {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  customerEmail: string;
  customerName: string | null;
  recipientEmail: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  rawPayload?: any;
  messages?: TicketMessageItem[];
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  sort?: "newest" | "oldest";
  sortBy?: "createdAt" | "ticketNumber" | "priority" | "status" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TicketsApiResponse {
  tickets: TicketItem[];
  counts: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
  sort?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
}

export interface AssigneeItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
}

export function useAssignees() {
  return useQuery<{ assignees: AssigneeItem[] }>({
    queryKey: ["ticket-assignees"],
    queryFn: async () => {
      const response = await api.get<{ assignees: AssigneeItem[] }>("/tickets/assignees");
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useTickets(filters?: TicketFilters) {
  return useQuery<TicketsApiResponse>({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters?.assignedTo && filters.assignedTo !== "all") {
        params.append("assignedTo", filters.assignedTo);
      }
      if (filters?.search && filters.search.trim()) {
        params.append("search", filters.search.trim());
      }
      if (filters?.sort) {
        params.append("sort", filters.sort);
      }
      if (filters?.sortBy) {
        params.append("sortBy", filters.sortBy);
      }
      if (filters?.sortOrder) {
        params.append("sortOrder", filters.sortOrder);
      }
      if (filters?.page) {
        params.append("page", String(filters.page));
      }
      if (filters?.limit) {
        params.append("limit", String(filters.limit));
      }

      const response = await api.get<TicketsApiResponse>(
        `/tickets${params.toString() ? `?${params.toString()}` : ""}`
      );
      return response.data;
    },
    refetchInterval: 5000, // automatic live refresh
  });
}

export function useTicket(id: string | null | undefined) {
  return useQuery<{ ticket: TicketItem }>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      if (!id) throw new Error("No ticket ID provided");
      const response = await api.get<{ ticket: TicketItem }>(`/tickets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTicketInput;
    }) => {
      const response = await api.patch<{ success: boolean; ticket: TicketItem }>(
        `/tickets/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
    },
  });
}

export function useSimulateInboundEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SimulateEmailInput) => {
      const response = await api.post<{
        success: boolean;
        message: string;
        ticket: TicketItem;
      }>("/tickets/simulate-inbound", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useReplyTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: ReplyTicketInput;
    }) => {
      const response = await api.post<{
        success: boolean;
        message: string;
        reply: TicketMessageItem;
        ticket: TicketItem;
      }>(`/tickets/${ticketId}/reply`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
}

export function usePolishReply() {
  return useMutation({
    mutationFn: async ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: PolishReplyInput;
    }) => {
      const response = await api.post<{
        success: boolean;
        polishedText: string;
        model: string;
      }>(`/tickets/${ticketId}/polish`, data);
      return response.data;
    },
  });
}

export function useSummarizeTicket() {
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await api.post<{
        success: boolean;
        summary: string;
        model: string;
        generatedAt: string;
      }>(`/tickets/${ticketId}/summarize`);
      return response.data;
    },
  });
}


