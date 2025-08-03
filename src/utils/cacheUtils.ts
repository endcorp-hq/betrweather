// Simple caching utility to reduce API calls

// TODO: When we get a dedicated Helius RPC account, we can:
// 1. Switch to rate-limited mode in useNft.ts by using fetchNftMetadataWithRateLimiting
// 2. Reduce delays in usePositions.ts (marketRateLimiter.minInterval and batch delays)
// 3. Increase batch sizes for better performance
// 4. Remove the simplified single-asset fetching approach

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache size for debugging
  size(): number {
    return this.cache.size;
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instances
export const nftCache = new SimpleCache();
export const marketCache = new SimpleCache();

// Cache keys
export const createNftCacheKey = (walletAddress: string, marketId?: string) => 
  `nft_${walletAddress}_${marketId || 'all'}`;

export const createMarketCacheKey = (marketId: number) => 
  `market_${marketId}`;

// Cache TTLs
export const CACHE_TTL = {
  NFT_METADATA: 2 * 60 * 1000, // 2 minutes
  MARKET_DATA: 30 * 1000, // 30 seconds
} as const;

// Cache management utilities
export const clearUserNftCache = (walletAddress: string) => {
  const keysToDelete: string[] = [];
  for (const key of nftCache.getStats().keys) {
    if (key.includes(walletAddress)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => nftCache.delete(key));
  console.log(`Cleared ${keysToDelete.length} NFT cache entries for user ${walletAddress}`);
};

export const clearMarketCache = (marketId?: number) => {
  if (marketId) {
    const key = createMarketCacheKey(marketId);
    marketCache.delete(key);
    console.log(`Cleared market cache for market ${marketId}`);
  } else {
    marketCache.clear();
    console.log('Cleared all market cache');
  }
};

export const clearAllCaches = () => {
  nftCache.clear();
  marketCache.clear();
  console.log('Cleared all caches');
};

// Periodic cleanup (optional)
export const startCacheCleanup = (intervalMs: number = 5 * 60 * 1000) => {
  setInterval(() => {
    nftCache.cleanup();
    marketCache.cleanup();
  }, intervalMs);
}; 