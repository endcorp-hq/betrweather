// src/utils/useAPI.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAPI<T = any>(url: string, options?: RequestInit) {
  const queryClient = useQueryClient();

  // Use the URL as the query key for uniqueness
  const queryKey = [url];

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<T>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
  });

  // Invalidate this query
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    invalidate,
  };
}