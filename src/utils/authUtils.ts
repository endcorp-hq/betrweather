import AsyncStorage from "@react-native-async-storage/async-storage";
import { PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { Account, WalletAuthorization } from "src/types/solana-types";
import {
  Account as AuthorizedAccount,
  AuthorizationResult,
  Base64EncodedAddress,
  DeauthorizeAPI,
  Chain,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import { toUint8Array } from "js-base64";
import { STORAGE_KEYS } from "./constants";

const JWT_STORAGE_KEY = STORAGE_KEYS.JWT_TOKENS;
const AUTHORIZATION_STORAGE_KEY = STORAGE_KEYS.AUTHORIZATION;

export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Access token expiry
  refreshTokenExpiresAt: number; // Refresh token expiry (30-90 days)
  walletAddress: string; // Link to wallet
}

export async function getJWTTokens(): Promise<JWTTokens | null> {
  try {
    const tokens = await AsyncStorage.getItem(JWT_STORAGE_KEY);
    if (!tokens) return null;

    const parsed = JSON.parse(tokens);    // Check if token is expired
    if (Date.now() >= parsed.expiresAt) {
      await clearJWTTokens();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Error getting JWT tokens:", error);
    return null;
  }
}

export async function storeJWTTokens(tokens: JWTTokens): Promise<void> {
  try {
    await AsyncStorage.setItem(JWT_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("Error storing JWT tokens:", error);
  }
}

export async function clearJWTTokens(): Promise<void> {
  try {
    await AsyncStorage.removeItem(JWT_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing JWT tokens:", error);
  }
}

export function isTokenExpired(tokens: JWTTokens): boolean {
  return Date.now() >= tokens.expiresAt;
}

export function getAccountFromAuthorizedAccount(
  account: AuthorizedAccount
): Account {
  return {
    ...account,
    publicKey: getPublicKeyFromAddress(account.address),
  };
}

export function getPublicKeyFromAddress(
  address: Base64EncodedAddress
): PublicKey {
  const publicKeyByteArray = toUint8Array(address);
  return new PublicKey(publicKeyByteArray);
}

function cacheReviver(key: string, value: any) {
  if (key === "publicKey") {
    return new PublicKey(value as PublicKeyInitData);
  } else {
    return value;
  }
}

export async function fetchAuthorization(): Promise<WalletAuthorization | null> {
  const cacheFetchResult = await AsyncStorage.getItem(
    AUTHORIZATION_STORAGE_KEY
  );

  if (!cacheFetchResult) {
    return null;
  }

  // Return prior authorization, if found.
  return JSON.parse(cacheFetchResult, cacheReviver);
}

export async function persistAuthorization(
  auth: WalletAuthorization | null
): Promise<void> {
  if (auth == null) {
    await AsyncStorage.removeItem(AUTHORIZATION_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTHORIZATION_STORAGE_KEY, JSON.stringify(auth));
}
