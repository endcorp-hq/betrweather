import { AuthToken, Base64EncodedAddress } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { PublicKey } from "@solana/web3.js";

export type Account = Readonly<{
    address: Base64EncodedAddress;
    label?: string;
    publicKey: PublicKey;
  }>;
  
  export type WalletAuthorization = Readonly<{
    accounts: Account[];
    authToken: AuthToken;
    selectedAccount: Account;
    userAuth: boolean | null;
    userSession?: {
      chain: "mainnet" | "devnet";
      tier: "seeker" | "superteam" | "none" | "public";
      timestamp: number;
    };
    // Add JWT fields to existing type
    jwtTokens?: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      refreshTokenExpiresAt: number;
      walletAddress: string;
    };
  }>;