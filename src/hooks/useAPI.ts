// src/utils/useAPI.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useAPI<T>(
  url: string,
  options: RequestInit = {},
  config: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number | false;
    refreshTrigger?: number; // Add this parameter
  } = {}
) {
  const { enabled = true, staleTime, gcTime, refetchInterval, refreshTrigger } = config;
  const queryClient = useQueryClient();

  // Use the URL and request body as the query key for uniqueness
  const queryKey = [url, options?.body, options?.headers];

  const { data, isLoading, error, refetch, isFetching } = useQuery<T>({
    queryKey,
    queryFn: async () => {
      // Merge default headers with any provided
      const mergedHeaders = {
        ...(options?.headers || {}),
      };
      const fetchOptions: RequestInit = {
        ...options,
        headers: mergedHeaders,
      };
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    enabled,
    staleTime,
    gcTime,
    refetchInterval,
  });

  useEffect(() => {
    if (!enabled) return;
    if (refreshTrigger !== undefined) {
      refetch();
    }
  }, [enabled, refreshTrigger, refetch]);

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