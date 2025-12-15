import {
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  ComputeBudgetProgram,
  AddressLookupTableAccount,
  Keypair,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";
import axios from "axios";
// OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
// import { useAuthorization } from "./useAuthorization";
// import { useMobileWallet } from "../useMobileWallet";
import { useChain } from "../../contexts/ChainProvider";
import { usePrivy } from "@privy-io/expo";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";

const getPriorityFee = async () => {
  let fee = 1000;

  try {
    const response = await axios.get<
      Record<"1" | "5" | "15", { priorityTx: number }>
    >("https://solanacompass.com/api/fees");
    fee = response.data[1].priorityTx;
  } catch (e) {
    fee = 1000;
  }

  return fee;
};

/**
 * Get wallet address and public key from Privy user
 */
function getPrivyWalletInfo(privyUser: any): { address: string | null; publicKey: PublicKey | null } {
  const walletAccount = privyUser?.linked_accounts?.find(
    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
  );
  if (walletAccount?.address) {
    try {
      return {
        address: walletAccount.address,
        publicKey: new PublicKey(walletAccount.address),
      };
    } catch {
      // Invalid public key
    }
  }
  
  if (privyUser?.wallet?.address) {
    try {
      return {
        address: privyUser.wallet.address,
        publicKey: new PublicKey(privyUser.wallet.address),
      };
    } catch {
      // Invalid public key
    }
  }
  
  return { address: null, publicKey: null };
}

export function useCreateAndSendTx() {
  // OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
  // const { signTransaction } = useMobileWallet();
  // const { selectedAccount } = useAuthorization();
  const { user: privyUser, isReady } = usePrivy();
  const { wallets } = useEmbeddedSolanaWallet();
  const { connection } = useChain();
  const [isLoading, setIsLoading] = useState(false);

  if (!connection) {
    throw new Error("RPC URL not found");
  }

  // Get wallet info from Privy
  const walletInfo = useMemo(() => {
    if (!privyUser || !isReady) {
      return { address: null, publicKey: null };
    }
    return getPrivyWalletInfo(privyUser);
  }, [privyUser, isReady]);

  // Get Privy wallet for signing
  const privyWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) {
      return null;
    }
    return wallets[0];
  }, [wallets]);

  const createAndSendTx = useCallback(
    async (
      instructions: TransactionInstruction[],
      signatureRequired: boolean,
      signedVersionedTransaction?: VersionedTransaction,
      transaction?: Transaction,
      {
        skipPreflight,
        microLamports,
        addressLookupTableAccounts,
      }: {
        skipPreflight?: boolean;
        microLamports?: number;
        addressLookupTableAccounts?: AddressLookupTableAccount[];
        signers?: Keypair[];
      } = {}
    ) => {
      if (!walletInfo.publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!privyWallet) {
        throw new Error("Wallet does not support signing transactions");
      }

      setIsLoading(true);

      try {

        // If a signed versioned transaction is provided, send it directly
        if (signedVersionedTransaction) {
          if (signatureRequired) {
            // Sign with Privy wallet
            const provider = await privyWallet.getProvider();
            const { signedTransaction: signedTx } = await provider.request({
              method: 'signTransaction',
              params: {
                transaction: signedVersionedTransaction,
              },
            });
            if (signedTx) {
              signedVersionedTransaction = signedTx as VersionedTransaction;
            }
          }

          // If no signature required, just send the transaction
          const signature = await connection.sendRawTransaction(
            signedVersionedTransaction.serialize(),
            { skipPreflight }
          );

          // Wait for confirmation
          await connection.confirmTransaction(signature, "confirmed");

          return signature;
        }

        if (transaction) {
          if (signatureRequired) {
            // Sign with Privy wallet
            const provider = await privyWallet.getProvider();
            const { signedTransaction: signedTx } = await provider.request({
              method: 'signTransaction',
              params: {
                transaction: transaction,
              },
            });
            if (signedTx) {
              transaction = signedTx as Transaction;
            }
          }

          // If no signature required, just send the transaction
          const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight }
          );

          // Wait for confirmation
          await connection.confirmTransaction(signature, "confirmed");

          return signature;
        }

        // Add priority fee instruction
        if (microLamports) {
          instructions.push(
            ComputeBudgetProgram.setComputeUnitLimit({
              units: microLamports,
            })
          );
        } else {
          const priorityFee = await getPriorityFee();
          instructions.push(
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee,
            })
          );
        }

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        // Log instruction metadata for debugging
        try {
          console.log(
            "[Tx Build] Instructions:",
            instructions.map((ix, idx) => ({
              index: idx,
              programId: ix.programId?.toBase58?.() ?? String(ix.programId),
              keys: ix.keys?.map(k => ({
                pubkey: k.pubkey?.toBase58?.() ?? String(k.pubkey),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
              })),
              dataLen: ix.data?.length ?? 0,
            }))
          );
        } catch (e) {
          console.warn("[Tx Build] Failed to log instructions:", e);
        }

        // Create versioned transaction
        const tx = new VersionedTransaction(
          new TransactionMessage({
            instructions,
            recentBlockhash: blockhash,
            payerKey: walletInfo.publicKey,
          }).compileToV0Message(addressLookupTableAccounts)
        );

        console.log("[Tx Build] VersionedTransaction created");

        if (signatureRequired) {
          // Sign with Privy wallet
          const provider = await privyWallet.getProvider();
          const { signedTransaction } = await provider.request({
            method: 'signTransaction',
            params: {
              transaction: tx,
            },
          });
          let signature: string | undefined;
          if (signedTransaction) {
            // Pre-send simulation for better error diagnostics (only for VersionedTransaction)
            try {
              if ((signedTransaction as any).version !== undefined) {
                const sim = await connection.simulateTransaction(
                  signedTransaction as VersionedTransaction,
                  { sigVerify: true }
                );
                if (sim?.value?.err) {
                  console.error("[Tx Simulate] Error:", sim.value.err);
                  if (sim.value.logs) console.error("[Tx Simulate] Logs:", sim.value.logs);
                  const err = new Error("Transaction simulation failed");
                  // @ts-ignore attach logs
                  err.__simulation = sim.value;
                  throw err;
                } else {
                  console.log("[Tx Simulate] OK");
                }
              } else {
                console.log("[Tx Simulate] Skipped for legacy Transaction type");
              }
            } catch (simErr) {
              console.error("[Tx Simulate] Exception:", simErr);
              throw simErr;
            }

            signature = await connection.sendRawTransaction(
              signedTransaction.serialize(),
              {
                skipPreflight,
              }
            );
            console.log("[Tx Send] signature:", signature);
          }

          if (signature) {
            // Wait for confirmation
            await connection.confirmTransaction(signature, "confirmed");
            // Extra status checks and logging
            try {
              const [status, parsed] = await Promise.all([
                connection.getSignatureStatuses([signature]),
                connection.getParsedTransaction(signature, {
                  maxSupportedTransactionVersion: 0,
                } as any),
              ]);
              console.log("[Tx Status]", status?.value?.[0]);
              if (parsed) console.log("[Tx Parsed]", parsed?.meta);
              const err = status?.value?.[0]?.err ?? parsed?.meta?.err;
              if (err) {
                console.error("[Tx Confirmed With Error]", err);
                throw new Error("Transaction confirmed with error");
              }
            } catch (postErr) {
              console.error("[Tx Post-Confirm] Error while checking status:", postErr);
              throw postErr;
            }
          }

          return signature;
        } else {
          // If no signature required, just send the transaction
          const signature = await connection.sendRawTransaction(
            tx.serialize(),
            {
              skipPreflight,
            }
          );
          console.log("[Tx Send] signature:", signature);

          // Wait for confirmation
          await connection.confirmTransaction(signature, "confirmed");
          try {
            const [status, parsed] = await Promise.all([
              connection.getSignatureStatuses([signature]),
              connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,
              } as any),
            ]);
            console.log("[Tx Status]", status?.value?.[0]);
            if (parsed) console.log("[Tx Parsed]", parsed?.meta);
            const err = status?.value?.[0]?.err ?? parsed?.meta?.err;
            if (err) {
              console.error("[Tx Confirmed With Error]", err);
              throw new Error("Transaction confirmed with error");
            }
          } catch (postErr) {
            console.error("[Tx Post-Confirm] Error while checking status:", postErr);
            throw postErr;
          }

          return signature;
        }
      } catch (error) {
        console.error("Error creating and sending transaction:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [walletInfo.publicKey, privyWallet, connection]
  );

  const buildVersionedTx = useCallback(
    async (
      instructions: TransactionInstruction[],
      {
        microLamports,
        addressLookupTableAccounts,
      }: {
        microLamports?: number;
        addressLookupTableAccounts?: AddressLookupTableAccount[];
      } = {}
    ): Promise<VersionedTransaction> => {
      if (!walletInfo.publicKey) {
        throw new Error("Wallet not connected");
      }
      if (!connection) {
        throw new Error("RPC URL not found");
      }

      // Add priority fee or limit
      if (microLamports) {
        instructions.unshift(
          ComputeBudgetProgram.setComputeUnitLimit({ units: microLamports })
        );
      } else {
        const priorityFee = await getPriorityFee();
        instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })
        );
      }

      // Latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      const tx = new VersionedTransaction(
        new TransactionMessage({
          instructions,
          recentBlockhash: blockhash,
          payerKey: walletInfo.publicKey,
        }).compileToV0Message(addressLookupTableAccounts)
      );

      return tx;
    },
    [walletInfo.publicKey, connection]
  );

  return {
    createAndSendTx,
    buildVersionedTx,
    isLoading,
  };
}
