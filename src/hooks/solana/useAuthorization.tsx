import AsyncStorage from "@react-native-async-storage/async-storage";
import { PublicKey, PublicKeyInitData } from "@solana/web3.js";
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
      
      if (chainIdentifier?.includes("mainnet")) {
        const authResult = await checkWhitelistNFTs(
          nextAuthorization.selectedAccount.publicKey.toBase58(),
          true // isMainnet = true
        );

        if (!authResult.authorized) {
          toast.error("You need to be on the whitelist to access mainnet.");
          return {
            ...nextAuthorization,
            userAuth: false, //set as false if user is not authorized
          };
        } else {
          const nextAuthWithSession: WalletAuthorization = {
            ...nextAuthorization,
            userAuth: true,
            userSession: {
              chain: "mainnet" as const, // Fix: use const assertion
              tier: authResult.tier as "seeker" | "superteam" | "none" | "public", // Fix: type assertion
              timestamp: Date.now(),
            },
          };
          setAuthorization(nextAuthWithSession);
          // await saveWalletAddress(nextAuthorization.selectedAccount.publicKey.toBase58(), "mainnet");
          toast.success("Login Successful.");
          return nextAuthWithSession;
        }
      }

      const devnetAuthSession: WalletAuthorization = { // Fix: add type annotation
        ...nextAuthorization,
        userAuth: true,
        userSession: {
          chain: "devnet" as const, // Fix: use const assertion
          tier: "none" as const, // Fix: use const assertion
          timestamp: Date.now(),
        },
      };
      
      // in case of devnet or mainnet conditions satisfies, set the authorization in async storage
      await setAuthorization(devnetAuthSession);
      // await saveWalletAddress(nextAuthorization.selectedAccount.publicKey.toBase58(), "devnet");
      return devnetAuthSession;
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
      return (await handleAuthorizationResult(authorizationResult, chainIdentifier))
        .selectedAccount;
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

  return useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      selectedAccount: authorization?.selectedAccount ?? null,
      userSession: authorization?.userSession ?? null,
      isLoading,
    }),
    [
      authorization,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      isLoading, // Fix: add isLoading to dependencies
    ]
  );
}
