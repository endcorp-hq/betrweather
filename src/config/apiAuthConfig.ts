// src/config/apiAuthConfig.ts

/**
 * Configuration for which authentication method each API endpoint should use.
 * 
 * - 'privy': Use Privy access token in Authorization header
 * - 'jwt': Use JWT token in Authorization header (existing behavior)
 * - 'none': No authentication required (public endpoints)
 */
export type AuthMode = 'privy' | 'jwt' | 'none';

export const API_AUTH_CONFIG: Record<string, AuthMode> = {
  '/auth/login': 'privy',
  '/users/profile': 'privy', // keep existing JWT auth
  // Add more endpoints as needed
} as const;

/**
 * Get the auth mode for a given endpoint
 * @param endpoint - The API endpoint path (e.g., '/auth/login')
 * @returns The auth mode to use, defaults to 'jwt' if not specified
 */
export function getAuthModeForEndpoint(endpoint: string): AuthMode {
  // Normalize endpoint (remove query params, trailing slashes)
  const normalized = endpoint.split('?')[0].replace(/\/$/, '');
  
  // Check exact match first
  if (API_AUTH_CONFIG[normalized]) {
    return API_AUTH_CONFIG[normalized];
  }
  
  // Check prefix matches (for nested routes)
  for (const [configPath, mode] of Object.entries(API_AUTH_CONFIG)) {
    if (normalized.startsWith(configPath)) {
      return mode;
    }
  }
  
  // Default to JWT for backward compatibility
  return 'jwt';
}

