import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Account, useAuthorization } from "./solana/useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useMemo } from "react";
import { Chain, SignInPayload } from "@solana-mobile/mobile-wallet-adapter-protocol";

export function useMobileWallet() {
  const { authorizeSessionWithSignIn, authorizeSession, deauthorizeSession } =
    useAuthorization();

  const connect = useCallback(async (chainIdentifier?: Chain): Promise<Account> => {
    return await transact(async (wallet) => {
      return await authorizeSession(wallet, chainIdentifier);
    });
  }, [authorizeSession]);

  const signIn = useCallback(
    async (signInPayload: SignInPayload, chainIdentifier?: Chain): Promise<Account> => {
      return await transact(async (wallet) => {
        return await authorizeSessionWithSignIn(wallet, signInPayload, chainIdentifier);
      });
    },
    [authorizeSessionWithSignIn]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    await transact(async (wallet) => {
      await deauthorizeSession(wallet);
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
      }
    },
    [authorizeSession]
  );

  const signTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
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
        console.log("this is error", e);
      }
    },
    [authorizeSession]
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      return await transact(async (wallet) => {
        const authResult = await authorizeSession(wallet);
        const signedMessages = await wallet.signMessages({
          addresses: [authResult.address],
          payloads: [message],
        });
        return signedMessages[0];
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
    [connect, signIn, disconnect, signAndSendTransaction, signTransaction, signMessage]
  );
}
