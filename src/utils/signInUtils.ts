import { SignInPayload } from "@solana-mobile/mobile-wallet-adapter-protocol";

export function generateSecureSignInPayload(): SignInPayload {
  const now = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  return {
    domain: "BetrWeather",
    statement: `Sign into BetrWeather\n\nNonce: ${nonce}\nTimestamp: ${now}\nExpires: ${new Date(now + 5 * 60 * 1000).toISOString()}`,
    uri: "https://betrweather.com",
    nonce: nonce,
    issuedAt: new Date(now).toISOString(),
    expirationTime: new Date(now + 5 * 60 * 1000).toISOString(), // 5 minutes
  };
} 