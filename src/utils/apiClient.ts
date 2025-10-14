// src/utils/apiClient.ts
import { getJWTTokens } from './authUtils';
import { tokenManager } from './tokenManager';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
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

    const headers = {
      'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshTokens.accessToken}`,
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // If still 401, refresh token might be expired
    if (response.status === 401) {
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

    return response;
  }
}

export const apiClient = new ApiClient();
