import AsyncStorage from "@react-native-async-storage/async-storage";
import { PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  Account as AuthorizedAccount,
  AuthorizationResult,
  AuthorizeAPI,
  AuthToken,
  Base64EncodedAddress,
  DeauthorizeAPI,
  SignInPayload,
  Chain,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import { toUint8Array } from "js-base64";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { checkWhitelistNFTs } from "../../utils/checkNft";
import { toast } from "../../utils/toastUtils";
// import { useWidgetCache } from '@/hooks';

const DEVNET_CHAIN: Chain = "solana:devnet";

export type Account = Readonly<{
  address: Base64EncodedAddress;
  label?: string;
  publicKey: PublicKey;
}>;

type WalletAuthorization = Readonly<{
  accounts: Account[];
  authToken: AuthToken;
  selectedAccount: Account;
  userAuth: boolean | null;
  userSession?: {
    chain: "mainnet" | "devnet";
    tier: "seeker" | "superteam" | "none" | "public";
    timestamp: number;
  };
}>;

function getAccountFromAuthorizedAccount(account: AuthorizedAccount): Account {
  return {
    ...account,
    publicKey: getPublicKeyFromAddress(account.address),
  };
}

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account
): WalletAuthorization {
  let selectedAccount: Account;
  if (
    // We have yet to select an account.
    previouslySelectedAccount == null ||
    // The previously selected account is no longer in the set of authorized addresses.
    !authorizationResult.accounts.some(
      ({ address }) => address === previouslySelectedAccount.address
    )
  ) {
    const firstAccount = authorizationResult.accounts[0];
    selectedAccount = getAccountFromAuthorizedAccount(firstAccount);
  } else {
    selectedAccount = previouslySelectedAccount;
  }
  return {
    accounts: authorizationResult.accounts.map(getAccountFromAuthorizedAccount),
    authToken: authorizationResult.auth_token,
    selectedAccount,
    userAuth: true, //set it as true here initially
  };
}

function getPublicKeyFromAddress(address: Base64EncodedAddress): PublicKey {
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

const AUTHORIZATION_STORAGE_KEY = "authorization-cache";

async function fetchAuthorization(): Promise<WalletAuthorization | null> {
  const cacheFetchResult = await AsyncStorage.getItem(
    AUTHORIZATION_STORAGE_KEY
  );

  if (!cacheFetchResult) {
    return null;
  }

  // Return prior authorization, if found.
  return JSON.parse(cacheFetchResult, cacheReviver);
}

async function persistAuthorization(
  auth: WalletAuthorization | null
): Promise<void> {
  await AsyncStorage.setItem(AUTHORIZATION_STORAGE_KEY, JSON.stringify(auth));
}

export const APP_IDENTITY = {
  name: "BetrWeather",
  uri: "https://betrweather.xyz",
};

export function useAuthorization() {
  const queryClient = useQueryClient();
  const { data: authorization, isLoading } = useQuery({
    queryKey: ["wallet-authorization"],
    queryFn: () => fetchAuthorization(),
  });
  const { mutate: setAuthorization } = useMutation({
    mutationFn: persistAuthorization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-authorization"] });
    },
  });

  // Web-only helper: establish authorization from a browser wallet public key
  const setWebAuthorization = useCallback(async (publicKey: PublicKey): Promise<Account> => {
    const addressB64 = Buffer.from(publicKey.toBytes()).toString('base64') as Base64EncodedAddress;
    const webAccount: Account = { address: addressB64, publicKey };
    const next: WalletAuthorization = {
      accounts: [webAccount],
      authToken: (authorization?.authToken as AuthToken) ?? ("web" as unknown as AuthToken),
      selectedAccount: webAccount,
      userAuth: true,
      userSession: {
        chain: 'devnet',
        tier: 'none',
        timestamp: Date.now(),
      },
    };
    await setAuthorization(next);
    return webAccount;
  }, [authorization, setAuthorization]);

  // const { saveWalletAddress, removeWalletAddress } = useWidgetCache();

  const handleAuthorizationResult = useCallback(
    async (
      authorizationResult: AuthorizationResult,
      chainIdentifier?: Chain
    ): Promise<WalletAuthorization> => {
      const nextAuthorization = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        authorization?.selectedAccount
      );
      
      // Unified: rely on backend SIWS verification to determine authorization and tier for both networks
      const unifiedSession: WalletAuthorization = {
        ...nextAuthorization,
        userAuth: true,
        userSession: {
          chain: (chainIdentifier?.includes('mainnet') ? 'mainnet' : 'devnet') as 'mainnet' | 'devnet',
          tier: 'none',
          timestamp: Date.now(),
        },
      };
      await setAuthorization(unifiedSession);
      return unifiedSession;
    },
    [authorization, setAuthorization]
  );

  const authorizeSession = useCallback(
    async (wallet: AuthorizeAPI, chainIdentifier?: Chain) => {
      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: chainIdentifier || DEVNET_CHAIN,
        auth_token: authorization?.authToken,
      });
      return (
        await handleAuthorizationResult(authorizationResult, chainIdentifier)
      ).selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const authorizeSessionWithSignIn = useCallback(
    async (
      wallet: AuthorizeAPI,
      signInPayload: SignInPayload,
      chainIdentifier?: Chain
    ) => {
      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        auth_token: authorization?.authToken,
        chain: chainIdentifier || DEVNET_CHAIN,
        sign_in_payload: signInPayload,
      });
      // After wallet SIWS, verify with backend and get whitelist/tier
      try {
        const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
        const input = signInPayload as any; // the SIWS input
        const output = authorizationResult.sign_in_result as any; // wallet SIWS output
        if (!output) {
          throw new Error('Missing SIWS result from wallet');
        }
        const res = await fetch(`${API_BASE}/auth/siws`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signInInput: input, signInOutput: output }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'SIWS verification failed');
        }
        // Persist backend tier into session
        const updated = {
          ...(await fetchAuthorization()),
          userSession: {
            chain: (chainIdentifier?.includes('mainnet') ? 'mainnet' : 'devnet') as 'mainnet' | 'devnet',
            tier: (data?.tier ?? 'none') as 'seeker' | 'superteam' | 'none' | 'public',
            timestamp: Date.now(),
          },
        } as WalletAuthorization;
        await persistAuthorization(updated);
      } catch (e) {
        console.log('Backend SIWS verification error', e);
      }
      return (
        await handleAuthorizationResult(authorizationResult, chainIdentifier)
      ).selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const deauthorizeSession = useCallback(
    async (wallet: DeauthorizeAPI) => {
      if (authorization?.authToken == null) {
        return;
      }
      await wallet.deauthorize({ auth_token: authorization.authToken });
      await setAuthorization(null);
      // await removeWalletAddress();
    },
    [authorization, setAuthorization]
  );

  // Local-only logout: clear cached authorization without opening wallet
  const clearSession = useCallback(() => {
    setAuthorization(null);
  }, [setAuthorization]);

  return useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      clearSession,
      setWebAuthorization,
      selectedAccount: authorization?.selectedAccount ?? null,
      userSession: authorization?.userSession ?? null,
      isLoading,
    }),
    [
      authorization,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      clearSession,
      setWebAuthorization,
      isLoading, // Fix: add isLoading to dependencies
    ]
  );
}
