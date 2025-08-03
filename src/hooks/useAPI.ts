// src/utils/useAPI.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAPI<T = any>(
  url: string,
  options?: RequestInit & { headers?: Record<string, string> },
  queryOptions?: { 
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    [key: string]: any;
  }
) {
  const queryClient = useQueryClient();

  // Use the URL and request body as the query key for uniqueness
  const queryKey = [url, options?.body, options?.headers];

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<T>({
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
    enabled: queryOptions?.enabled !== false, // Default to true if not specified
    ...queryOptions, // Spread all other React Query options
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