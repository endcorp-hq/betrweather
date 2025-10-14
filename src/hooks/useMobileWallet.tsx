import {
  useAuthorization,
} from "./solana/useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useMemo } from "react";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { type SolanaSignInInput } from "@solana/wallet-standard-features";
import { Web3MobileWallet, transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Account } from "src/types/solana-types";
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
    // Deauthorize with wallet (also clears local auth + JWT via hook)
    await transact(async (wallet) => {
      try { await deauthorizeSession(wallet as any); } catch {}
    });
  }, [deauthorizeSession]);

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      minContextSlot?: number
    ): Promise<TransactionSignature | undefined> => {
      try {
        return await transact(async (wallet) => {
          await authorizeSession(wallet);
          const signatures = await wallet.signAndSendTransactions({
            transactions: [transaction],
            minContextSlot,
          });
          return signatures[0];
        });
      } catch (e) {
        console.log("this is error", e);
        throw e;
      }
    },
    [authorizeSession]
  );

  const signTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<Transaction | VersionedTransaction | undefined> => {
      try {
        return await transact(async (wallet) => {
          await authorizeSession(wallet);
          const signatures = await wallet.signTransactions({
            transactions: [transaction],
          });
          return signatures[0];
        });
      } catch (e) {
        console.log("wallet signTransaction error", e);
        throw e;
      }
    },
    [authorizeSession]
  );

  const signMessage = useCallback(
    async (message: Uint8Array, chainIdentifier?: Chain): Promise<{ signature: Uint8Array; publicKey: string }> => {
      return await transact(async (wallet) => {
        try{
        const authResult = await authorizeSession(wallet, chainIdentifier);
        const signedMessages = await wallet.signMessages({
          addresses: [authResult.address],
          payloads: [message],
        });
        return {
          signature: signedMessages[0],
          publicKey: authResult.publicKey.toBase58(),
        }
        } catch (e) {
          console.log("this is error signing message", e);
          throw e;
        }
      });
    },
    [authorizeSession]
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
