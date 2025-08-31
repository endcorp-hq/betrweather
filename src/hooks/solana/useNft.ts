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
  const {currentChain} = useChain()
  const [loading, setLoading] = useState(false);

  const fetchNftMetadata = async (
    marketId?: string
  ): Promise<NftMetadata[] | null> => {
    if (!selectedAccount?.publicKey) return null;
    
    setLoading(true);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle the actual response format with 'data' array
      if (result.success && result.data && Array.isArray(result.data)) {
        return result.data.map((position: any) => ({
          assetId: position.assetId,
          positionId: position.positionId,
          positionNonce: position.positionNonce,
          amount: position.amount,
          direction: position.direction,
          marketId: position.marketId,
          market: position.market, // Include the full market data
        }));
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching NFT metadata from backend:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchNftMetadata, loading };
}
