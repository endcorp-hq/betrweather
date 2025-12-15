// src/utils/apiClient.ts
import { getJWTTokens } from './authUtils';
import { tokenManager } from './tokenManager';
import { getAuthModeForEndpoint } from '../config/apiAuthConfig';
import { getPrivyAccessToken } from './privyAuth';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }

  /**
   * Get the appropriate auth token based on endpoint configuration
   */
  private async getAuthToken(endpoint: string): Promise<string | null> {
    const authMode = getAuthModeForEndpoint(endpoint);

    if (authMode === 'none') {
      return null; // No auth required
    }

    if (authMode === 'privy') {
      // Use Privy access token (will use cached token if valid, only calls Privy if expired)
      // This ensures consistency: we always use cached token first, only refresh when needed
      return await getPrivyAccessToken();
    }

    // Default: Use JWT token (existing behavior)
    const tokens = await getJWTTokens();
    
    // Check if refresh token is valid
    if (!tokens || !tokenManager.isRefreshTokenValid(tokens)) {
      throw new Error('No valid refresh token available');
    }

    // If access token is expired or expires soon, refresh it first
    if (tokenManager.shouldRefresh(tokens)) {
      const refreshed = await tokenManager.refreshTokens();
      if (!refreshed) {
        throw new Error('Token refresh failed');
      }
    }

    // Get fresh tokens after potential refresh
    const freshTokens = await getJWTTokens();
    if (!freshTokens) {
      throw new Error('No tokens available');
    }

    return freshTokens.accessToken;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const authMode = getAuthModeForEndpoint(endpoint);
    let authToken: string | null = null;

    // Get auth token if needed
    if (authMode !== 'none') {
      authToken = await this.getAuthToken(endpoint);
      if (!authToken) {
        throw new Error(`No auth token available for ${authMode} auth`);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add Authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // If still 401, try to refresh token (only for JWT auth)
    if (response.status === 401 && authMode === 'jwt') {
      const refreshed = await tokenManager.refreshTokens();
      if (refreshed) {
        // Retry with new token
        const newTokens = await getJWTTokens();
        if (newTokens) {
          return fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${newTokens.accessToken}`,
            },
          });
        }
      }
      throw new Error('Authentication failed');
    }

    // For Privy auth, if 401, token might be expired or invalid
    if (response.status === 401 && authMode === 'privy') {
      const errorText = await response.text().catch(() => '');
      console.error('Privy auth 401 error:', errorText);
      throw new Error('Privy authentication failed');
    }

    return response;
  }
}

export const apiClient = new ApiClient();
