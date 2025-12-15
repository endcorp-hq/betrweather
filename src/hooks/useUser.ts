import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
// import { useAuthorization } from "./solana/useAuthorization";
import { apiClient } from "../utils/apiClient";
import {
  User,
  storeUserData,
  getUserData,
  clearUserData,
} from "../utils/userStorage";
import { getJWTTokens } from "../utils/authUtils";
import { STORAGE_KEYS } from "../utils/constants";
import { usePrivy } from "@privy-io/expo";

/**
 * Extract wallet address from Privy user
 */
function getPrivyWalletAddress(privyUser: any): string | null {
  // Check linked accounts for wallet
  const walletAccount = privyUser?.linked_accounts?.find(
    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
  );
  if (walletAccount?.address) {
    return walletAccount.address;
  }
  
  // Fallback: check if user has embedded wallet directly
  if (privyUser?.wallet?.address) {
    return privyUser.wallet.address;
  }
  
  return null;
}

export function useUser() {
  const { user: privyUser, isReady } = usePrivy();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRefetchOnMount, setShouldRefetchOnMount] = useState(true);

  // Get wallet address from Privy user
  const walletAddress = privyUser ? getPrivyWalletAddress(privyUser) : null;
  // Get JWT tokens (still needed for /users/profile endpoint which uses JWT)
  const { data: jwtTokens, isLoading: isCheckingTokens } = useQuery({
    queryKey: [STORAGE_KEYS.JWT_TOKENS],
    queryFn: getJWTTokens,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize from storage on mount
  useEffect(() => {
    const initializeUser = async () => {
      if (jwtTokens && walletAddress) {
        const storedUser = await getUserData();
        if (storedUser) {
          queryClient.setQueryData(
            ["user", walletAddress],
            storedUser
          );
        }
        setIsInitialized(true);
      }
    };
    initializeUser();
  }, [walletAddress, queryClient, jwtTokens]);

  // Fetch user data - always fetch fresh data on initial load
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user", walletAddress],
    queryFn: async (): Promise<User | null> => {
      if (!walletAddress || !jwtTokens?.accessToken) {
        return null;
      }
      
      try {
        const response = await apiClient.request(
          `/users/profile?walletAddress=${walletAddress}`,
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
    enabled: !!(jwtTokens && walletAddress && isInitialized && isReady),
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
      queryClient.setQueryData(["user", walletAddress], userData);
      // Update AsyncStorage
      await storeUserData(userData);
    },
    [queryClient, walletAddress]
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
