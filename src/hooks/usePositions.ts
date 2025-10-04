import { useState, useCallback, useRef } from "react";
import {
  useAuthorization,
  useNftMetadata,
  useShortx,
  useCreateAndSendTx,
} from "./solana";

import { useToast } from "../contexts/CustomToast/ToastProvider";
import {
  PositionWithMarket,
  calculatePayout,
  extractErrorMessage,
} from "@/utils";
import { burnPosition } from "src/utils/positionUtils";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import { getMarketToken } from "src/utils/marketUtils";

import { useChain } from "@/contexts";

export function usePositions() {
  const { selectedAccount } = useAuthorization();
  const { fetchNftMetadata, loading, retryCount, lastError, clearError } = useNftMetadata();
  const { getMarketById, payoutPosition } = useShortx();
  const { toast } = useToast();
  const { createAndSendTx } = useCreateAndSendTx();
  const { currentChain } = useChain();

  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const lastRefreshTime = useRef<number>(0);
  const isRefreshing = useRef(false);

  // Add a function to update claiming state for a specific position
  const setPositionClaiming = useCallback(
    (positionId: number, positionNonce: number, isClaiming: boolean) => {
      setPositions((prev) =>
        prev.map((position) =>
          position.positionId === positionId &&
          position.positionNonce === positionNonce
            ? { ...position, isClaiming }
            : position
        )
      );
    },
    []
  );

  // Manual refresh function
  const refreshPositions = useCallback(async () => {
    if (!selectedAccount) return;

    setLoadingMarkets(true);
    try {
      const metadata = await fetchNftMetadata();
      if (metadata) {
        // Fetch market details for each position
        const positionsWithMarkets = await Promise.all(
          metadata.map(async (position) => {
            try {
              const market = await getMarketById(position.marketId);
              if (!market) {
                // Return null instead of position with null market
                return null;
              }
              return {
                ...position,
                assetId: umiPublicKey(position.assetId),
                direction: position.direction as "Yes" | "No",
                market: market,
              };
            } catch (error) {
              console.error(
                `Error fetching market ${position.marketId}:`,
                error
              );
              // Return null instead of position with null market
              return null;
            }
          })
        );

        // Filter out null values (positions without markets)
        const validPositions = positionsWithMarkets.filter(
          (position): position is NonNullable<typeof position> =>
            position !== null
        );

        setPositions(validPositions);
      }
    } catch (error) {
      console.error("Error refreshing positions:", error);
    } finally {
      setLoadingMarkets(false);
    }
  }, [selectedAccount, fetchNftMetadata, getMarketById]);

  // Unified transaction handler for both claim and burn operations
  const handlePositionTransaction = useCallback(
    async (
      position: PositionWithMarket,
      operation: 'claim' | 'burn',
      createTransaction: () => Promise<any>
    ) => {
      // Set claiming state for this specific position
      setPositionClaiming(position.positionId, position.positionNonce, true);

      // Define labels based on operation
      const labels = {
        loading: operation === 'claim' ? 'Claiming Payout' : 'Burning Position',
        processing: operation === 'claim' ? 'Processing your claim...' : 'Processing your burn...',
        processingTx: 'Transaction sent to blockchain...',
        transactionSent: 'Transaction Sent',
        processingBlockchain: 'Processing on blockchain...',
        success: operation === 'claim' ? 'Payout Claimed!' : 'Position Burned!',
        successMessage: (amount: number) => 
          operation === 'claim' 
            ? `Successfully claimed ${amount.toFixed(4)} ${getMarketToken(position.market.mint)}!`
            : 'Position successfully burned!',
        error: operation === 'claim' ? 'Failed to claim payout' : 'Failed to burn position'
      };

      // Show loading toast
      const loadingToastId = toast.loading(
        labels.loading,
        labels.processing,
        { position: "top" }
      );

      if (!selectedAccount) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Please connect your wallet",
          duration: 4000,
        });
        setPositionClaiming(position.positionId, position.positionNonce, false);
        return;
      }

      try {
        const tx = await createTransaction();

        if (!tx) {
          toast.update(loadingToastId, {
            type: "error",
            title: "Error",
            message: "Failed to create transaction",
            duration: 4000,
          });
          setPositionClaiming(position.positionId, position.positionNonce, false);
          return;
        }

        // Show immediate feedback that transaction is being processed
        toast.update(loadingToastId, {
          type: "loading",
          title: "Processing...",
          message: labels.processingTx,
          duration: 2000,
        });

        // Send the transaction in background to avoid blocking UI
        Promise.resolve().then(async () => {
          try {
            let signature;

            // Send the transaction using createAndSendTx (handles both claim and burn)
            signature = await createAndSendTx([], true, tx);

            if (signature) {
              // Remove position from UI immediately for better UX
              setPositions((prev) =>
                prev.filter(
                  (p) =>
                    !(
                      p.positionId === position.positionId &&
                      p.positionNonce === position.positionNonce
                    )
                )
              );

              // Show final success message by updating the existing toast
              const successMessage = operation === 'claim' 
                ? labels.successMessage(calculatePayout(position) || 0)
                : labels.successMessage(0);
                
              toast.update(loadingToastId, {
                type: "success",
                title: labels.success,
                message: successMessage,
                duration: 4000,
              });

              // Reset claiming state immediately
              setPositionClaiming(position.positionId, position.positionNonce, false);
            } else {
              // Transaction failed
              toast.update(loadingToastId, {
                type: "error",
                title: "Error",
                message: "Transaction failed. Please try again.",
                duration: 4000,
              });
              setPositionClaiming(position.positionId, position.positionNonce, false);
            }
          } catch (error) {
            console.error(`Error in background ${operation} transaction:`, error);
            toast.update(loadingToastId, {
              type: "error",
              title: "Error",
              message: "Transaction failed. Please try again.",
              duration: 4000,
            });
            setPositionClaiming(position.positionId, position.positionNonce, false);
          }
        });

      } catch (error) {
        console.error(`Error ${operation}ing position:`, error);
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: extractErrorMessage(error, labels.error),
          duration: 4000,
        });
        setPositionClaiming(position.positionId, position.positionNonce, false);
      }
    },
    [
      selectedAccount,
      createAndSendTx,
      toast,
      setPositionClaiming,
      calculatePayout,
    ]
  );

  // Claim payout handler
  const handleClaimPayout = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;
      
      await handlePositionTransaction(position, 'claim', () =>
        payoutPosition({
          marketId: position.marketId,
          payer: selectedAccount.publicKey,
          assetId: new Web3PublicKey(position.assetId),
        })
      );
    },
    [handlePositionTransaction, payoutPosition, selectedAccount]
  );

  // Burn position handler
  const handleBurnPosition = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;
      
      await handlePositionTransaction(position, 'burn', async () => {
        const umiTx = await burnPosition(position, selectedAccount, currentChain || "devnet");
        if (!umiTx) return null;
        
        // Convert UMI transaction to Solana transaction
        const solanaTx = toWeb3JsTransaction(umiTx);
        return solanaTx;
      });
    },
    [handlePositionTransaction, burnPosition, selectedAccount, currentChain]
  );

  // Filter out positions with null markets for better UX
  const validPositions = positions.filter(
    (position) => position.market !== null
  );

  return {
    positions: validPositions,
    loading,
    loadingMarkets,
    refreshPositions,
    handleClaimPayout,
    handleBurnPosition,
    lastError,
    retryCount,
  };
}
