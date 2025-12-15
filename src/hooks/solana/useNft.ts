import { useState, useMemo } from "react";
// OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
// import { useAuthorization } from "./useAuthorization";
import { useChain } from "../../contexts/ChainProvider";
import { getJWTTokens } from "../../utils/authUtils";
import { normalizeWinningDirection } from "@/utils";
import { usePrivy } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import { getPrivyAccessToken } from "../../utils/privyAuth";

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
    winningDirection: 'Yes' | 'No' | null;
    marketType: string;
    bettingStartTime: string;
  };
}

/**
 * Get wallet address and public key from Privy user
 */
function getPrivyWalletInfo(privyUser: any): { address: string | null; publicKey: PublicKey | null } {
  // Check linked accounts for wallet
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
  
  // Fallback: check if user has embedded wallet directly
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

export function useNftMetadata() {
  // OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
  // const { selectedAccount } = useAuthorization();
  const { user: privyUser, isReady } = usePrivy();
  const { currentChain } = useChain();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Get wallet info from Privy
  const walletInfo = useMemo(() => {
    if (!privyUser || !isReady) {
      return { address: null, publicKey: null };
    }
    return getPrivyWalletInfo(privyUser);
  }, [privyUser, isReady]);

  const fetchNftMetadata = async (
    marketId?: string,
    retryAttempt = 0
  ): Promise<NftMetadata[] | null> => {
    if (!walletInfo.publicKey || !walletInfo.address) {
      console.log("useNftMetadata: No Privy wallet available");
      return null;
    }
    
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries
    
    setLoading(true);
    setLastError(null);
    
    try {
      // Try Privy access token first, fallback to JWT if needed
      let authToken: string | null = null;
      try {
        authToken = await getPrivyAccessToken();
      } catch (privyError) {
        console.warn("Failed to get Privy token, trying JWT:", privyError);
        // Fallback to JWT for backward compatibility
        const tokens = await getJWTTokens();
        if (tokens) {
          authToken = tokens.accessToken;
        }
      }

      if (!authToken) {
        throw new Error("No authentication token found");
      }

      const requestBody = {
        ownerAddress: walletInfo.address!,
        network: currentChain,
        marketId: marketId ? parseInt(marketId) : undefined,
        limit: 100,
      };
      
      console.log("🔍 [useNftMetadata] Fetching positions from backend:", {
        endpoint: `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/nft/fetch-valid-positions`,
        requestBody,
        walletAddress: walletInfo.address,
        network: currentChain,
        authTokenType: authToken ? "Privy/JWT" : "None",
      });

      const result = await withBackoff(async () => {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/nft/fetch-valid-positions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [useNftMetadata] Backend error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          const err: any = new Error(errorText || `HTTP ${response.status}`);
          err.status = response.status;
          throw err;
        }
        const jsonResult = await response.json();
        console.log("✅ [useNftMetadata] Backend response:", {
          success: jsonResult.success,
          dataLength: jsonResult.data?.length || 0,
          rawResponse: jsonResult,
        });
        return jsonResult;
      });
      
      // Handle the actual response format with 'data' array
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log("📦 [useNftMetadata] Processing positions:", {
          rawPositionsCount: result.data.length,
          rawPositions: result.data,
        });
        
        const metadata = result.data.map((position: any) => {
          const normalizedMarket = position.market
            ? {
                ...position.market,
                winningDirection: normalizeWinningDirection(position.market?.winningDirection),
              }
            : undefined;
          return {
            assetId: position.assetId,
            positionId: position.positionId,
            positionNonce: position.positionNonce,
            amount: position.amount,
            direction: position.direction,
            marketId: position.marketId,
            market: normalizedMarket,
          };
        });
        
        console.log("✨ [useNftMetadata] Processed metadata:", {
          metadataCount: metadata.length,
          metadata: metadata,
        });
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
