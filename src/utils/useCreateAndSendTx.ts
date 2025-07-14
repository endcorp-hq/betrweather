import {
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  ComputeBudgetProgram,
  AddressLookupTableAccount,
  Connection,
  Keypair,
} from "@solana/web3.js";
import { useCallback, useState } from "react";
import axios from "axios";
import { useMobileWallet } from "./useMobileWallet";
import { useAuthorization } from "./useAuthorization";

const getPriorityFee = async () => {
  let fee = 1000;

  try {
    const response = await axios.get<
      Record<"1" | "5" | "15", { priorityTx: number }>
    >("https://solanacompass.com/api/fees");
    fee = response.data[1].priorityTx;
  } catch (e) {
    console.log("error getting priority fee", e);
    fee = 1000;
  }

  return fee;
};

export function useCreateAndSendTx() {
  const { signAndSendTransaction } = useMobileWallet();
  const { selectedAccount } = useAuthorization();
  const [isLoading, setIsLoading] = useState(false);

  const createAndSendTx = useCallback(
    async (
      instructions: TransactionInstruction[],
      signatureRequired: boolean,
      signedVersionedTransaction?: VersionedTransaction,
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
      if (!selectedAccount?.publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!signAndSendTransaction) {
        throw new Error("Wallet does not support signing transactions");
      }

      setIsLoading(true);

      try {
        const connection = new Connection(
          process.env.EXPO_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
        );

        // If a signed versioned transaction is provided, send it directly
        if (signedVersionedTransaction) {
          console.log(Buffer.from(signedVersionedTransaction.serialize()).toString("base64"));

          if (signatureRequired) {
            // Use signAndSendTransaction for the signed transaction
            const signature = await signAndSendTransaction(signedVersionedTransaction);
            
            // Wait for confirmation
            await connection.confirmTransaction(signature, "confirmed");
            
            return signature;
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
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        console.log("this is blockhash", blockhash);
        // Create versioned transaction
        const tx = new VersionedTransaction(
          new TransactionMessage({
            instructions,
            recentBlockhash: blockhash,
            payerKey: selectedAccount.publicKey,
          }).compileToV0Message(addressLookupTableAccounts)
        );

        console.log("this is tx", tx);

        if (signatureRequired) {
          // Use signAndSendTransaction from wallet
          console.log("this is await signAndSendTransaction");
          const signature = await signAndSendTransaction(tx);
          
          // Wait for confirmation
          await connection.confirmTransaction(signature, "confirmed");
          
          return signature;
        } else {
          // If no signature required, just send the transaction
          const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight,
          });
          
          // Wait for confirmation
          await connection.confirmTransaction(signature, "confirmed");
          
          return signature;
        }

      } catch (error) {
        console.error("Error creating and sending transaction:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount?.publicKey, signAndSendTransaction]
  );

  return {
    createAndSendTx,
    isLoading,
  };
}
