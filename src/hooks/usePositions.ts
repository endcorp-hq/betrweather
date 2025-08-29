import { useState, useCallback } from "react";
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
  const { fetchNftMetadata, loading } = useNftMetadata();
  const { getMarketById, payoutPosition } = useShortx();
  const { toast } = useToast();
  const { createAndSendTx } = useCreateAndSendTx();
  const { currentChain } = useChain();

  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

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
  }, [selectedAccount]);

  const handleClaimPayout = useCallback(
    async (position: PositionWithMarket) => {
      // Set claiming state for this specific position
      setPositionClaiming(position.positionId, position.positionNonce, true);

      // Show loading toast
      const loadingToastId = toast.loading(
        "Claiming Payout",
        "Processing your claim...",
        {
          position: "top",
        }
      );

      if (!selectedAccount) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Please connect your wallet to claim your payout",
          duration: 4000,
        });
        setPositionClaiming(position.positionId, position.positionNonce, false);
        return;
      }

      try {
        const tx = await payoutPosition({
          marketId: position.marketId,
          positionId: position.positionId,
          positionNonce: position.positionNonce,
          payer: selectedAccount?.publicKey,
        });

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

        // Send the transaction and wait for confirmation
        const signature = await createAndSendTx([], true, tx);

        if (signature) {
          // Transaction was successful - remove the position and show success
          setPositions((prev) =>
            prev.filter(
              (p) =>
                !(
                  p.positionId === position.positionId &&
                  p.positionNonce === position.positionNonce
                )
            )
          );

          toast.update(loadingToastId, {
            type: "success",
            title: "Claim Successful!",
            message: `Successfully claimed $${(
              calculatePayout(position) || 0
            ).toFixed(2)} payout`,
            duration: 4000,
          });

          // Refresh positions to ensure UI is up to date
          setTimeout(() => {
            refreshPositions();
          }, 1000);
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
        console.error("Error claiming payout:", error);
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: extractErrorMessage(error, "Failed to claim payout"),
          duration: 4000,
        });
        setPositionClaiming(position.positionId, position.positionNonce, false);
      }
    },
    [
      selectedAccount,
      payoutPosition,
      createAndSendTx,
      toast,
      setPositionClaiming,
      refreshPositions,
    ]
  );

  const handleBurnPosition = useCallback(
    async (position: PositionWithMarket) => {
      // Set claiming state for this specific position
      setPositionClaiming(position.positionId, position.positionNonce, true);

      // Show loading toast
      const loadingToastId = toast.loading(
        "Burning Position",
        "Processing your nft...",
        {
          position: "top",
        }
      );

      if (!selectedAccount) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Please connect your wallet to burn your position",
          duration: 4000,
        });
        setPositionClaiming(position.positionId, position.positionNonce, false);
        return;
      }

      try {
        const burnTx = await burnPosition(position, selectedAccount?.publicKey, currentChain || "devnet");

        if (!burnTx) {
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

        const web3Tx = toWeb3JsTransaction(burnTx);
        const signature = await createAndSendTx(
          [],
          true,
          web3Tx
        );
        if (signature) {
          // Transaction was successful - remove the position and show success
          setPositions((prev) =>
            prev.filter(
              (p) =>
                !(
                  p.positionId === position.positionId &&
                  p.positionNonce === position.positionNonce
                )
            )
          );

          toast.update(loadingToastId, {
            type: "success",
            title: "Burn Successful!",
            message: `Successfully burned your position`,
            duration: 4000,
          });

          // Refresh positions to ensure UI is up to date
          setTimeout(() => {
            refreshPositions();
          }, 1000);
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
        console.error("Error burning position:", error);
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: extractErrorMessage(error, "Failed to burn position"),
          duration: 4000,
        });
      }
    },
    [selectedAccount, createAndSendTx, refreshPositions]
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
  };
}
