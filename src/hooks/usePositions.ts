import React, { useState, useCallback, useRef } from "react";
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
import { toWeb3JsTransaction } from '@metaplex-foundation/umi-web3js-adapters';
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

  // Refresh function that prevents unnecessary calls
  const refreshPositions = useCallback(async (force = false, showLoading = true) => {
    if (!selectedAccount || isRefreshing.current) return;
    
    // Prevent refreshing too frequently (minimum 5 seconds between calls)
    const now = Date.now();
    if (!force && now - lastRefreshTime.current < 5000) {
      return;
    }

    isRefreshing.current = true;
    if (showLoading) {
      setLoadingMarkets(true);
    }
    
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
        lastRefreshTime.current = now;
      }
    } catch (error) {
      console.error("Error refreshing positions:", error);
      
      // Show user-friendly error messages for different scenarios
      if (lastError) {
        if (lastError.includes("400") && retryCount > 0) {
          // This is a retry scenario - show informative message
          toast.error(
            "Loading Positions",
            `New bets may still be processing. Retry ${retryCount}/3 completed.`,
            { position: "top", duration: 3000 }
          );
        } else if (lastError.includes("Max retries")) {
          // Max retries exceeded
          toast.error(
            "Loading Failed",
            "Unable to load positions after multiple attempts. Please try again later.",
            { position: "top", duration: 5000 }
          );
        } else {
          // Other errors
          toast.error(
            "Loading Error",
            "Failed to load positions. Please check your connection and try again.",
            { position: "top", duration: 4000 }
          );
        }
      }
    } finally {
      if (showLoading) {
        setLoadingMarkets(false);
      }
      isRefreshing.current = false;
    }
  }, [selectedAccount, fetchNftMetadata, getMarketById, lastError, retryCount, toast]);



  // Manual refresh function for user-initiated refreshes
  const manualRefresh = useCallback(() => {
    refreshPositions(true, true); // Force refresh with loading
  }, [refreshPositions]);

  // Initial fetch with delay to allow new bets to process
  React.useEffect(() => {
    if (selectedAccount && positions.length === 0 && !loading) {
      // Only trigger initial fetch if we don't have positions loaded yet and not currently loading
      const initialFetchTimer = setTimeout(() => {
        refreshPositions(true, false); // Initial fetch without loading UI
      }, 3000);

      return () => clearTimeout(initialFetchTimer);
    }
  }, [selectedAccount, refreshPositions, positions.length, loading]);



  // Unified transaction handler for both claim and burn operations
  const handlePositionTransaction = useCallback(
    async (
      position: PositionWithMarket,
      operation: 'claim' | 'burn',
      createTransaction: () => Promise<any>
    ) => {
      const operationLabels = {
        claim: {
          loading: "Claiming Payout",
          processing: "Processing your claim...",
          processingTx: "Sending claim transaction to blockchain...",
          transactionSent: "Claim transaction sent!",
          processingBlockchain: "Your claim is being processed on the blockchain...",
          success: "Claim Successful!",
          successMessage: (amount: number) => `Successfully claimed $${amount.toFixed(2)} payout`,
          error: "Failed to claim payout"
        },
        burn: {
          loading: "Burning Position",
          processing: "Processing your position...",
          processingTx: "Sending burn transaction to blockchain...",
          transactionSent: "Burn transaction sent!",
          processingBlockchain: "Your position is being burned on the blockchain...",
          success: "Burn Successful!",
          successMessage: (amount?: number) => "Successfully burned your position",
          error: "Failed to burn position"
        }
      };

      const labels = operationLabels[operation];

      // Set claiming state for this specific position
      setPositionClaiming(position.positionId, position.positionNonce, true);

      // Show loading toast
      const loadingToastId = toast.loading(
        labels.loading,
        labels.processing,
        {
          position: "top",
        }
      );

      if (!selectedAccount) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Please connect your wallet to continue",
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
          setPositionClaiming(
            position.positionId,
            position.positionNonce,
            false
          );
          return;
        }

        // Show immediate feedback that transaction is being processed
        toast.update(loadingToastId, {
          type: "success",
          title: "Processing...",
          message: labels.processingTx,
          duration: 2000,
        });

        // Send the transaction in background to avoid blocking UI
        Promise.resolve().then(async () => {
          try {
            const signature = await createAndSendTx([], true, tx);
            
            if (signature) {
              // Update toast to show transaction sent
              toast.update(loadingToastId, {
                type: "success",
                title: labels.transactionSent,
                message: labels.processingBlockchain,
                duration: 4000,
              });

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

              // Show final success message
              const successMessage = operation === 'claim' 
                ? labels.successMessage(calculatePayout(position) || 0)
                : labels.successMessage(0);
                
              toast.success(
                labels.success,
                successMessage,
                { position: "top", duration: 4000 }
              );

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
              setPositionClaiming(
                position.positionId,
                position.positionNonce,
                false
              );
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
          positionId: position.positionId,
          positionNonce: position.positionNonce,
          payer: selectedAccount.publicKey,
        })
      );
    },
    [handlePositionTransaction, payoutPosition, selectedAccount]
  );

  // Burn position handler
  const handleBurnPosition = useCallback(
    async (position: PositionWithMarket) => {
      if (!selectedAccount?.publicKey) return;
      
      await handlePositionTransaction(position, 'burn', () =>
        burnPosition(position, selectedAccount.publicKey, currentChain || "devnet")
      );
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
    refreshPositions: manualRefresh, // Expose manual refresh instead of auto-refresh
    handleClaimPayout,
    handleBurnPosition,
    lastError,
    retryCount,
  };
}
