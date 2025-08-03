import { useState, useCallback, useRef } from "react";
import { useAuthorization } from "../solana/useAuthorization";
import { useNftMetadata } from "../solana/useNft";
import { useShortx } from "../solana/useContract";
import { useGlobalToast } from "../components/ui/ToastProvider";
import { useCreateAndSendTx } from "../solana/useCreateAndSendTx";
import { extractErrorMessage } from "../utils/helpers";
import { PositionWithMarket, calculatePayout } from "../utils/positionUtils";
import { debugLog, debugError, debugWarn, debugPerformance } from "../utils/debugUtils";
import { marketCache, createMarketCacheKey, CACHE_TTL } from "../utils/cacheUtils";

// Rate limiting utility for market fetching (kept for future use)
const marketRateLimiter = {
  lastCall: 0,
  minInterval: 200, // Increased to 200ms between market calls
  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }
    this.lastCall = Date.now();
  }
};

// Simplified batch processing utility for markets
const marketBatchProcessor = {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 1, // Process 1 market at a time to avoid rate limiting
    delayBetweenBatches: number = 500 // Increased delay between batches
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid overwhelming the API
      for (const item of batch) {
        try {
          const result = await processor(item);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          debugWarn(`Failed to process item:`, error);
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
};

export function usePositions() {
  const { selectedAccount } = useAuthorization();
  const { fetchNftMetadata, loading } = useNftMetadata();
  const { getMarketById, payoutPosition } = useShortx();
  const { toast } = useGlobalToast();
  const { createAndSendTx } = useCreateAndSendTx();
  
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const lastRefreshTime = useRef(0);
  const isRefreshing = useRef(false);

  // Add a function to update claiming state for a specific position
  const setPositionClaiming = useCallback((positionId: number, positionNonce: number, isClaiming: boolean) => {
    setPositions(prev => 
      prev.map(position => 
        position.positionId === positionId && position.positionNonce === positionNonce
          ? { ...position, isClaiming }
          : position
      )
    );
  }, []);

  // Manual refresh function
  const refreshPositions = useCallback(async () => {
    if (!selectedAccount) {
      debugLog("No selected account, skipping position refresh");
      return;
    }
    
    // Prevent multiple simultaneous refreshes
    const now = Date.now();
    if (isRefreshing.current || now - lastRefreshTime.current < 3000) { // 3 second cooldown
      debugLog("Skipping refresh - already refreshing or too soon since last refresh");
      return;
    }
    
    isRefreshing.current = true;
    lastRefreshTime.current = now;
    
    const startTime = performance.now();
    setLoadingMarkets(true);
    
    try {
      debugLog("Fetching NFT metadata for positions...");
      const metadata = await fetchNftMetadata();
      
      if (!metadata || metadata.length === 0) {
        debugLog("No NFT metadata found, clearing positions");
        setPositions([]);
        return;
      }
      
      debugLog(`Found ${metadata.length} NFT metadata entries, fetching market details...`);
      
      // Use simplified batch processing to fetch markets with rate limiting and caching
      const positionsWithMarkets = await marketBatchProcessor.processBatch(
        metadata,
        async (position) => {
          try {
            const cacheKey = createMarketCacheKey(position.marketId);
            
            // Check cache first
            const cachedMarket = marketCache.get(cacheKey);
            if (cachedMarket) {
              debugLog(`Using cached market ${position.marketId}`);
              return {
                ...position,
                direction: position.direction as "Yes" | "No",
                market: cachedMarket,
              };
            }
            
            await marketRateLimiter.wait(); // Wait before each market call
            const marketStartTime = performance.now();
            
            const market = await getMarketById(position.marketId);
            debugPerformance(`Fetch market ${position.marketId}`, marketStartTime);
            
            if(!market) {
              debugWarn(`Market ${position.marketId} not found for position ${position.positionId}`);
              return null;
            }
            
            // Cache the market data
            marketCache.set(cacheKey, market, CACHE_TTL.MARKET_DATA);
            debugLog(`Cached market ${position.marketId}`, { 
              cacheKey,
              cacheSize: marketCache.size()
            });
            
            return {
              ...position,
              direction: position.direction as "Yes" | "No",
              market: market,
            };
          } catch (error) {
            debugError(
              `Error fetching market ${position.marketId} for position ${position.positionId}:`,
              error
            );
            return null;
          }
        },
        1, // Process 1 market at a time
        500 // 500ms delay between markets
      );

      // Filter out null values
      const validPositions = positionsWithMarkets.filter((position): position is NonNullable<typeof position> => 
        position !== null
      );

      debugLog(`Successfully processed ${validPositions.length} valid positions`);
      debugPerformance("Total position refresh", startTime);
      setPositions(validPositions);
    } catch (error) {
      debugError("Error refreshing positions:", error);
      // Don't clear existing positions on error, just log it
    } finally {
      setLoadingMarkets(false);
      isRefreshing.current = false;
    }
  }, [selectedAccount, fetchNftMetadata, getMarketById]);

  const handleClaimPayout = useCallback(async (position: PositionWithMarket) => {
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
        setPositionClaiming(position.positionId, position.positionNonce, false);
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
        setPositionClaiming(position.positionId, position.positionNonce, false);
      }
    } catch (error) {
      debugError("Error claiming payout:", error);
      toast.update(loadingToastId, {
        type: "error",
        title: "Error",
        message: extractErrorMessage(error, "Failed to claim payout"),
        duration: 4000,
      });
      setPositionClaiming(position.positionId, position.positionNonce, false);
    }
  }, [selectedAccount, payoutPosition, createAndSendTx, toast, setPositionClaiming, refreshPositions]);

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
  };
} 