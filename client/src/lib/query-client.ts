import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes fresh cache
      gcTime: 1000 * 60 * 10, // 10 minutes cache retention
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
