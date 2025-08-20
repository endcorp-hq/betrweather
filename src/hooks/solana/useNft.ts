import { useState } from "react";
import { fetchAllAssets } from "@metaplex-foundation/mpl-core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { useAuthorization } from "./useAuthorization";

export interface NftMetadata {
  assetId: string;
  positionId: number;
  positionNonce: number;
  amount: number;
  direction: string;
  marketId: number;
}

export function useNftMetadata() {
  const umi = createUmi(
    process.env.EXPO_PUBLIC_SOLANA_RPC_URL!
  );
  const { selectedAccount } = useAuthorization();
  const [loading, setLoading] = useState(false);

  const fetchNftMetadata = async (
    marketId?: string
  ): Promise<NftMetadata[] | null> => {
    if (!selectedAccount?.publicKey) return null;
    setLoading(true);
    try {
      const response = await fetch(
        "https://devnet.helius-rpc.com/?api-key=" +
          process.env.EXPO_PUBLIC_HELIUS_API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            method: "getAssetsByOwner",
            params: {
              ownerAddress: selectedAccount.publicKey.toBase58(),
              page: 1,
              limit: 100, // Increased limit to ensure we find the NFT
            },
          }),
        }
      );

      const { result } = await response.json();
      // Find the NFT with name "SHORTX - {marketId}"
      const shortxNfts = result.items.filter((nft: any) =>
        marketId
          ? nft.content.metadata.name.includes(`DEPREDICT MARKET:${marketId}`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
          : nft.content.metadata.name.includes(`DEPREDICT MARKET:`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
      );
      const shortxMints = shortxNfts.map((nft: any) => nft.id);
      if (!shortxNfts) return null;

      const assets = await fetchAllAssets(umi, shortxMints, {
        skipDerivePlugins: false,
      });

      if (!assets) return null;

      const metadata = assets.map((asset: any) => {
        const attributes = asset.attributes;
        const attributesMap = attributes?.attributeList.map(
          (attribute: any) => ({
            [attribute.key]: attribute.value,
          })
        ) as Array<{ [key: string]: string }>;

        const nftMetadata = {
          assetId: asset.publicKey,
          positionId: Number(attributesMap[1]?.position_id || 0),
          positionNonce: Number(attributesMap[2]?.position_nonce || 0),
          amount: Number(attributesMap[3]?.position_amount || 0),
          direction: attributesMap[4]?.bet_direction.toString(),
          marketId: Number(attributesMap[0]?.market_id || 0),
        };
        return nftMetadata;
      });
      return metadata;
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchNftMetadata, loading };
}
