
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Base64EncodedAddress } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { SolanaSignInOutput, type SolanaSignInInput } from "@solana/wallet-standard-features";
import { PublicKey } from "@solana/web3.js";
import { Account } from "src/types/solana-types";
import { v4 as uuidv4 } from "uuid";

export const WALLET_ALREADY_REGISTERED_ERROR = "WalletAlreadyRegisteredError";

const DEVICE_ID_KEY = "DEVICE_ID";

//generates an ID for the device, if not found, generates a new one and stores it in AsyncStorage. 
//same for all users on the same device.
export async function getDeviceId(): Promise<string> {
  // Try to fetch existing ID
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // If not found, generate a new UUID
    deviceId = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
export async function generateSecureSignInPayload(): Promise<SolanaSignInInput | null> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/payload`,
      {

      }
    );
    const payload = await response.json();
    if (!payload.data) {
      return null;
    }
    return payload.data;

  } catch (error) {
    console.error("Error generating secure sign in payload", error);
    return null;
  }
}

export async function signInUser(publicKey: string, signature: string, payload: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresAt: number;
  walletAddress: string;
  user: {
    id: string,
    name: string,
    email: string,
    phone: string,
    wallet: string,
    totalBets: number,
    betsWon: number,
    betsLost: number,
    totalBetAmountUSDC: number,
    totalBetAmountSol: number,
    totalBetAmountBonk: number,
    totalWonAmountUSDC: number,
    totalWonAmountSol: number,
    totalWonAmountBonk: number,
    streak: number,
    winRate: string,
  },
}> {
  const deviceId = await getDeviceId();
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/signin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: publicKey,
        deviceId: deviceId,
        signature: signature,
        payload: payload,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Sign in user failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiry,
    expiresAt: data.accessTokenExpiry,
    walletAddress: data.user.walletAddress,
    user: data.user,
  };
}


export async function checkUserStatus(
  address: PublicKey
): Promise<{ ownershipProved: boolean; userExists: boolean }> {
  const response = await fetch(
    `${
      process.env.EXPO_PUBLIC_BACKEND_URL
    }/users/ownership-proved?walletAddress=${address.toBase58()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`User check failed: ${response.status}`);
  }

  const data = await response.json();
  const ownershipProved = data.data.ownershipProved;
  const userExists = data.data.userExists;
  return { ownershipProved, userExists };
}

export async function updateUser(address: Base64EncodedAddress): Promise<void> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/users/profile?address=${address}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ownershipProved: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Update user failed: ${response.status}`);
  }
}


export async function signUp(
  publicKey: string,
  signature: string,
  payload: string,
  userData?: { name: string; email: string }
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresAt: number;
  walletAddress: string;
  user: {
    id: string,
    name: string,
    email: string,
    phone: string,
    wallet: string,
    totalBets: number,
    betsWon: number,
    betsLost: number,
    totalBetAmountUSDC: number,
    totalBetAmountSol: number,
    totalBetAmountBonk: number,
    totalWonAmountUSDC: number,
    totalWonAmountSol: number,
    totalWonAmountBonk: number,
    streak: number,
    winRate: string,
  },
}> {
  try {
    const deviceId = await getDeviceId();
    // Call your backend authenticate endpoint
    const body = {
      userName: userData?.name || "User",
      userEmail: userData?.email || "User",
      walletAddress: publicKey,
      signature: signature,
      payload: payload,
      deviceId: deviceId,
    }
    console.log("body", body);
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      let errorMessage = `Authentication failed: ${response.status}`;
      let serverMessage: string | undefined;
      try {
        const body = await response.json();
        serverMessage = body?.message || body?.error || body?.detail;
        if (serverMessage) {
          errorMessage = serverMessage;
        }
      } catch {
        try {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        } catch {
          // ignore, keep default message
        }
      }

      if (
        response.status === 409 ||
        (serverMessage && serverMessage.toLowerCase().includes("already")) ||
        errorMessage.toLowerCase().includes("already")
      ) {
        const conflictError = new Error(
          serverMessage ||
            errorMessage ||
            "This wallet is already registered. Please sign in instead."
        );
        conflictError.name = WALLET_ALREADY_REGISTERED_ERROR;
        throw conflictError;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      refreshTokenExpiresAt: data.refreshTokenExpiry,
      expiresAt: data.accessTokenExpiry,
      walletAddress: data.user.walletAddress,
      user: data.user,
    };
  } catch (error) {
    console.error("Backend authentication error:", error);
    throw error;
  }
}

