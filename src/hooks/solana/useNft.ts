import { useState } from "react";
import { useAuthorization } from "./useAuthorization";
import { useChain } from "@/contexts";
import { getJWTTokens } from "../../utils/authUtils";

// Simple exponential backoff for rate-limited requests (HTTP 429)
async function withBackoff<T>(fn: () => Promise<T>, retries = 4) {
  let delay = 500;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) {
      const code = e?.status || e?.response?.status;
      if (code !== 429) throw e;
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 4000);
    }
  }
  return await fn();
}

export interface NftMetadata {
  assetId: string;
  positionId: number;
  positionNonce: number;
  amount: number;
  direction: string;
  marketId: number;
  market?: {
    bump: number;
    address: string;
    authority: string;
    marketId: string;
    yesLiquidity: string;
    noLiquidity: string;
    volume: string;
    oraclePubkey: string;
    nftCollectionMint: string;
    mint: string;
    decimals: number;
    marketVault: string;
    marketState: string;
    updateTs: string;
    nextPositionId: string;
    marketStart: string;
    marketEnd: string;
    question: string;
    winningDirection: string;
    marketType: string;
    bettingStartTime: string;
  };
}

export function useNftMetadata() {
  const { selectedAccount } = useAuthorization();
  const { currentChain } = useChain();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchNftMetadata = async (
    marketId?: string,
    retryAttempt = 0
  ): Promise<NftMetadata[] | null> => {
    if (!selectedAccount?.publicKey) {
      // console.log("useNftMetadata: No selected account");
      return null;
    }
    
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries
    
    setLoading(true);
    setLastError(null);
    
    try {
      const tokens = await getJWTTokens();

      if(!tokens) {
        throw new Error("No tokens found");
      }

      const result = await withBackoff(async () => {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/nft/fetch-valid-positions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokens.accessToken}`,
            },
            body: JSON.stringify({
              ownerAddress: selectedAccount.publicKey.toBase58(),
              network: currentChain,
              marketId: marketId ? parseInt(marketId) : undefined,
              limit: 100,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          const err: any = new Error(errorText || `HTTP ${response.status}`);
          err.status = response.status;
          throw err;
        }
        return response.json();
      });
      // console.log(`useNftMetadata: Success response:`, result);
      
      // Handle the actual response format with 'data' array
      if (result.success && result.data && Array.isArray(result.data)) {
        const metadata = result.data.map((position: any) => ({
          assetId: position.assetId,
          positionId: position.positionId,
          positionNonce: position.positionNonce,
          amount: position.amount,
          direction: position.direction,
          marketId: position.marketId,
          market: position.market, // Include the full market data
        }));
        
        // console.log(`useNftMetadata: Processed ${metadata.length} positions`);
        setRetryCount(0); // Reset retry count on success
        return metadata;
      } else {
        console.warn(`useNftMetadata: Unexpected response format:`, result);
        setLastError(`Unexpected response format from backend`);
        setRetryCount(0);
        return null;
      }
      
    } catch (error) {
      console.error("useNftMetadata: Network or other error:", error);
      // Expose a concise error; withBackoff already handled 429 retry
      const finalError = error instanceof Error ? error.message : String(error);
      setLastError(finalError);
      setRetryCount(0);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { 
    fetchNftMetadata, 
    loading, 
    retryCount, 
    lastError,
    // Helper function to reset error state
    clearError: () => setLastError(null)
  };
}
