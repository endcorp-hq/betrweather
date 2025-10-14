import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorization } from "./solana/useAuthorization";
import { apiClient } from "../utils/apiClient";
import {
  User,
  storeUserData,
  getUserData,
  clearUserData,
} from "../utils/userStorage";
import { getJWTTokens } from "../utils/authUtils";
import { STORAGE_KEYS } from "../utils/constants";

export function useUser() {
  const { selectedAccount } = useAuthorization();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRefetchOnMount, setShouldRefetchOnMount] = useState(true);

  // Get JWT tokens
  const { data: jwtTokens, isLoading: isCheckingTokens } = useQuery({
    queryKey: [STORAGE_KEYS.JWT_TOKENS],
    queryFn: getJWTTokens,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize from storage on mount
  useEffect(() => {
    const initializeUser = async () => {
      if (jwtTokens && selectedAccount) {
        const storedUser = await getUserData();
        if (storedUser) {
          queryClient.setQueryData(
            ["user", selectedAccount.address],
            storedUser
          );
        }
        setIsInitialized(true);
      }
    };
    initializeUser();
  }, [selectedAccount, queryClient, jwtTokens]);

  // Fetch user data - always fetch fresh data on initial load
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user", selectedAccount?.address],
    queryFn: async (): Promise<User | null> => {
      if (!selectedAccount || !jwtTokens?.accessToken) {
        return null;
      }
      
      try {
        const response = await apiClient.request(
          `/users/profile?walletAddress=${selectedAccount.publicKey.toBase58()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${jwtTokens.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        
        // Handle the API response structure
        if (data.data === null) {
          console.warn("User not found in backend");
          return await getUserData(); // Fallback to stored data
        }

        const userData = data.data || data; // Handle both response structures

        // Store user data in AsyncStorage
        await storeUserData(userData);

        return userData;
      } catch (error) {
        console.error("Error fetching user:", error);
        // Fallback to stored data
        return await getUserData();
      }
    },
    enabled: !!(jwtTokens && selectedAccount && isInitialized),
    staleTime: shouldRefetchOnMount ? 0 : 5 * 60 * 1000, // Force refetch on initial load
    gcTime: 10 * 60 * 1000,
  });

  // Reset the refetch flag after first successful fetch
  useEffect(() => {
    if (user && shouldRefetchOnMount) {
      setShouldRefetchOnMount(false);
    }
  }, [user, shouldRefetchOnMount]);

  // Update user data in both cache and storage
  const updateUserData = useCallback(
    async (userData: User) => {
      // Update React Query cache
      queryClient.setQueryData(["user", selectedAccount?.address], userData);
      // Update AsyncStorage
      await storeUserData(userData);
    },
    [queryClient, selectedAccount?.address]
  );

  // Clear user data from both cache and storage
  const clearUserDataFromCache = useCallback(async () => {
    // Clear from React Query cache
    queryClient.removeQueries({ queryKey: ["user"] });
    // Clear from AsyncStorage
    await clearUserData();
  }, [queryClient]);

  // Force refetch function that resets the stale time
  const forceRefetch = useCallback(async () => {
    setShouldRefetchOnMount(true);
    return await refetch();
  }, [refetch]);

  return {
    user,
    isLoading: isLoading || isCheckingTokens,
    error,
    refetch: forceRefetch, // Use the force refetch function
    updateUserData,
    clearUserData: clearUserDataFromCache,
  };
}
