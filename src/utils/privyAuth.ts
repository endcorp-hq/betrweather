// src/utils/privyAuth.ts
import { createPrivyClient } from '@privy-io/expo';
import {
  getCachedAccessToken,
  isAccessTokenValid,
  setCachedAccessToken,
  setLastSuccessfulTokenFetch,
} from './authCache';

// Privy configuration - matches App.tsx
const PRIVY_APP_ID = 'cmio2um0t0047jp0bya178xuu';
const PRIVY_CLIENT_ID = 'client-WY6TNuvrhUXFejaXaSCSWW9NzB26NpitKhh9pdABuH5e6';

// Singleton Privy client instance
let privyClientInstance: ReturnType<typeof createPrivyClient> | null = null;

/**
 * Get or create the Privy client instance (singleton pattern)
 */
export function getPrivyClient() {
  if (!privyClientInstance) {
    privyClientInstance = createPrivyClient({
      appId: PRIVY_APP_ID,
      clientId: PRIVY_CLIENT_ID,
    });
  }
  return privyClientInstance;
}

/**
 * Get Privy access token with caching
 * ALWAYS uses cached token from secure storage if valid
 * Only calls Privy's getAccessToken() when cached token is expired or missing
 * @param forceRefresh - If true, bypass cache and fetch fresh token from Privy
 * @returns Promise<string | null> - The access token or null if unavailable
 */
export async function getPrivyAccessToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    // Step 1: Always check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedToken = await getCachedAccessToken();
      const isValid = await isAccessTokenValid();
      
      if (cachedToken && isValid) {
        // Cache hit and valid - return cached token immediately (no Privy call)
        return cachedToken;
      }
      
      // If we have a cached token but it's expired, we'll fetch a new one below
      // This ensures we only call Privy when truly needed
    }

    // Step 2: Cache miss or expired - fetch fresh token from Privy
    // This is the ONLY place we call Privy's getAccessToken()
    const client = getPrivyClient();
    const token = await client.getAccessToken();
    
    if (token) {
      // Step 3: Immediately cache the new token for future use
      // This ensures subsequent API calls use the cached token
      await setCachedAccessToken(token);
      await setLastSuccessfulTokenFetch();
    }
    
    return token;
  } catch (error) {
    console.error('Failed to get Privy access token:', error);
    return null;
  }
}

/**
 * Force refresh Privy access token (bypass cache)
 * @returns Promise<string | null> - The fresh access token or null if unavailable
 */
export async function refreshPrivyAccessToken(): Promise<string | null> {
  return getPrivyAccessToken(true);
}

/**
 * React hook to get Privy access token
 * Useful for components that need reactive token access
 */
import { useState, useEffect } from 'react';

export function usePrivyAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const accessToken = await getPrivyAccessToken();
        if (mounted) {
          setToken(accessToken);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to get token'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = await getPrivyAccessToken();
      setToken(accessToken);
      return accessToken;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get token');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { token, isLoading, error, refetch };
}

