# Auth Flow Optimization - File Changes Plan

## Overview
Implement cache-first auth flow with optimistic UI and background verification to achieve <100ms app launch time.

## File Changes Required

### 1. **NEW FILE: `src/utils/authCache.ts`**
   **Purpose:** Secure storage operations for auth state and tokens
   
   **Functions to implement:**
   - `getCachedAuthState()` - Read auth state from secure storage
   - `setCachedAuthState()` - Save auth state to secure storage
   - `getCachedAccessToken()` - Get cached access token with expiration
   - `setCachedAccessToken()` - Cache access token with expiration
   - `getLastSuccessfulTokenFetch()` - Get timestamp of last successful token fetch
   - `setLastSuccessfulTokenFetch()` - Update timestamp
   - `clearAuthCache()` - Clear all cached auth data
   - `isAccessTokenValid()` - Check if cached token is still valid
   - `shouldCheckRefreshToken()` - Heuristic: should we check refresh token validity
   
   **Storage keys:**
   - `privy_user_id` - Privy user ID
   - `access_token` - Cached access token
   - `token_expires_at` - Access token expiration timestamp
   - `last_successful_token_fetch` - Timestamp of last successful token fetch
   - `last_auth_state` - Last known auth state ('authenticated' | 'unauthenticated')

---

### 2. **MODIFY: `src/utils/privyAuth.ts`**
   **Changes:**
   - Add caching logic to `getPrivyAccessToken()`
   - Check cache first before calling Privy
   - Update cache when token is fetched
   - Track `last_successful_token_fetch` timestamp
   - Return cached token if still valid (>5 min remaining)
   - Only call Privy if cache miss or expired
   
   **New functions:**
   - `getPrivyAccessTokenWithCache()` - Main function with caching
   - `refreshPrivyAccessToken()` - Force refresh and update cache

---

### 3. **MODIFY: `src/components/sign-in/guarded-screen.tsx`**
   **Major changes:**
   - Read cache FIRST (before Privy initialization)
   - Show UI immediately based on cache state
   - Initialize Privy in background (non-blocking)
   - Verify session in background
   - Update UI only if auth state changes
   
   **New logic flow:**
   1. Read cache on mount (50ms)
   2. Decision tree:
      - No cache → Show login screen immediately
      - Cache exists + access token valid → Show app content immediately
      - Cache exists + access token expired + last_fetch < 25 days → Show app content optimistically, refresh in background
      - Cache exists + last_fetch > 25 days → Show loading screen, check Privy session, then decide
   3. Background: Initialize Privy
   4. Background: Verify session matches cache
   5. Background: Update cache if needed
   6. Background: Update UI if state changed
   
   **State management:**
   - Add `authState` state: 'checking_cache' | 'authenticated' | 'unauthenticated' | 'verifying_session'
   - Add `authSource` state: 'cache' | 'verified'
   - Show loading only when `authState === 'verifying_session'` (scenario 4: >30 days)

---

### 4. **MODIFY: `src/hooks/usePrivyProfileSetup.ts`**
   **Changes:**
   - After successful backend login, cache auth state
   - Update `last_successful_token_fetch` timestamp
   - Cache Privy user ID
   - Set `last_auth_state` to 'authenticated'
   
   **New logic:**
   - After `loginWithBackend()` succeeds:
     - Get Privy access token
     - Cache token with expiration
     - Cache user ID
     - Update `last_successful_token_fetch`
     - Set `last_auth_state` to 'authenticated'

---

### 5. **MODIFY: `src/contexts/PrivyProfileSetupProvider.tsx`**
   **Changes:**
   - When user logs out, clear auth cache
   - When setup error occurs, clear cache if needed
   
   **New logic:**
   - On logout: Call `clearAuthCache()`
   - On setup error: Clear cache if session invalid

---

### 6. **MODIFY: `src/utils/apiClient.ts` (Optional - for token optimization)**
   **Changes:**
   - Use cached token if available and valid
   - Only fetch fresh token if cache miss or expired
   
   **Note:** This is optional since `getPrivyAccessToken()` will handle caching

---

## Implementation Constants

```typescript
// src/utils/authCache.ts
const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_LIFETIME_DAYS = 30;
const HEURISTIC_SAFE_DAYS = 25; // Check before actual expiration
const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer
```

---

## State Flow Diagram

```
App Launch
  ↓
Read Cache (50ms)
  ↓
┌─────────────────────────────────┐
│ Decision Tree:                  │
│                                 │
│ IF no cache:                    │
│   → Show Login Screen (100ms)   │
│                                 │
│ IF cache + token valid:         │
│   → Show App Content (100ms)    │
│                                 │
│ IF cache + token expired:       │
│   IF last_fetch < 25 days:      │
│     → Show App Content (100ms)  │
│     → Refresh in background    │
│   ELSE:                         │
│     → Show Loading (100ms)      │
│     → Check Privy session      │
│     → Show Login or App (500ms) │
└─────────────────────────────────┘
  ↓
Background: Initialize Privy
Background: Verify Session
Background: Update Cache
```

---

## Testing Scenarios

1. **First time user** - Should see login screen in <100ms
2. **30 mins idle** - Should see app content in <100ms
3. **1.5 hours idle** - Should see app content in <100ms (optimistic)
4. **31 days idle** - Should see loading screen, then login screen (~500ms)

---

## Dependencies

- `expo-secure-store` - Already installed ✅
- No new packages needed

---

## Migration Notes

- Existing users will have no cache on first launch after update
- They'll see login screen (expected behavior)
- After login, cache will be populated
- Subsequent launches will be instant

---

## Rollback Plan

If issues arise:
1. Remove cache checks from `guarded-screen.tsx`
2. Revert to current blocking flow
3. Cache will be ignored (harmless)

