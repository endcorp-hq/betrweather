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
import { checkWhitelistNFTs } from "../../utils/checkNft";
import { toast } from "../../utils/toastUtils";
import { Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  getAccountFromAuthorizedAccount,
  fetchAuthorization,
  persistAuthorization,
  clearJWTTokens,
} from "../../utils/authUtils";
import { Account, WalletAuthorization } from "src/types/solana-types";
import { STORAGE_KEYS } from "../../utils/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearUserData } from "src/utils/userStorage";

const DEVNET_CHAIN: Chain = "solana:devnet";

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
  name: "Random",
  uri: "https://betrweather.com",
};

export function useAuthorization() {
  const queryClient = useQueryClient();

  const { data: authorization, isLoading } = useQuery({
    queryKey: [STORAGE_KEYS.AUTHORIZATION],
    queryFn: () => fetchAuthorization(),
  });

  const { mutate: setAuthorization } = useMutation({
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

      // Check whitelist for mainnet
      if (chainIdentifier?.includes("mainnet")) {
        const authResult = await checkWhitelistNFTs(
          nextAuthorization.selectedAccount.publicKey.toBase58(),
          true
        );

        if (!authResult.authorized) {
          toast.error("You need to be on the whitelist to access mainnet.");
          throw new Error("User is not authorized for mainnet");
        }
      }

      // Store wallet authorization
      const nextAuthWithSession: WalletAuthorization = {
        ...nextAuthorization,
        userSession: {
          chain: chainIdentifier?.includes("mainnet")
            ? ("mainnet" as const)
            : ("devnet" as const),
          tier: chainIdentifier?.includes("mainnet") ? "superteam" : "public",
          timestamp: Date.now(),
        },
      };

      setAuthorization(nextAuthWithSession);
      return nextAuthWithSession;
    },
    [authorization, setAuthorization]
  );

  const authorizeSession = useCallback(
    async (wallet: Web3MobileWallet, chainIdentifier?: Chain) => {
      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: chainIdentifier || DEVNET_CHAIN,
        auth_token: authorization?.authToken,
      });
      console.log("authorizationResult", authorizationResult);

      return (
        await handleAuthorizationResult(authorizationResult, chainIdentifier)
      ).selectedAccount;
    },
    [ authorization, handleAuthorizationResult]
  );

  const authorizeSessionWithSignIn = useCallback(
    async (
      wallet: Web3MobileWallet,
      signInPayload: SolanaSignInInput,
      chainIdentifier?: Chain
    ) => {
      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: chainIdentifier || DEVNET_CHAIN,
        auth_token: authorization?.authToken,
        sign_in_payload: signInPayload,
      });
      return (
        await handleAuthorizationResult(
          authorizationResult,
          chainIdentifier,
        )
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
      await clearJWTTokens();
      await clearUserData();
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTHORIZATION);
      setAuthorization(null);

      console.log("Authorization cleared");
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
      deauthorizeSession,
      authorizeSessionWithSignIn,
      selectedAccount: authorization?.selectedAccount ?? null,
      userSession: authorization?.userSession ?? null,
      isLoading,
    }),
    [
      authorization,
      authorizeSession,
      deauthorizeSession,
      authorizeSessionWithSignIn,
      isLoading,
    ]
  );
}
