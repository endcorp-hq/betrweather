import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useBackendRelay } from "./useBackendRelay";
import { useAuthorization } from "./solana";
import { useShortx } from "./solana";
import { startSSE, log, timeStart, throttle } from "@/utils";

type BackendMarket = any;

type UseMarketsOptions = {
  // Number of hours lookback for resolved markets when not using pagination
  resolvedLastHours?: number;
  // If false, do not auto-start streams/fetch on mount
  autoStart?: boolean;
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
  const { resolvedLastHours = 24, autoStart = true } = opts;
  const { ensureAuthToken } = useBackendRelay();
  const { selectedAccount, userSession } = useAuthorization();
  const { marketEvents } = useShortx();

  const API_BASE_RAW = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";
  const API_BASE = API_BASE_RAW.replace(/\/$/, "");

  const getReachableBase = useCallback((base: string) => {
    try {
      // Map localhost to Android emulator loopback
      if ((/localhost|127\.0\.0\.1/i).test(base)) {
        if (Platform.OS === 'android') {
          const replaced = base.replace(/127\.0\.0\.1|localhost/i, '192.168.1.17');
          if (__DEV__) {
            try { console.warn('[Markets] Using 192.168.1.17 for Android emulator Socket/SSE'); } catch {}
          }
          return replaced;
        }
        // iOS simulator can use localhost
        return base;
      }
      return base;
    } catch { return base; }
  }, []);

  // Canonical in-memory store keyed by market id (dbId fallback)
  const marketByIdRef = useRef<Map<string, BackendMarket>>(new Map());
  const [marketsList, setMarketsList] = useState<BackendMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const esRef = useRef<{ stop: () => void } | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startingRef = useRef<boolean>(false);
  const didPublicPaintRef = useRef<boolean>(false);
  const sseStartedForWalletRef = useRef<string | null>(null);
  const activePageRef = useRef<number>(1);
  const observingPageRef = useRef<number>(1);
  const resolvedPageRef = useRef<number>(1);
  const PAGE_LIMIT_DEFAULT = 10;

  const selectedNetwork = useMemo(() => {
    try {
      const chain = userSession?.chain || '';
      return chain.toLowerCase().includes('main') ? 'MAINNET' : 'DEVNET';
    } catch { return 'DEVNET'; }
  }, [userSession?.chain]);

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
      esRef.current?.stop?.();
    } catch {}
    esRef.current = null;
    try {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    } catch {}
    pollIntervalRef.current = null;
    setIsStreaming(false);
  }, []);

  // Freshness comparator: prefer updateTs, fallback to nextPositionId
  const isFresher = useCallback((prev: any, patch: any) => {
    try {
      const prevTs = prev?.updateTs ?? prev?.updatedAt ?? prev?.lastUpdateTs;
      const patchTs = patch?.updateTs ?? patch?.updatedAt ?? patch?.lastUpdateTs;
      if (prevTs != null || patchTs != null) {
        const prevNum = typeof prevTs === "string" && /[^0-9]/.test(prevTs)
          ? Date.parse(prevTs)
          : Number(prevTs);
        const patchNum = typeof patchTs === "string" && /[^0-9]/.test(patchTs)
          ? Date.parse(patchTs)
          : Number(patchTs);
        if (Number.isFinite(patchNum) && Number.isFinite(prevNum)) {
          return patchNum >= prevNum; // allow equal to dedupe idempotently
        }
      }
    } catch {}

    try {
      const prevNext = prev?.nextPositionId;
      const patchNext = patch?.nextPositionId;
      if (prevNext != null || patchNext != null) {
        const prevBig = BigInt(String(prevNext ?? 0));
        const patchBig = BigInt(String(patchNext ?? 0));
        return patchBig >= prevBig;
      }
    } catch {}

    // If no freshness signals present, accept the patch
    return true;
  }, []);

  // Normalize numeric big values to strings to avoid JS number overflow in state
  const normalizeMarketPatch = useCallback((m: any) => {
    if (!m || typeof m !== "object") return m;
    const out: any = { ...m };
    const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));
    out.marketId = m.marketId != null ? Number(m.marketId) : m.marketId;
    out.yesLiquidity = toStr(m.yesLiquidity);
    out.noLiquidity = toStr(m.noLiquidity);
    out.volume = toStr(m.volume);
    out.marketStart = toStr(m.marketStart);
    out.marketEnd = toStr(m.marketEnd);
    out.nextPositionId = toStr(m.nextPositionId);
    // Keep updateTs as-is but ensure it's string/number pass-through
    if (m.updateTs !== undefined) out.updateTs = m.updateTs;
    if (m.updatedAt !== undefined) out.updatedAt = m.updatedAt;
    if (m.lastUpdateTs !== undefined) out.lastUpdateTs = m.lastUpdateTs;
    return out;
  }, []);

  // REST helpers used for initial load and reconnect healing
  const fetchSegment = useCallback(
    async (path: string): Promise<BackendMarket[] | null> => {
      try {
        const token = await ensureAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
        };
        // Basic 429-aware retry with backoff
        const base = getReachableBase(API_BASE);
        const url = `${base}${path}`;
        let attempt = 0;
        let res: Response | null = null;
        while (attempt < 4) {
          res = await fetch(url, { method: "GET", headers });
          // Retry once on 401 with forced token refresh
          if (res.status === 401) {
            try {
              const fresh = await ensureAuthToken(true);
              res = await fetch(url, { method: "GET", headers: { ...headers, Authorization: `Bearer ${fresh}` } });
            } catch {}
          }
          if (res.status !== 429) break;
          const backoffMs = Math.min(4000, 500 * Math.pow(2, attempt));
          await new Promise((r) => setTimeout(r, backoffMs));
          attempt++;
        }
        if (!res || !res.ok) return null;
        const json = await res.json();
        const asArray = Array.isArray(json)
          ? json
          : Array.isArray((json as any)?.items)
          ? (json as any).items
          : Array.isArray((json as any)?.data)
          ? (json as any).data
          : Array.isArray((json as any)?.results)
          ? (json as any).results
          : Array.isArray((json as any)?.records)
          ? (json as any).records
          : Array.isArray((json as any)?.page?.items)
          ? (json as any).page.items
          : Array.isArray((json as any)?.page?.records)
          ? (json as any).page.records
          : [];
        return asArray as any[];
      } catch (e) {
        return null;
      }
    },
    [API_BASE, ensureAuthToken, selectedAccount]
  );

  const fetchProgressiveFallback = useCallback(async () => {
    const t = timeStart('Markets', 'progressiveFetch');
    setLoading(true);
    setError(null);
    try {
      const base = getReachableBase(API_BASE);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Fetch page 1 for all categories (public endpoints)
      const network = selectedNetwork;
      const [aj, oj, rj] = await Promise.all([
        fetch(`${base}/markets/active?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(`${base}/markets/observing?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(`${base}/markets/resolved?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
      ]);
      const toArr = (json: any) => Array.isArray(json)
        ? json
        : Array.isArray(json?.items) ? json.items
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.results) ? json.results
        : Array.isArray(json?.records) ? json.records
        : Array.isArray(json?.page?.items) ? json.page.items
        : Array.isArray(json?.page?.records) ? json.page.records
        : [];
      const a = toArr(aj);
      const o = toArr(oj);
      const r = toArr(rj);
      if (!cancelledRef.current && a.length) upsertMany(a);
      if (!cancelledRef.current && o.length) upsertMany(o);
      if (!cancelledRef.current && r.length) upsertMany(r);
      activePageRef.current = 1;
      observingPageRef.current = 1;
      resolvedPageRef.current = 1;
    } catch (e) {
      if (!cancelledRef.current) setError(e);
    } finally {
      if (!cancelledRef.current) setLoading(false);
      t.end({ counts: { active: 0, observing: 0, resolved: 0 } });
    }
  }, [fetchSegment, resolvedLastHours, upsertMany, selectedNetwork, getReachableBase, API_BASE]);

  // Public first-paint (no JWT) for quickest initial UI
  const fetchPublicFirstPaint = useCallback(async () => {
    if (didPublicPaintRef.current) return;
    didPublicPaintRef.current = true;
    const t = timeStart('Markets', 'publicFirstPaint');
    try {
      const base = API_BASE;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const network = selectedNetwork;
      const [aj, oj, rj] = await Promise.all([
        fetch(`${base}/markets/active?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(`${base}/markets/observing?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(`${base}/markets/resolved?page=1&limit=${PAGE_LIMIT_DEFAULT}&network=${encodeURIComponent(network)}`, { method: 'GET', headers }).then(res => res.ok ? res.json() : null).catch(() => null),
      ]);
      const toArr = (json: any) => Array.isArray(json)
        ? json
        : Array.isArray(json?.items) ? json.items
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.results) ? json.results
        : Array.isArray(json?.records) ? json.records
        : Array.isArray(json?.page?.items) ? json.page.items
        : Array.isArray(json?.page?.records) ? json.page.records
        : [];
      const a = toArr(aj);
      const o = toArr(oj);
      const r = toArr(rj);
      if (!cancelledRef.current && a.length) upsertMany(a);
      if (!cancelledRef.current && o.length) upsertMany(o);
      if (!cancelledRef.current && r.length) upsertMany(r);
      activePageRef.current = 1;
      observingPageRef.current = 1;
      resolvedPageRef.current = 1;
    } catch {}
    finally { t.end(); }
  }, [API_BASE, upsertMany, selectedNetwork]);

  

  
  // Start unified SSE stream using reusable helper
  const startMarketsSSE = useCallback(async () => {
    // If wallet isn't connected, do not attempt auth-only endpoints
    if (!selectedAccount?.publicKey) return false;
    const network = selectedNetwork;
    const wallet = selectedAccount.publicKey.toBase58();
    const key = `${wallet}|${network}`;
    if (sseStartedForWalletRef.current === key && (startingRef.current || esRef.current)) {
      return true;
    }
    if (startingRef.current || esRef.current) {
      return true; // already starting/started
    }
    startingRef.current = true;
    let token: string | null = null;
    try {
      token = await ensureAuthToken();
    } catch (e) {
      startingRef.current = false;
      return false;
    }

    try {
      // Pass token via query param because setting headers is not supported by standard EventSource
      // Backend should accept this for SSE; if not, we will fall back automatically on error
      const base = getReachableBase(API_BASE);
      const network = selectedNetwork;
      const url = `${base}/markets/stream?lastHours=${encodeURIComponent(
        String(resolvedLastHours)
      )}&network=${encodeURIComponent(network)}&jwt=${encodeURIComponent(token)}&wallet=${encodeURIComponent(
        selectedAccount.publicKey.toBase58()
      )}`;
      const stopHandle = startSSE({
        url,
        onOpen: async () => {
          if (cancelledRef.current) return;
          setIsStreaming(true);
          // Stop polling fallback if any
          if (pollIntervalRef.current) {
            try { clearInterval(pollIntervalRef.current); } catch {}
            pollIntervalRef.current = null;
          }
          // Heal with a non-blocking refresh
          try { await fetchProgressiveFallback(); } catch {}
        },
        onError: () => {
          if (cancelledRef.current) return;
          closeStream();
        },
        events: {
          activePage: (data: any) => {
            if (cancelledRef.current) return;
            if (Array.isArray(data)) {
              upsertMany(data);
            }
          },
          observingPage: (data: any) => {
            if (cancelledRef.current) return;
            if (Array.isArray(data)) {
              upsertMany(data);
            }
          },
          resolved: (data: any) => {
            if (cancelledRef.current) return;
            if (Array.isArray(data)) {
              upsertMany(data);
            }
          },
          resolvedPage: (data: any) => {
            if (cancelledRef.current) return;
            const arr = Array.isArray(data) ? data : (data ? [data] : []);
            if (arr.length) upsertMany(arr);
          },
          marketUpdate: (payload: any) => {
            if (cancelledRef.current) return;
            try {
              const patch = normalizeMarketPatch(payload);
              const key = patch?.marketId != null ? String(patch.marketId) : null;
              if (!key) return;
              const prev = marketByIdRef.current.get(key);
              const apply = !prev || isFresher(prev, patch);
              if (apply) upsertMany([patch]);
            } catch {}
          },
          end: () => {
            closeStream();
          },
        },
      });

      if (!stopHandle) { startingRef.current = false; return false; }
      esRef.current = stopHandle;

      // Start a lightweight background poll if not streaming (safety net)
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          if (cancelledRef.current) return;
          if (!isStreaming) {
            void fetchProgressiveFallback();
          }
        }, 20000);
      }

      sseStartedForWalletRef.current = key;
      log('Markets', 'info', 'SSE started');
      startingRef.current = false;
      return true;
    } catch (e) {
      closeStream();
      startingRef.current = false;
      return false;
    }
  }, [API_BASE, ensureAuthToken, selectedAccount, resolvedLastHours, getReachableBase, startSSE, fetchProgressiveFallback, closeStream, upsertMany, normalizeMarketPatch, isFresher, selectedNetwork]);


  const refresh = useCallback(async () => {
    // Non-destructive refresh: fetch latest segments once
    cancelledRef.current = false;
    await fetchProgressiveFallback();
  }, [fetchProgressiveFallback]);

  // Mount: do public first paint immediately; when wallet arrives, start SSE and private hydration
  useEffect(() => {
    if (!autoStart) return;
    cancelledRef.current = false;
    // Public routes for initial paint (no wallet required)
    void fetchPublicFirstPaint();

    // When wallet is present: start SSE and hydrate privately once
    if (selectedAccount?.publicKey) {
      (async () => {
        try { await startMarketsSSE(); } catch {}
        try { await fetchProgressiveFallback(); } catch {}
      })();
    }

    return () => {
      cancelledRef.current = true;
      closeStream();
    };
  }, [autoStart, fetchPublicFirstPaint, startMarketsSSE, fetchProgressiveFallback, closeStream, selectedAccount?.publicKey?.toBase58?.()]);

  // Restart stream and reset caches on network change
  useEffect(() => {
    if (!autoStart) return;
    // Reset state for new network
    try { closeStream(); } catch {}
    marketByIdRef.current.clear();
    setMarketsList([]);
    activePageRef.current = 1;
    observingPageRef.current = 1;
    resolvedPageRef.current = 1;
    sseStartedForWalletRef.current = null;
    didPublicPaintRef.current = false;
    // Kick off fresh flow
    void fetchPublicFirstPaint();
    if (selectedAccount?.publicKey) {
      (async () => {
        try { await startMarketsSSE(); } catch {}
        try { await fetchProgressiveFallback(); } catch {}
      })();
    }
  }, [selectedNetwork]);

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


