// src/utils/authCache.ts
import * as SecureStore from 'expo-secure-store';

// Storage keys
const STORAGE_KEYS = {
  PRIVY_USER_ID: 'privy_user_id',
  ACCESS_TOKEN: 'access_token',
  TOKEN_EXPIRES_AT: 'token_expires_at',
  LAST_SUCCESSFUL_TOKEN_FETCH: 'last_successful_token_fetch',
  LAST_AUTH_STATE: 'last_auth_state',
} as const;

// Constants
const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_LIFETIME_DAYS = 30;
const HEURISTIC_SAFE_DAYS = 25; // Check before actual expiration
const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer

export type AuthState = 'authenticated' | 'unauthenticated';

export interface CachedAuthState {
  privyUserId: string | null;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  lastSuccessfulTokenFetch: number | null;
  lastAuthState: AuthState | null;
}

/**
 * Get all cached auth state
 */
export async function getCachedAuthState(): Promise<CachedAuthState> {
  try {
    const [
      privyUserId,
      accessToken,
      tokenExpiresAtStr,
      lastFetchStr,
      lastAuthState,
    ] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.PRIVY_USER_ID),
      SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT),
      SecureStore.getItemAsync(STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH),
      SecureStore.getItemAsync(STORAGE_KEYS.LAST_AUTH_STATE),
    ]);

    return {
      privyUserId,
      accessToken,
      tokenExpiresAt: tokenExpiresAtStr ? parseInt(tokenExpiresAtStr, 10) : null,
      lastSuccessfulTokenFetch: lastFetchStr ? parseInt(lastFetchStr, 10) : null,
      lastAuthState: (lastAuthState as AuthState) || null,
    };
  } catch (error) {
    console.error('Error reading auth cache:', error);
    return {
      privyUserId: null,
      accessToken: null,
      tokenExpiresAt: null,
      lastSuccessfulTokenFetch: null,
      lastAuthState: null,
    };
  }
}

/**
 * Set cached auth state
 */
export async function setCachedAuthState(state: Partial<CachedAuthState>): Promise<void> {
  try {
    const promises: Promise<void>[] = [];

    if (state.privyUserId !== undefined) {
      if (state.privyUserId) {
        promises.push(SecureStore.setItemAsync(STORAGE_KEYS.PRIVY_USER_ID, state.privyUserId));
      } else {
        promises.push(SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVY_USER_ID));
      }
    }

    if (state.accessToken !== undefined) {
      if (state.accessToken) {
        promises.push(SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, state.accessToken));
      } else {
        promises.push(SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN));
      }
    }

    if (state.tokenExpiresAt !== undefined) {
      if (state.tokenExpiresAt) {
        promises.push(
          SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT, state.tokenExpiresAt.toString())
        );
      } else {
        promises.push(SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT));
      }
    }

    if (state.lastSuccessfulTokenFetch !== undefined) {
      if (state.lastSuccessfulTokenFetch) {
        promises.push(
          SecureStore.setItemAsync(
            STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH,
            state.lastSuccessfulTokenFetch.toString()
          )
        );
      } else {
        promises.push(SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH));
      }
    }

    if (state.lastAuthState !== undefined) {
      if (state.lastAuthState) {
        promises.push(
          SecureStore.setItemAsync(STORAGE_KEYS.LAST_AUTH_STATE, state.lastAuthState)
        );
      } else {
        promises.push(SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_AUTH_STATE));
      }
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('Error writing auth cache:', error);
  }
}

/**
 * Get cached access token
 */
export async function getCachedAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error reading cached access token:', error);
    return null;
  }
}

/**
 * Set cached access token with expiration
 */
export async function setCachedAccessToken(
  token: string,
  expiresInMs: number = ACCESS_TOKEN_LIFETIME_MS
): Promise<void> {
  try {
    const expiresAt = Date.now() + expiresInMs;
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token),
      SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString()),
      SecureStore.setItemAsync(
        STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH,
        Date.now().toString()
      ),
    ]);
  } catch (error) {
    console.error('Error writing cached access token:', error);
  }
}

/**
 * Get last successful token fetch timestamp
 */
export async function getLastSuccessfulTokenFetch(): Promise<number | null> {
  try {
    const timestamp = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Error reading last successful token fetch:', error);
    return null;
  }
}

/**
 * Set last successful token fetch timestamp
 */
export async function setLastSuccessfulTokenFetch(): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH,
      Date.now().toString()
    );
  } catch (error) {
    console.error('Error writing last successful token fetch:', error);
  }
}

/**
 * Check if cached access token is still valid
 */
export async function isAccessTokenValid(): Promise<boolean> {
  try {
    const tokenExpiresAtStr = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    if (!tokenExpiresAtStr) return false;

    const tokenExpiresAt = parseInt(tokenExpiresAtStr, 10);
    const now = Date.now();
    
    // Token is valid if expiration is in the future (with buffer)
    return tokenExpiresAt > now + ACCESS_TOKEN_BUFFER_MS;
  } catch (error) {
    console.error('Error checking access token validity:', error);
    return false;
  }
}

/**
 * Check if we should verify refresh token validity
 * Heuristic: if last successful fetch was > 25 days ago, we should check
 */
export async function shouldCheckRefreshToken(): Promise<boolean> {
  try {
    const lastFetch = await getLastSuccessfulTokenFetch();
    if (!lastFetch) return true; // No cache, should check

    const daysSinceLastFetch =
      (Date.now() - lastFetch) / (1000 * 60 * 60 * 24);
    
    // If > 25 days, we should check refresh token validity
    return daysSinceLastFetch > HEURISTIC_SAFE_DAYS;
  } catch (error) {
    console.error('Error checking refresh token heuristic:', error);
    return true; // On error, check to be safe
  }
}

/**
 * Clear all cached auth data
 */
export async function clearAuthCache(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVY_USER_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRES_AT),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_SUCCESSFUL_TOKEN_FETCH),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_AUTH_STATE),
    ]);
  } catch (error) {
    console.error('Error clearing auth cache:', error);
  }
}

/**
 * Get cached Privy user ID
 */
export async function getCachedPrivyUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.PRIVY_USER_ID);
  } catch (error) {
    console.error('Error reading cached Privy user ID:', error);
    return null;
  }
}

/**
 * Set cached Privy user ID
 */
export async function setCachedPrivyUserId(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.PRIVY_USER_ID, userId);
  } catch (error) {
    console.error('Error writing cached Privy user ID:', error);
  }
}

