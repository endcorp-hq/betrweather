import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthorization } from "./solana";
import { useBackendRelay } from "./useBackendRelay";

type UserBet = any;

type UseUserBetsOptions = {
  limit?: number;
};

type UseUserBetsResult = {
  bets: UserBet[];
  loading: boolean;
  error: unknown;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useUserBets(
  opts: UseUserBetsOptions = {}
): UseUserBetsResult {
  const { limit = 50 } = opts;
  const { selectedAccount } = useAuthorization();
  const { getUserBetsSummary, getUserBetsPaginated } = useBackendRelay();

  // Canonical bets map; key by tx signature + marketId + direction to avoid duplicates
  const betsKeyedRef = useRef<Map<string, UserBet>>(new Map());
  const [betsList, setBetsList] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const makeKey = (b: any) => `${b?.signature || b?.txSignature || b?.id || Math.random()}:${b?.marketId}:${b?.direction || ''}`;

  const hasRelevantChange = (prev: any, patch: any) => {
    const keys = [
      "amount",
      "direction",
      "marketId",
      "status",
      "createdAt",
      "updatedAt",
      "priceYes",
      "priceNo",
    ];
    for (const k of keys) {
      if (patch[k] !== undefined && String(prev?.[k]) !== String(patch[k])) return true;
    }
    return false;
  };

  const upsertMany = useCallback((items: UserBet[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const map = betsKeyedRef.current;
    let changed = false;
    for (const item of items) {
      if (!item) continue;
      const key = makeKey(item);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, item);
        changed = true;
      } else {
        const merged = { ...prev, ...item };
        if (hasRelevantChange(prev, item)) {
          map.set(key, merged);
          changed = true;
        }
      }
    }
    if (changed) setBetsList(Array.from(map.values()));
  }, []);

  const refresh = useCallback(async () => {
    if (!selectedAccount?.publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const summary = await getUserBetsSummary(selectedAccount.publicKey.toBase58());
      // summary may contain grouped active/resolved and recent; merge all arrays if present
      const groups = Array.isArray(summary) ? summary : [];
      const all: UserBet[] = [];
      if (Array.isArray(groups)) {
        for (const g of groups) {
          if (Array.isArray(g)) all.push(...g);
        }
      }
      if (all.length === 0 && summary && typeof summary === 'object') {
        // Fallback for object shape: concatenate any array fields
        for (const v of Object.values(summary)) {
          if (Array.isArray(v)) all.push(...v as any[]);
        }
      }
      upsertMany(all);
      setOffset(0);
      setHasMore(true);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, getUserBetsSummary, upsertMany]);

  const loadMore = useCallback(async () => {
    if (!selectedAccount?.publicKey || !hasMore || loading) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getUserBetsPaginated(selectedAccount.publicKey.toBase58(), limit, offset);
      upsertMany(next);
      setOffset((o) => o + (Array.isArray(next) ? next.length : 0));
      if (!next || next.length < limit) setHasMore(false);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, hasMore, loading, limit, offset, getUserBetsPaginated, upsertMany]);

  useEffect(() => {
    // Initial load
    if (selectedAccount?.publicKey) {
      void refresh();
    }
  }, [selectedAccount?.publicKey?.toBase58?.()]);

  return {
    bets: betsList,
    loading,
    error,
    loadMore,
    refresh,
  };
}


