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

export function useMobileWallet() {
  const { authorizeSessionWithSignIn, authorizeSession, deauthorizeSession } =
    useAuthorization();

  const connect = useCallback(
    async (chainIdentifier?: Chain): Promise<Account> => {
      return await transact(async (wallet: Web3MobileWallet) => {
        return await authorizeSession(wallet, chainIdentifier);
      });
    },
    [authorizeSession]
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
          chainIdentifier,
        );
      });
    },
    [authorizeSessionWithSignIn]
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
          try {
            await authorizeSession(wallet);
            const signatures = await wallet.signAndSendTransactions({
              transactions: [transaction],
              minContextSlot,
            });
            return signatures[0];
          } catch (e: any) {
            const msg = String(e?.message || e || "");
            // Retry once if wallet session is stale
            if (msg.includes('authorization request failed') || msg.includes('auth')) {
              try { await deauthorizeSession(wallet as any); } catch {}
              await authorizeSession(wallet);
              const signatures = await wallet.signAndSendTransactions({
                transactions: [transaction],
                minContextSlot,
              });
              return signatures[0];
            }
            throw e;
          }
        });
      } catch (e) {
        console.log("this is error", e);
        throw e;
      }
    },
    [authorizeSession, deauthorizeSession]
  );

  const signTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<Transaction | VersionedTransaction | undefined> => {
      try {
        return await transact(async (wallet) => {
          try {
            await authorizeSession(wallet);
            const signatures = await wallet.signTransactions({
              transactions: [transaction],
            });
            return signatures[0];
          } catch (e: any) {
            const msg = String(e?.message || e || "");
            // Retry once on stale/invalid auth
            if (msg.includes('authorization request failed') || msg.includes('auth')) {
              try { await deauthorizeSession(wallet as any); } catch {}
              await authorizeSession(wallet);
              const signatures = await wallet.signTransactions({
                transactions: [transaction],
              });
              return signatures[0];
            }
            throw e;
          }
        });
      } catch (e) {
        console.log("wallet signTransaction error", e);
        throw e;
      }
    },
    [authorizeSession, deauthorizeSession]
  );

  const signMessage = useCallback(
    async (message: Uint8Array, chainIdentifier?: Chain): Promise<{ signature: Uint8Array; publicKey: string }> => {
      return await transact(async (wallet) => {
        try {
          const authResult = await authorizeSession(wallet, chainIdentifier);
          const signedMessages = await wallet.signMessages({
            addresses: [authResult.address],
            payloads: [message],
          });
          return {
            signature: signedMessages[0],
            publicKey: authResult.publicKey.toBase58(),
          };
        } catch (e) {
          if (isCancellationError(e)) {
            try {
              await deauthorizeSession(wallet as any);
            } catch {
              await deauthorizeSession();
            }
            const cancelError = new Error("Wallet request cancelled");
            cancelError.name = WALLET_CANCELLED_ERROR;
            throw cancelError;
          }
          throw e;
        }
      });
    },
    [authorizeSession, deauthorizeSession]
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
