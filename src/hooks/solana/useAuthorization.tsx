import {
  AuthorizationResult,
  DeauthorizeAPI,
  Chain,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import {
  SolanaSignInInput,
} from "@solana/wallet-standard-features";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  getAccountFromAuthorizedAccount,
  fetchAuthorization,
  persistAuthorization,
  clearJWTTokens,
} from "../../utils/authUtils";
import { Account, WalletAuthorization } from "src/types/solana-types";
import { STORAGE_KEYS } from "../../utils/constants";
import { clearUserData } from "src/utils/userStorage";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";

const DEVNET_CHAIN: Chain = "solana:devnet";
const MAINNET_CHAIN: Chain = "solana:mainnet-beta";

const resolveDefaultChain = (
  override: Chain | undefined,
  authorization: WalletAuthorization | null | undefined
): Chain => {
  if (override) return override;
  if (!ENABLE_NETWORK_TOGGLE) {
    return MAINNET_CHAIN;
  }
  const stored = authorization?.userSession?.chain;
  if (stored?.includes("mainnet")) return MAINNET_CHAIN;
  return DEVNET_CHAIN;
};

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account
): WalletAuthorization {
  let selectedAccount: Account;
  if (
    previouslySelectedAccount == null ||
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
    userAuth: true,
  };
}

export const APP_IDENTITY = {
  name: "BetrWeather",
  uri: "https://betrweather.xyz",
};

export function useAuthorization(): {
  accounts: Account[] | null;
  authorizeSession: (
    wallet: Web3MobileWallet,
    chainIdentifier?: Chain
  ) => Promise<Account>;
  deauthorizeSession: (wallet?: DeauthorizeAPI) => Promise<void>;
  authorizeSessionWithSignIn: (
    wallet: Web3MobileWallet,
    signInPayload: SolanaSignInInput,
    chainIdentifier?: Chain
  ) => Promise<Account>;
  selectedAccount: Account | null;
  userSession: WalletAuthorization["userSession"] | null;
  isLoading: boolean;
  clearAuthorization: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { data: authorization, isLoading } = useQuery({
    queryKey: [STORAGE_KEYS.AUTHORIZATION],
    queryFn: () => fetchAuthorization(),
  });

  const { mutate: setAuthorization, mutateAsync: setAuthorizationAsync } = useMutation({
    mutationFn: persistAuthorization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEYS.AUTHORIZATION] });
    },
  });

  const handleAuthorizationResult = useCallback(
    async (
      authorizationResult: AuthorizationResult,
      chainIdentifier?: Chain,
    ): Promise<WalletAuthorization> => {
      console.log("authorizationResult", authorizationResult);
      const nextAuthorization = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        authorization?.selectedAccount
      );

      // Whitelist and access control are enforced server-side via token issuance
      const resolvedTier: "public" | "superteam" | "seeker" = "public";

      // Store wallet authorization
      const nextAuthWithSession: WalletAuthorization = {
        ...nextAuthorization,
        userSession: {
          chain: ENABLE_NETWORK_TOGGLE
            ? (chainIdentifier?.includes("mainnet") ? ("mainnet" as const) : ("devnet" as const))
            : ("mainnet" as const),
          tier: ENABLE_NETWORK_TOGGLE
            ? (chainIdentifier?.includes("mainnet") ? resolvedTier : "public")
            : resolvedTier,
          timestamp: Date.now(),
        },
      };

      setAuthorization(nextAuthWithSession);
      return nextAuthWithSession;
    },
    [authorization, setAuthorization]
  );

  const clearAuthorization = useCallback(async () => {
    await clearJWTTokens();
    await clearUserData();
    await setAuthorizationAsync(null);
  }, [setAuthorizationAsync]);

  const authorizeSession = useCallback(
    async (wallet: Web3MobileWallet, chainIdentifier?: Chain): Promise<Account> => {
      const chainToUse = resolveDefaultChain(chainIdentifier, authorization);
      let authorizationResult: AuthorizationResult | null = null;

      if (authorization?.authToken) {
        try {
          authorizationResult = await wallet.reauthorize({
            identity: APP_IDENTITY,
            auth_token: authorization.authToken,
          });
          console.log("reauthorizationResult", authorizationResult);
        } catch (reauthError) {
          console.warn("Wallet reauthorize failed, falling back to authorize", reauthError);
        }
      }

      if (!authorizationResult) {
        authorizationResult = await wallet.authorize({
          identity: APP_IDENTITY,
          chain: chainToUse,
          auth_token: authorization?.authToken,
        });
        console.log("authorizationResult", authorizationResult);
      }

      return (
        await handleAuthorizationResult(
          authorizationResult,
          chainIdentifier ?? chainToUse,
        )
      ).selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const authorizeSessionWithSignIn = useCallback(
    async (
      wallet: Web3MobileWallet,
      signInPayload: SolanaSignInInput,
      chainIdentifier?: Chain
    ): Promise<Account> => {
      const chainToUse = resolveDefaultChain(chainIdentifier, authorization);
      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: chainToUse,
        auth_token: authorization?.authToken,
        sign_in_payload: signInPayload,
      });
      return (
        await handleAuthorizationResult(
          authorizationResult,
          chainIdentifier ?? chainToUse,
        )
      ).selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const deauthorizeSession = useCallback(
    async (wallet?: DeauthorizeAPI): Promise<void> => {
      const authToken = authorization?.authToken;
      if (wallet && authToken) {
        try {
          await wallet.deauthorize({ auth_token: authToken });
        } catch (err) {
          console.warn("Wallet deauthorize failed", err);
        }
      }
      await clearAuthorization();
    },
    [authorization?.authToken, clearAuthorization]
  );

  return useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authorizeSession,
      deauthorizeSession,
      authorizeSessionWithSignIn,
      selectedAccount: authorization?.selectedAccount ?? null,
      userSession: authorization?.userSession ?? null,
      isLoading,
      clearAuthorization,
    }),
    [
      authorization,
      authorizeSession,
      deauthorizeSession,
      authorizeSessionWithSignIn,
      isLoading,
      clearAuthorization,
    ]
  );
}
