import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBackendRelay } from "./useBackendRelay";
import { useAuthorization } from "./solana";
import { useShortx } from "./solana";

type BackendMarket = any;

type UseMarketsOptions = {
  // Number of hours lookback for resolved markets when not using pagination
  resolvedLastHours?: number;
};

type UseMarketsResult = {
  markets: BackendMarket[];
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>; // non-destructive refresh (upsert)
  isStreaming: boolean;
};

export function useMarkets(
  opts: UseMarketsOptions = {}
): UseMarketsResult {
  const { resolvedLastHours = 24 } = opts;
  const { ensureAuthToken } = useBackendRelay();
  const { selectedAccount } = useAuthorization();
  const { marketEvents } = useShortx();

  const API_BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001").replace(/\/$/, "");

  // Canonical in-memory store keyed by market id (dbId fallback)
  const marketByIdRef = useRef<Map<string, BackendMarket>>(new Map());
  const [marketsList, setMarketsList] = useState<BackendMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const esRef = useRef<any>(null);
  const cancelledRef = useRef<boolean>(false);

  // Determine if only relevant keys have a change to reduce re-renders
  const hasRelevantChange = (prev: any, patch: any) => {
    const keys = [
      "yesLiquidity",
      "noLiquidity",
      "volume",
      "marketStart",
      "marketEnd",
      "winningDirection",
      "marketState",
      "nextPositionId",
      "isActive",
      "marketType",
      "question",
    ];
    for (const k of keys) {
      if (patch[k] !== undefined && String(prev?.[k]) !== String(patch[k])) return true;
    }
    return false;
  };

  // Upsert helper: merges array of markets into the map and emits a new array
  const upsertMany = useCallback((items: BackendMarket[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const map = marketByIdRef.current;
    let changed = false;

    const getDbKey = (m: any): string | null => {
      const v = m?.id ?? m?.dbId ?? m?._id ?? m?.uuid ?? null;
      return v != null ? String(v) : null;
    };
    const getOnchainKey = (m: any): string | null => {
      const v = m?.marketId;
      return v != null ? String(v) : null;
    };

    for (const item of items) {
      if (!item) continue;
      const dbKey = getDbKey(item);
      const onchainKey = getOnchainKey(item);

      // If this item has an on-chain key, remove any existing DB-only entries with the same DB key
      if (onchainKey) {
        if (dbKey) {
          for (const [k, v] of map.entries()) {
            const vDbKey = getDbKey(v);
            const vOnchainKey = getOnchainKey(v);
            if (vDbKey && vDbKey === dbKey && (!vOnchainKey || vOnchainKey !== onchainKey)) {
              map.delete(k);
              changed = true;
            }
          }
        }

        const prevByOnchain = map.get(onchainKey);
        if (!prevByOnchain) {
          map.set(onchainKey, item);
          changed = true;
        } else {
          const merged = { ...prevByOnchain, ...item };
          if (hasRelevantChange(prevByOnchain, item)) {
            map.set(onchainKey, merged);
            changed = true;
          }
        }
        continue;
      }

      // No on-chain key yet. If a record exists that already represents this DB entry (possibly on-chain), merge into that
      let existingKeyForDb: string | null = null;
      if (dbKey) {
        for (const [k, v] of map.entries()) {
          const vDbKey = getDbKey(v);
          if (vDbKey && vDbKey === dbKey) {
            existingKeyForDb = k;
            break;
          }
        }
      }

      const targetKey = existingKeyForDb || (dbKey ? dbKey : String(Math.random()));
      const prev = map.get(targetKey);
      if (!prev) {
        map.set(targetKey, item);
        changed = true;
      } else {
        const merged = { ...prev, ...item };
        if (hasRelevantChange(prev, item)) {
          map.set(targetKey, merged);
          changed = true;
        }
      }
    }

    if (changed) {
      setMarketsList(Array.from(map.values()));
    }
  }, []);

  const closeStream = useCallback(() => {
    try {
      if (esRef.current && typeof esRef.current.close === "function") {
        esRef.current.close();
      }
    } catch {}
    esRef.current = null;
    setIsStreaming(false);
  }, []);

  const startSSE = useCallback(async () => {
    // If wallet isn't connected, do not attempt auth-only endpoints
    if (!selectedAccount?.publicKey) return false;
    let token: string | null = null;
    try {
      token = await ensureAuthToken();
    } catch (e) {
      return false;
    }

    // EventSource in RN is not guaranteed; we attempt if available and fall back otherwise
    const hasEventSource = typeof (global as any).EventSource !== "undefined";
    if (!hasEventSource) return false;

    try {
      setIsStreaming(true);
      // Pass token via query param because setting headers is not supported by standard EventSource
      // Backend should accept this for SSE; if not, we will fall back automatically on error
      const url = `${API_BASE}/markets/stream?lastHours=${encodeURIComponent(
        String(resolvedLastHours)
      )}&jwt=${encodeURIComponent(token)}&wallet=${encodeURIComponent(
        selectedAccount.publicKey.toBase58()
      )}`;

      // @ts-ignore - EventSource might be polyfilled at runtime
      const es: any = new (global as any).EventSource(url);
      esRef.current = es;

      const handleArrayEvent = (evt: any) => {
        try {
          const data = JSON.parse(evt?.data || "[]");
          if (Array.isArray(data) && !cancelledRef.current) {
            upsertMany(data);
          }
        } catch {}
      };

      es.addEventListener("active", handleArrayEvent);
      es.addEventListener("observing", handleArrayEvent);
      es.addEventListener("resolved", handleArrayEvent);
      es.addEventListener("resolvedPage", handleArrayEvent);

      es.addEventListener("end", () => {
        closeStream();
      });

      es.addEventListener("error", () => {
        // Fall back to non-stream
        closeStream();
      });

      return true;
    } catch (e) {
      closeStream();
      return false;
    }
  }, [API_BASE, ensureAuthToken, selectedAccount, resolvedLastHours, closeStream]);

  const fetchSegment = useCallback(
    async (path: string): Promise<BackendMarket[] | null> => {
      try {
        const token = await ensureAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
        };
        const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers });
        if (!res.ok) return null;
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (e) {
        return null;
      }
    },
    [API_BASE, ensureAuthToken, selectedAccount]
  );

  const fetchProgressiveFallback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Upsert segments without clearing existing data
      const a = await fetchSegment(`/markets/active`);
      if (!cancelledRef.current && Array.isArray(a)) upsertMany(a);

      const o = await fetchSegment(`/markets/observing`);
      if (!cancelledRef.current && Array.isArray(o)) upsertMany(o);

      const r = await fetchSegment(`/markets/resolved?lastHours=${encodeURIComponent(
        String(resolvedLastHours)
      )}`);
      if (!cancelledRef.current && Array.isArray(r)) upsertMany(r);
    } catch (e) {
      if (!cancelledRef.current) setError(e);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [fetchSegment, resolvedLastHours, upsertMany]);

  const refresh = useCallback(async () => {
    // Non-destructive refresh: ensure stream running; if not, start it; then fetch latest segments once
    cancelledRef.current = false;
    if (!isStreaming) {
      await startSSE();
    }
    await fetchProgressiveFallback();
  }, [isStreaming, startSSE, fetchProgressiveFallback]);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      const streamed = await startSSE();
      if (!streamed) {
        await fetchProgressiveFallback();
      }
      if (!cancelledRef.current) setLoading(false);
    })();

    return () => {
      cancelledRef.current = true;
      closeStream();
    };
  }, [startSSE, fetchProgressiveFallback, closeStream]);

  // Apply on-chain real-time event deltas into the same map for a single source of truth
  useEffect(() => {
    if (!Array.isArray(marketEvents) || marketEvents.length === 0) return;
    try {
      const patches = marketEvents.map((evt: any) => {
        const winningDirection = evt?.winningDirection;
        return {
          marketId: Number(evt?.marketId),
          yesLiquidity: String(evt?.yesLiquidity ?? "0"),
          noLiquidity: String(evt?.noLiquidity ?? "0"),
          volume: String(evt?.volume ?? "0"),
          marketStart: String(evt?.marketStart ?? "0"),
          marketEnd: String(evt?.marketEnd ?? "0"),
          winningDirection,
          marketState: evt?.state,
          nextPositionId: String(evt?.nextPositionId ?? "0"),
        } as any;
      });
      upsertMany(patches);
    } catch {}
  }, [marketEvents, upsertMany]);

  const markets = useMemo(() => marketsList, [marketsList]);

  return {
    markets,
    loading,
    error,
    refresh,
    isStreaming,
  };
}


