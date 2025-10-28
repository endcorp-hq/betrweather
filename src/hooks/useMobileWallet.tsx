import { useAuthorization } from "./solana/useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useMemo } from "react";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { type SolanaSignInInput } from "@solana/wallet-standard-features";
import {
  Web3MobileWallet,
  transact,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Account } from "src/types/solana-types";
import { useChain } from "@/contexts/ChainProvider";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";

export const WALLET_CANCELLED_ERROR = "WalletCancelledError";

const isCancellationError = (error: unknown) => {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as any).message ?? "")
      : "";
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("cancel") ||
    normalized.includes("user dismissed") ||
    normalized.includes("aborted")
  );
};

const logWalletError = (context: string, error: any) => {
  try {
    const base = {
      name: error?.name,
      message: String(error?.message ?? error ?? ""),
      code: error?.code,
      logs: error?.logs,
    } as Record<string, unknown>;
    const cause = error?.cause;
    if (cause) {
      base.cause = {
        name: cause?.name,
        message: String(cause?.message ?? cause ?? ""),
        code: cause?.code,
        logs: cause?.logs,
      };
    }
    // eslint-disable-next-line no-console
    console.error(`[wallet] ${context}`, base);
  } catch {
    // eslint-disable-next-line no-console
    console.error(`[wallet] ${context}`, error);
  }
};

const isAuthorizationError = (error: unknown): boolean => {
  if (!error) return false;
  const code = (error as any)?.code;
  if (typeof code === "number" && code === -1) return true;
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("authorization request failed") ||
    message.includes("auth_token not valid for signing") ||
    message.includes("reauthorize") ||
    message.includes("authorize again") ||
    message.includes("auth token")
  );
};

export function useMobileWallet() {
  const {
    authorizeSessionWithSignIn,
    authorizeSession,
    deauthorizeSession,
    selectedAccount,
    userSession,
  } = useAuthorization();
  const { currentChain } = useChain();

  const resolveChainIdentifier = useCallback(
    (override?: Chain): Chain => {
      if (override) return override;
      if (!ENABLE_NETWORK_TOGGLE) {
        const resolved = "solana:mainnet-beta" as Chain;
        console.log("[Wallet] resolveChainIdentifier ->", resolved, "(toggle disabled)");
        return resolved;
      }
      const sessionChain = userSession?.chain;
      if (sessionChain?.includes("mainnet")) {
        const resolved = "solana:mainnet-beta" as Chain;
        console.log("[Wallet] resolveChainIdentifier ->", resolved, "(from session)");
        return resolved;
      }
      if (sessionChain?.includes("devnet")) {
        const resolved = "solana:devnet" as Chain;
        console.log("[Wallet] resolveChainIdentifier ->", resolved, "(from session)");
        return resolved;
      }
      if (currentChain) {
        const resolved = (currentChain === "mainnet" ? "solana:mainnet-beta" : "solana:devnet") as Chain;
        console.log("[Wallet] resolveChainIdentifier ->", resolved, "(from ChainProvider)");
        return resolved;
      }
      const fallback = "solana:mainnet-beta" as Chain;
      console.log("[Wallet] resolveChainIdentifier ->", fallback, "(fallback)");
      return fallback;
    },
    [currentChain, userSession?.chain]
  );

  const connect = useCallback(
    async (chainIdentifier?: Chain): Promise<Account> => {
      return await transact(async (wallet: Web3MobileWallet) => {
        return await authorizeSession(wallet, resolveChainIdentifier(chainIdentifier));
      });
    },
    [authorizeSession, resolveChainIdentifier]
  );

  const signIn = useCallback(
    async (
      signInPayload: SolanaSignInInput,
      chainIdentifier?: Chain,
    ): Promise<Account> => {
      return await transact(async (wallet: Web3MobileWallet) => {
        return await authorizeSessionWithSignIn(
          wallet,
          signInPayload,
          resolveChainIdentifier(chainIdentifier),
        );
      });
    },
    [authorizeSessionWithSignIn, resolveChainIdentifier]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await transact(async (wallet) => {
        await deauthorizeSession(wallet as any);
      });
    } catch {
      await deauthorizeSession();
    }
  }, [deauthorizeSession]);

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      minContextSlot?: number
    ): Promise<TransactionSignature | undefined> => {
      try {
        return await transact(async (wallet) => {
          await authorizeSession(wallet, resolveChainIdentifier());
          const attempt = async () => {
            const signatures = await wallet.signAndSendTransactions({
              transactions: [transaction],
              minContextSlot,
            });
            return signatures[0];
          };
          try {
            return await attempt();
          } catch (e: any) {
            if (isAuthorizationError(e)) {
              await authorizeSession(wallet, resolveChainIdentifier());
              return await attempt();
            }
            throw e;
          }
        });
      } catch (e) {
        logWalletError("signAndSendTransaction failed", e);
        throw e;
      }
    },
    [authorizeSession, deauthorizeSession, resolveChainIdentifier]
  );

  const signTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<Transaction | VersionedTransaction | undefined> => {
      try {
        return await transact(async (wallet) => {
          await authorizeSession(wallet, resolveChainIdentifier());
          const attempt = async () => {
            const signatures = await wallet.signTransactions({
              transactions: [transaction],
            });
            return signatures[0];
          };
          try {
            return await attempt();
          } catch (e: any) {
            if (isAuthorizationError(e)) {
              await authorizeSession(wallet, resolveChainIdentifier());
              return await attempt();
            }
            throw e;
          }
        });
      } catch (e) {
        logWalletError("signTransaction failed", e);
        throw e;
      }
    },
    [authorizeSession, deauthorizeSession, resolveChainIdentifier]
  );

  const signMessage = useCallback(
    async (message: Uint8Array, chainIdentifier?: Chain): Promise<{ signature: Uint8Array; publicKey: string }> => {
      return await transact(async (wallet) => {
        const chainToUse = resolveChainIdentifier(chainIdentifier);
        await authorizeSession(wallet, chainToUse);
        const attempt = async () => {
          if (selectedAccount?.address) {
            const signed = await wallet.signMessages({
              addresses: [selectedAccount.address],
              payloads: [message],
            });
            return {
              signature: signed[0],
              publicKey: selectedAccount.publicKey.toBase58(),
            };
          }
          const authResult = await authorizeSession(wallet, chainToUse);
          const signedMessages = await wallet.signMessages({
            addresses: [authResult.address],
            payloads: [message],
          });
          return {
            signature: signedMessages[0],
            publicKey: authResult.publicKey.toBase58(),
          };
        };
        try {
          return await attempt();
        } catch (e) {
          if (isCancellationError(e)) {
            const cancelError = new Error("Wallet request cancelled");
            cancelError.name = WALLET_CANCELLED_ERROR;
            throw cancelError;
          }
          if (isAuthorizationError(e)) {
            const authResult = await authorizeSession(wallet, chainToUse);
            const signedMessages = await wallet.signMessages({
              addresses: [authResult.address],
              payloads: [message],
            });
            return {
              signature: signedMessages[0],
              publicKey: authResult.publicKey.toBase58(),
            };
          }
          throw e;
        }
      });
    },
    [authorizeSession, resolveChainIdentifier, selectedAccount?.address, selectedAccount?.publicKey]
  );

  return useMemo(
    () => ({
      connect,
      signIn,
      disconnect,
      signAndSendTransaction,
      signTransaction,
      signMessage,
    }),
    [
      connect,
      signIn,
      disconnect,
      signAndSendTransaction,
      signTransaction,
      signMessage,
    ]
  );
}
