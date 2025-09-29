import { useState } from "react";
import { useAuthorization } from "./useAuthorization";
import { useChain } from "@/contexts";

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
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/nft/fetch-valid-positions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "wallet-address": selectedAccount.publicKey.toBase58(),
          },
          body: JSON.stringify({
            ownerAddress: selectedAccount.publicKey.toBase58(),
            network: currentChain,
            marketId: marketId ? parseInt(marketId) : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`useNftMetadata: HTTP ${response.status} error:`, errorText);
        
        // Handle specific error cases
        if (response.status === 400) {
          const errorMessage = `Backend validation error (400): ${errorText}`;
          console.warn(`useNftMetadata: ${errorMessage}`);
          
          // If this is a retry attempt and we haven't exceeded max retries
          if (retryAttempt < maxRetries) {
            // console.log(`useNftMetadata: Retrying in ${retryDelay}ms... (attempt ${retryAttempt + 1}/${maxRetries})`);
            setRetryCount(retryAttempt + 1);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // Recursive retry
            return fetchNftMetadata(marketId, retryAttempt + 1);
          } else {
            // Max retries exceeded
            const finalError = `Max retries (${maxRetries}) exceeded. Last error: ${errorMessage}`;
            console.error(`useNftMetadata: ${finalError}`);
            setLastError(finalError);
            setRetryCount(0); // Reset retry count
            return null;
          }
        } else {
          // Non-400 errors
          const errorMessage = `HTTP error! status: ${response.status}, message: ${errorText}`;
          console.error(`useNftMetadata: ${errorMessage}`);
          setLastError(errorMessage);
          setRetryCount(0);
          return null;
        }
      }

      // Success case
      const result = await response.json();
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
      
      // Handle network errors with retry logic
      if (retryAttempt < maxRetries) {
        // console.log(`useNftMetadata: Network error, retrying in ${retryDelay}ms... (attempt ${retryAttempt + 1}/${maxRetries})`);
        setRetryCount(retryAttempt + 1);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Recursive retry
        return fetchNftMetadata(marketId, retryAttempt + 1);
      } else {
        // Max retries exceeded
        const finalError = `Max retries (${maxRetries}) exceeded. Last error: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`useNftMetadata: ${finalError}`);
        setLastError(finalError);
        setRetryCount(0);
        return null;
      }
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
