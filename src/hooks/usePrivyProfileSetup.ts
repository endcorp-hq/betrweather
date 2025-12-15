// src/hooks/usePrivyProfileSetup.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/expo";
import { useQueryClient } from "@tanstack/react-query";
import { getPrivyAccessToken } from "../utils/privyAuth";
import { apiClient } from "../utils/apiClient";
import { storeUserData } from "../utils/userStorage";
import { useToast } from "@/contexts";
import type { User } from "../utils/userStorage";
import {
  setCachedPrivyUserId,
  setCachedAuthState,
  setCachedAccessToken,
  clearAuthCache,
} from "../utils/authCache";

interface ProfileSetupData {
  email: string;
  walletAddress: string;
  name?: string;
}

/**
 * Login with backend using Privy access token
 */
async function loginWithBackend(data: ProfileSetupData): Promise<User> {
  const accessToken = await getPrivyAccessToken();

  if (!accessToken) {
    console.error("No Privy access token available");
    throw new Error(
      "No Privy access token available. Please try logging in again."
    );
  }

  console.log(
    "Calling /auth/login with Privy token, wallet:",
    data.walletAddress,
    "email:",
    data.email,
    "name:",
    data.name || "none"
  );

  try {
    // Build request body - include name if provided, otherwise omit it
    const requestBody: any = {
      email: data.email,
      walletAddress: data.walletAddress,
    };
    
    // Only add name if it's provided and not empty
    if (data.name && data.name.trim().length > 0) {
      requestBody.name = data.name.trim();
    }

    const response = await apiClient.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend login failed:", response.status, errorText);
      let errorMessage = "Login failed";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Handle different response formats: {data: {...}}, {user: {...}}, or direct user object
    const user = result.data || result.user || result;
    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Privy authentication failed")
    ) {
      console.error(
        "Privy authentication failed - token might be invalid or backend not configured"
      );
      throw new Error("Authentication failed. Please try logging in again.");
    }
    throw error;
  }
}

/**
 * Extract user information from Privy user object
 */
function extractUserInfo(privyUser: any): {
  email: string | null;
  name: string | null;
  walletAddress: string | null;
} {
  let email: string | null = null;
  let name: string | null = null;
  let walletAddress: string | null = null;

  // Extract email from linked accounts
  const emailAccount = privyUser?.linked_accounts?.find(
    (account: any) => account.type === "email"
  );
  if (emailAccount) {
    email = emailAccount.address || null;
  }

  // Extract name from OAuth accounts (Google, X, etc.)
  const oauthAccounts = privyUser?.linked_accounts?.filter(
    (account: any) =>
      account.type?.includes("oauth") ||
      account.type === "google_oauth" ||
      account.type === "twitter_oauth"
  );
  if (oauthAccounts && oauthAccounts.length > 0) {
    const oauthAccount = oauthAccounts[0];
    name = oauthAccount.name || oauthAccount.username || null;
    if (!email && oauthAccount.email) {
      email = oauthAccount.email;
    }
  }

  // Extract wallet address from embedded wallet
  const walletAccount = privyUser?.linked_accounts?.find(
    (account: any) =>
      account.type === "wallet" || account.walletClientType === "privy"
  );
  if (walletAccount) {
    walletAddress = walletAccount.address || null;
  }

  // Fallback: check if user has embedded wallet directly
  if (!walletAddress && privyUser?.wallet?.address) {
    walletAddress = privyUser.wallet.address;
  }

  return { email, name, walletAddress };
}

/**
 * Hook to handle post-login profile setup
 * Simple flow: Privy login -> Backend login (with email, wallet, name if available) -> Complete
 */
export function usePrivyProfileSetup() {
  const { user: privyUser, isReady } = usePrivy();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const hasShownSuccessToastRef = useRef<string | null>(null); // Track which user we've shown toast for

  /**
   * Main flow: login to backend with available info and complete setup
   */
  const handleProfileSetup = useCallback(async () => {
    if (!privyUser || !isReady) {
      return;
    }

    // Extract info from Privy
    const extracted = extractUserInfo(privyUser);
    
    // Validate we have email and wallet (required)
    if (!extracted.email || !extracted.walletAddress) {
      const errorMsg = "Missing required information. Please try logging in again.";
      setSetupError(errorMsg);
      toast.error("Login Error", errorMsg);
      return;
    }

    setIsLoading(true);
    setSetupError(null);

    try {
      const user = await loginWithBackend({
        email: extracted.email,
        walletAddress: extracted.walletAddress,
        name: extracted.name || undefined, // Include name if available, otherwise omit
      });

      // Store user data and complete setup
      await storeUserData(user);
      queryClient.setQueryData(["user", extracted.walletAddress], user);
      setIsSetupComplete(true);
      setCurrentUserId(privyUser.id);
      
      // Cache auth state for fast subsequent launches
      try {
        // Get and cache access token
        const accessToken = await getPrivyAccessToken();
        if (accessToken) {
          await setCachedAccessToken(accessToken);
        }
        
        // Cache Privy user ID and auth state
        await setCachedPrivyUserId(privyUser.id);
        await setCachedAuthState({ lastAuthState: 'authenticated' });
      } catch (cacheError) {
        console.error("Error caching auth state:", cacheError);
        // Don't fail login if caching fails
      }
      
      // Only show success toast once per user session
      if (hasShownSuccessToastRef.current !== privyUser.id) {
        hasShownSuccessToastRef.current = privyUser.id;
        toast.success("Welcome!", "Login successful");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to complete login";
      console.error("Error in handleProfileSetup:", error);
      setSetupError(message);
      setIsSetupComplete(false);
      toast.error("Login Failed", message);
    } finally {
      setIsLoading(false);
    }
  }, [privyUser, isReady, queryClient, toast]);

  /**
   * Trigger profile setup when Privy user becomes available
   * Only runs once per user - once setup is complete, never runs again
   */
  useEffect(() => {
    // Reset state when user logs out
    if (!privyUser || !isReady) {
      setIsSetupComplete(false);
      setSetupError(null);
      setCurrentUserId(null);
      setIsLoading(false);
      hasShownSuccessToastRef.current = null; // Reset toast tracking
      // Clear auth cache on logout
      clearAuthCache().catch((err) => {
        console.error("Error clearing auth cache on logout:", err);
      });
      return;
    }

    const userId = privyUser.id;

    // If we've already completed setup for this user, NEVER run again
    if (currentUserId === userId && isSetupComplete) {
      return;
    }

    // If we're already processing this user, don't start again
    if (isLoading && currentUserId === userId) {
      return;
    }

    // Only start setup if:
    // 1. This is a new user (currentUserId !== userId)
    // 2. OR setup is not complete for this user
    // 3. AND we're not currently loading
    if (currentUserId !== userId || !isSetupComplete) {
      if (currentUserId !== userId) {
        setCurrentUserId(userId);
      }
      handleProfileSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privyUser?.id, isReady]); // Only depend on user ID and ready state

  return {
    isSetupComplete,
    isLoading,
    setupError,
  };
}
