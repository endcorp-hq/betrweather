import { useCallback, useEffect, useState } from "react";
import { useAuthorization } from "./solana";
import { useBackendRelay } from "./useBackendRelay";

export type HistoricalPosition = {
  marketId: number;
  market?: {
    question?: string;
    currency?: string;
    marketState?: string;
    winningDirection?: string | null;
    marketEnd?: string | number | Date;
  };
  direction?: string;
  amount: number;
  isWon?: boolean | null;
  isClaimed?: boolean;
  isBurned?: boolean;
  createdAt?: string | Date;
  claimedAt?: string | Date;
  payoutAmount?: number | string | null;
  currency?: string;
  assetId?: string;
  nftAddress?: string;
  positionId?: number;
  positionNonce?: number;
};

type UseHistoricalPositionsResult = {
  positions: HistoricalPosition[];
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

export function useHistoricalPositions(): UseHistoricalPositionsResult {
  const { selectedAccount } = useAuthorization();
  const { getUserBetsPaginated } = useBackendRelay();
  const [historicalPositions, setHistoricalPositions] = useState<HistoricalPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!selectedAccount?.publicKey) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch all positions including claimed ones
      const allPositions: HistoricalPosition[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const batch = await getUserBetsPaginated(
          selectedAccount.publicKey.toBase58(),
          limit,
          offset,
          true // includeClaimed = true
        );
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allPositions.push(...batch);
          offset += batch.length;
          if (batch.length < limit) {
            hasMore = false;
          }
        }
      }

      setHistoricalPositions(allPositions);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, getUserBetsPaginated]);

  useEffect(() => {
    if (selectedAccount?.publicKey) {
      void refresh();
    }
  }, [selectedAccount?.publicKey?.toBase58?.()]);

  return {
    positions: historicalPositions,
    loading,
    error,
    refresh,
  };
}

