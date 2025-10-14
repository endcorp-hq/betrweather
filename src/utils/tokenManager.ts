import { getJWTTokens, JWTTokens, storeJWTTokens } from "./authUtils";
import { getDeviceId } from "./signInUtils";

class TokenManager {
  private refreshPromise: Promise<boolean> | null = null;
  private isRefreshing = false;

  async refreshTokens(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<boolean> {
    const deviceId = await getDeviceId();
    try {
      const tokens = await getJWTTokens();
      if (!tokens?.refreshToken) return false;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: tokens.refreshToken,
            deviceId: deviceId,
          }),
        }
      );

      if (response.ok) {
        const newTokens = await response.json();
        const {
          refreshToken,
          refreshTokenExpiry,
          accessToken,
          accessTokenExpiry,
        } = newTokens;

        const tokens = await getJWTTokens();
        const walletAddress = tokens?.walletAddress || "";

        const newTokensData = {
          accessToken,
          refreshToken,
          refreshTokenExpiresAt: refreshTokenExpiry,
          expiresAt: accessTokenExpiry,
          walletAddress,
        };

        await storeJWTTokens(newTokensData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }

  // Check if token needs refresh (5 minutes before expiry)
  shouldRefresh(tokens: JWTTokens): boolean {
    if (
      tokens.accessToken &&
      new Date(tokens.expiresAt).getTime() - Date.now() < 3 * 60 * 1000
    ) {
      return true;
    }
    return false;
  }

  // Check if refresh token is still valid
  isRefreshTokenValid(tokens: JWTTokens): boolean {
    if (!tokens.refreshToken || !tokens.refreshTokenExpiresAt) {
      console.log(
        "refreshToken does not exist or expiry does not exist",
        tokens
      );
      return false;
    }

    try {
      const now = Date.now(); // Current time in milliseconds
      const expiryTime = new Date(tokens.refreshTokenExpiresAt).getTime(); // Expiry time in milliseconds

      // Add 1 minute buffer for safety
      const bufferTime = 60 * 1000; // 1 minute
      return now < expiryTime - bufferTime;
    } catch (error) {
      console.error(
        "Error validating refresh token:",
        error,
        Date.now(),
        new Date(tokens.refreshTokenExpiresAt).getTime()
      );
      return false;
    }
  }
}

export const tokenManager = new TokenManager();
