import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Account, useAuthorization } from "./solana/useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useMemo } from "react";
import { Chain, SignInPayload } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { Platform } from "react-native";

export function useMobileWallet() {
  const { authorizeSessionWithSignIn, authorizeSession, clearSession, setWebAuthorization } =
    useAuthorization();

  const connect = useCallback(async (chainIdentifier?: Chain): Promise<Account> => {
    if (Platform.OS === 'web') {
      const provider = (globalThis as any)?.solana;
      if (!provider?.isPhantom && !provider?.isSolflare) {
        throw new Error('No web wallet detected. Please install Phantom or Solflare.');
      }
      const res = await provider.connect?.({ onlyIfTrusted: false });
      const pkBytes: Uint8Array = provider.publicKey?._bn ? provider.publicKey.toBytes() : provider.publicKey?.toBytes?.() ?? new Uint8Array();
      const pubkey = new (await import('@solana/web3.js')).PublicKey(pkBytes);
      return await setWebAuthorization(pubkey);
    }
    return await transact(async (wallet) => {
      return await authorizeSession(wallet, chainIdentifier);
    });
  }, [authorizeSession, setWebAuthorization]);

  const signIn = useCallback(
    async (signInPayload: SignInPayload, chainIdentifier?: Chain): Promise<Account> => {
      if (Platform.OS === 'web') {
        // For SIWS on web, just ensure web authorization is set; backend will verify message we sign later via signMessage
        const provider = (globalThis as any)?.solana;
        if (!provider?.publicKey) throw new Error('No connected wallet');
        const pkBytes: Uint8Array = provider.publicKey?._bn ? provider.publicKey.toBytes() : provider.publicKey?.toBytes?.() ?? new Uint8Array();
        const pubkey = new (await import('@solana/web3.js')).PublicKey(pkBytes);
        return await setWebAuthorization(pubkey);
      }
      return await transact(async (wallet) => {
        return await authorizeSessionWithSignIn(wallet, signInPayload, chainIdentifier);
      });
    },
    [authorizeSessionWithSignIn, setWebAuthorization]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    // Prefer local-only logout for smoother UX
    clearSession();
    // Optionally, also deauthorize with wallet in background later if desired
  }, [clearSession]);

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      minContextSlot?: number
    ): Promise<TransactionSignature | undefined> => {
      try {
        if (Platform.OS === 'web') {
          const provider = (globalThis as any)?.solana;
          if (!provider?.signAndSendTransaction) throw new Error('Web wallet does not support signAndSendTransaction');
          // Phantom expects a serialized transaction (Versioned or legacy)
         
          // @ts-ignore serialize exists for both types
          const signed = await provider.signAndSendTransaction(transaction);
          return signed?.signature as string | undefined;
        }
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
        if (Platform.OS === 'web') {
          const provider = (globalThis as any)?.solana;
          if (!provider?.signTransaction) throw new Error('Web wallet does not support signTransaction');
          const signed = await provider.signTransaction(transaction);
          return signed;
        }
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
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (Platform.OS === 'web') {
        const provider = (globalThis as any)?.solana;
        if (!provider?.signMessage) throw new Error('Web wallet does not support signMessage');
        const { signature } = await provider.signMessage(message, 'utf8');
        return signature as Uint8Array;
      }
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
