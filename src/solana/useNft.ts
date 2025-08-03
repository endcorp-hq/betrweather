import { useState } from "react";
import { fetchAllAssets } from "@metaplex-foundation/mpl-core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { useAuthorization } from "./useAuthorization";
import { debugLog, debugError, debugWarn, debugPerformance } from "../utils/debugUtils";
import { nftCache, createNftCacheKey, CACHE_TTL } from "../utils/cacheUtils";

export interface NftMetadata {
  positionId: number;
  positionNonce: number;
  amount: number;
  direction: string;
  marketId: number;
}

// Rate limiting utility (kept for future use with dedicated RPC)
const rateLimiter = {
  lastCall: 0,
  minInterval: 100, // Minimum 100ms between calls
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

// Batch processing utility (kept for future use with dedicated RPC)
const batchProcessor = {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 3,
    delayBetweenBatches: number = 200
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      
      // Add successful results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
};

export function useNftMetadata() {
  const umi = createUmi(
    process.env.EXPO_PUBLIC_SOLANA_RPC_URL!
  );
  const { selectedAccount } = useAuthorization();
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchNftMetadata = async (
    marketId?: string
  ): Promise<NftMetadata[] | null> => {
    if (!selectedAccount?.publicKey) {
      debugLog("No selected account, skipping NFT metadata fetch");
      return null;
    }
    
    const walletAddress = selectedAccount.publicKey.toBase58();
    const cacheKey = createNftCacheKey(walletAddress, marketId);
    
    // Check cache first
    const cachedData = nftCache.get<NftMetadata[]>(cacheKey);
    if (cachedData) {
      debugLog("Using cached NFT metadata", { 
        count: cachedData.length,
        cacheKey 
      });
      return cachedData;
    }
    
    // Prevent multiple simultaneous fetches
    const now = Date.now();
    if (now - lastFetchTime < 5000) { // 5 second cooldown
      debugLog("Skipping fetch - too soon since last fetch");
      return [];
    }
    setLastFetchTime(now);
    
    const startTime = performance.now();
    setLoading(true);
    
    try {
      debugLog("Starting NFT metadata fetch", { 
        walletAddress,
        marketId,
        cacheKey
      });
      
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
              ownerAddress: walletAddress,
              page: 1,
              limit: 100, // Increased limit to ensure we find the NFT
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Check for API errors
      if (responseData.error) {
        throw new Error(`Helius API error: ${responseData.error.message || 'Unknown error'}`);
      }
      
      if (!responseData.result) {
        throw new Error('Helius API returned no result');
      }

      const { result } = responseData;
      debugLog("Helius API response received", { 
        totalAssets: result?.items?.length || 0 
      });
      
      // Handle case where user has no assets
      if (!result.items || result.items.length === 0) {
        debugLog("User has no assets");
        nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
        return [];
      }
      
      // Find the NFT with name "SHORTX - {marketId}"
      const shortxNfts = result.items.filter((nft: any) =>
        marketId
          ? nft.content?.metadata?.name?.includes(`DEPREDICT MARKET:${marketId}`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
          : nft.content?.metadata?.name?.includes(`DEPREDICT MARKET:`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
      );
      
      if (!shortxNfts || shortxNfts.length === 0) {
        debugLog("No SHORTX NFTs found for user");
        // Cache empty result to avoid repeated API calls
        nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
        return [];
      }
      
      const shortxMints = shortxNfts.map((nft: any) => nft.id);
      debugLog(`Found ${shortxMints.length} SHORTX NFTs, fetching metadata...`, { mints: shortxMints });

      // Fetch all assets at once to avoid rate limiting
      const assetStartTime = performance.now();
      const assets = await fetchAllAssets(umi, shortxMints, {
        skipDerivePlugins: false,
      });
      debugPerformance(`Fetch all assets (${shortxMints.length})`, assetStartTime);
      
      if (!assets || assets.length === 0) {
        debugLog("No assets returned from fetchAllAssets");
        nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
        return [];
      }

      debugLog(`Successfully fetched ${assets.length} assets`);

      const metadata = assets.map((asset: any) => {
        try {
          const attributes = asset.attributes;
          if (!attributes || !attributes.attributeList) {
            debugWarn(`Asset ${asset.id} has no attributes`);
            return null;
          }
          
          const attributesMap = attributes.attributeList.map(
            (attribute: any) => ({
              [attribute.key]: attribute.value,
            })
          ) as Array<{ [key: string]: string }>;

          const nftMetadata = {
            positionId: Number(attributesMap[1]?.position_id || 0),
            positionNonce: Number(attributesMap[2]?.position_nonce || 0),
            amount: Number(attributesMap[3]?.position_amount || 0),
            direction: attributesMap[4]?.bet_direction?.toString() || "Unknown",
            marketId: Number(attributesMap[0]?.market_id || 0),
          };
          
          // Validate that we have the required fields
          if (!nftMetadata.marketId || !nftMetadata.positionId) {
            debugWarn(`Asset ${asset.id} has invalid metadata:`, nftMetadata);
            return null;
          }
          
          debugLog(`Processed metadata for asset ${asset.id}`, nftMetadata);
          return nftMetadata;
        } catch (error) {
          debugWarn(`Error processing asset ${asset.id}:`, error);
          return null;
        }
      }).filter(Boolean) as NftMetadata[];

      debugLog(`Processed ${metadata.length} valid metadata entries`);
      debugPerformance("Total NFT metadata fetch", startTime);
      
      // Cache the result
      nftCache.set(cacheKey, metadata, CACHE_TTL.NFT_METADATA);
      debugLog("Cached NFT metadata", { 
        count: metadata.length,
        cacheKey,
        cacheSize: nftCache.size()
      });
      
      return metadata;
    } catch (error) {
      debugError("Error fetching NFT metadata:", error);
      // Cache empty result on error to prevent repeated failed calls
      nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Future method for when you have a dedicated RPC account
  const fetchNftMetadataWithRateLimiting = async (
    marketId?: string
  ): Promise<NftMetadata[] | null> => {
    // This method uses the rate limiting infrastructure
    // Uncomment and use this when you have a dedicated Helius account
    if (!selectedAccount?.publicKey) {
      debugLog("No selected account, skipping NFT metadata fetch");
      return null;
    }
    
    const walletAddress = selectedAccount.publicKey.toBase58();
    const cacheKey = createNftCacheKey(walletAddress, marketId);
    
    // Check cache first
    const cachedData = nftCache.get<NftMetadata[]>(cacheKey);
    if (cachedData) {
      debugLog("Using cached NFT metadata", { 
        count: cachedData.length,
        cacheKey 
      });
      return cachedData;
    }
    
    const startTime = performance.now();
    setLoading(true);
    
    try {
      debugLog("Starting rate-limited NFT metadata fetch", { 
        walletAddress,
        marketId,
        cacheKey
      });
      
      // Wait for rate limiter before making the first call
      await rateLimiter.wait();
      
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
              ownerAddress: walletAddress,
              page: 1,
              limit: 100,
            },
          }),
        }
      );

      const { result } = await response.json();
      
      const shortxNfts = result.items.filter((nft: any) =>
        marketId
          ? nft.content.metadata.name.includes(`DEPREDICT MARKET:${marketId}`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
          : nft.content.metadata.name.includes(`DEPREDICT MARKET:`) &&
            nft.burnt === false &&
            nft.interface === "MplCoreAsset"
      );
      
      if (!shortxNfts || shortxNfts.length === 0) {
        nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
        return [];
      }
      
      const shortxMints = shortxNfts.map((nft: any) => nft.id);

      // Use batch processing with rate limiting
      const validAssets = await batchProcessor.processBatch(
        shortxMints,
        async (mint: string) => {
          try {
            await rateLimiter.wait();
            const assetStartTime = performance.now();
            
            const asset = await fetchAllAssets(umi, [mint], {
              skipDerivePlugins: false,
            });
            
            debugPerformance(`Fetch asset ${mint}`, assetStartTime);
            
            if (asset && asset.length > 0 && asset[0]) {
              return asset[0];
            } else {
              return null;
            }
          } catch (error) {
            debugWarn(`Failed to fetch asset ${mint}:`, error);
            return null;
          }
        },
        2,
        300
      );

      if (validAssets.length === 0) {
        nftCache.set(cacheKey, [], CACHE_TTL.NFT_METADATA);
        return [];
      }

      const metadata = validAssets.map((asset: any) => {
        try {
          const attributes = asset.attributes;
          if (!attributes || !attributes.attributeList) {
            return null;
          }
          
          const attributesMap = attributes.attributeList.map(
            (attribute: any) => ({
              [attribute.key]: attribute.value,
            })
          ) as Array<{ [key: string]: string }>;

          const nftMetadata = {
            positionId: Number(attributesMap[1]?.position_id || 0),
            positionNonce: Number(attributesMap[2]?.position_nonce || 0),
            amount: Number(attributesMap[3]?.position_amount || 0),
            direction: attributesMap[4]?.bet_direction?.toString() || "Unknown",
            marketId: Number(attributesMap[0]?.market_id || 0),
          };
          
          if (!nftMetadata.marketId || !nftMetadata.positionId) {
            return null;
          }
          
          return nftMetadata;
        } catch (error) {
          return null;
        }
      }).filter(Boolean) as NftMetadata[];

      nftCache.set(cacheKey, metadata, CACHE_TTL.NFT_METADATA);
      return metadata;
    } catch (error) {
      debugError("Error fetching NFT metadata with rate limiting:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { fetchNftMetadata, loading };
}
