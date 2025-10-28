import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo, useRef } from "react";
import { useAuthorization } from "./solana/useAuthorization";
import { useChain } from "../contexts/ChainProvider";
import { Buffer } from "buffer";
import { MessageV0, VersionedTransaction, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import * as Crypto from "expo-crypto";
import { useMobileWallet } from "./useMobileWallet";
import { log, timeStart } from "@/utils";
import { getJWTTokens, clearJWTTokens } from "../utils/authUtils";
import { tokenManager } from "../utils/tokenManager";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";

type BuildTxResponse = {
  txRef: string;
  message: string; // base64-encoded v0 message bytes
  lookupTables?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  expiresAt: number;
};

type BuildSettleResponse = BuildTxResponse & {
  isPayoutPositive?: boolean;
  setupMessages?: Array<{
    message: string;
    blockhash: string;
    lastValidBlockHeight: number;
  }>;
  lookupTableAddress?: string;
  requiresLookupSetup?: boolean;
};

type ForwardTxRequest = {
  signedTx: string; // base64 serialized VersionedTransaction
  reference?: string; // optional readonly key
  options?: { skipPreflight?: boolean; maxRetries?: number };
};

type ForwardTxResponse = { signature: string; status: string };

async function generateIdempotencyKey(): Promise<string> {
  // Prefer Expo Crypto randomUUID if available
  // @ts-ignore: runtime check
  if (typeof (Crypto as any).randomUUIDAsync === "function") {
    // @ts-ignore
    return await (Crypto as any).randomUUIDAsync();
  }
  // Web Crypto (some environments)
  // @ts-ignore: runtime check
  if (global?.crypto?.randomUUID) {
    // @ts-ignore
    return global.crypto.randomUUID();
  }
  // Fallback: format 16 random bytes into uuid v4
  const bytes = await Crypto.getRandomBytesAsync(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const b = Array.from(bytes).map((x) => x.toString(16).padStart(2, "0"));
  return (
    b.slice(0, 4).join("") +
    "-" +
    b.slice(4, 6).join("") +
    "-" +
    b.slice(6, 8).join("") +
    "-" +
    b.slice(8, 10).join("") +
    "-" +
    b.slice(10, 16).join("")
  );
}

export function useBackendRelay() {
  const { selectedAccount } = useAuthorization();
  const { currentChain, connection } = useChain();
  const { signMessage, signTransaction } = useMobileWallet();
  const tokenRef = useRef<string | null>(null);
  const inflightTokenPromiseRef = useRef<Promise<string> | null>(null);

  const API_BASE = useMemo(() => {
    return process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";
  }, []);

  const bytesToBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
  const base64ToBytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));

  const resolveNet = (argNet?: string): string => {
    return ENABLE_NETWORK_TOGGLE ? (argNet || currentChain || "devnet") : "mainnet";
  };

  /**
   * Ensure we have a valid JWT token from the login system.
   * This ONLY uses tokens from your login/signup flow.
   * If no token exists or refresh fails, it throws an error (should trigger logout).
   */
  const ensureAuthToken = useCallback(async (forceRefresh = false): Promise<string> => {
    if (!selectedAccount?.publicKey) {
      throw new Error("Wallet not connected. Please reconnect your wallet.");
    }

    // In-memory first (if we already got it this session)
    if (!forceRefresh && tokenRef.current) {
      return tokenRef.current;
    }

    // If a token request is already in-flight, await it (coalesce calls)
    if (!forceRefresh && inflightTokenPromiseRef.current) {
      return inflightTokenPromiseRef.current;
    }

    // Build a single in-flight promise to avoid thundering herd
    const promise = (async () => {
      if (!selectedAccount?.address) {
        throw new Error("Wallet not connected. Please reconnect your wallet.");
      }
      const t = timeStart('Auth', 'ensureAuthToken');
      
      // Get JWT from login system
      let tokens = await getJWTTokens();
      
      if (!tokens || !tokens.accessToken) {
        // Quietly signal missing JWT so callers can gate
        throw new Error("JWT_MISSING");
      }

      // Verify wallet matches
      if (tokens.walletAddress !== selectedAccount.publicKey.toBase58()) {
        log('Auth', 'warn', 'JWT wallet mismatch. Clearing tokens.');
        await clearJWTTokens();
        throw new Error("Wallet mismatch. Please login again.");
      }

      // Check if token needs refresh
      const now = Date.now();
      const isExpired = now >= tokens.expiresAt;
      const needsRefresh = tokenManager.shouldRefresh(tokens);

      if (isExpired || needsRefresh || forceRefresh) {
        log('Auth', 'info', 'Token expired or needs refresh. Attempting refresh...');
        
        // Try to refresh
        const refreshSuccess = await tokenManager.refreshTokens();
        
        if (!refreshSuccess) {
          // Refresh failed - clear tokens and let caller decide UX
          log('Auth', 'warn', 'Token refresh failed.');
          await clearJWTTokens();
          throw new Error("JWT_REFRESH_FAILED");
        }
        
        // Get the newly refreshed tokens
        tokens = await getJWTTokens();
        if (!tokens || !tokens.accessToken) {
          throw new Error("Failed to retrieve refreshed tokens. Please login again.");
        }
      }

      // Cache in memory
      tokenRef.current = tokens.accessToken;
      t.end();
      log('Auth', 'info', 'JWT validated');
      return tokens.accessToken;
    })();

    inflightTokenPromiseRef.current = promise;
    try {
      const token = await promise;
      return token;
    } catch (error) {
      // Clear memory cache on error
      tokenRef.current = null;
      throw error;
    } finally {
      inflightTokenPromiseRef.current = null;
    }
  }, [selectedAccount]);

  // Clear the in-memory token cache when wallet changes
  const clearTokenCache = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const buildOpenPosition = useCallback(
    async (args: {
      marketId: number;
      amount: string | number; // base units (prefer string)
      direction: ({ yes: object } | { no: object }) | string;
      directionLabel?: string;
      payerPubkey: string; // base58
      network?: string;
      metadataUri?: string;
    }): Promise<BuildTxResponse> => {
      const headersBase = {
        "Content-Type": "application/json",
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const openUrl = `${API_BASE}/tx/build/shortx/open-position`;
      log('Relay', 'debug', 'build open-position', { url: openUrl });
      const body = { ...args, network: resolveNet(args.network) } as any;
      // Explicitly ensure no token/mint field is included
      delete body.token;
      delete body.mint;
      let res = await fetch(openUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let text = "";
        try {
          text = await res.text();
        } catch {}
        // Handle wallet mismatch explicitly and force re-auth
        if (text && /PAYER_WALLET_MISMATCH/i.test(text)) {
          try { clearTokenCache(); } catch {}
          try { await clearJWTTokens(); } catch {}
          log('Relay', 'error', 'build open-position failed', { status: res.status, body: text });
          throw new Error('PAYER_WALLET_MISMATCH');
        }
        log('Relay', 'error', 'build open-position failed', { status: res.status, body: text });
        throw new Error(`Build open-position failed: ${res.status}`);
      }
      return res.json();
    },
    [API_BASE, currentChain, selectedAccount]
  );


  // Unified ShortX settle builder (single flow for claim or burn)
  const buildSettle = useCallback(
    async (args: {
      marketId: number;
      payerPubkey: string; // base58
      assetId: string; // base58
      network: string;
    }): Promise<BuildSettleResponse> => {
      const headersBase = {
        "Content-Type": "application/json",
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const payload = JSON.stringify({ ...args, network: resolveNet(args.network) });
      const settleUrl = `${API_BASE}/tx/build/shortx/settle`;
      log('Relay', 'debug', 'build settle', { url: settleUrl });

      let res = await fetch(settleUrl, {
        method: "POST",
        headers: headersBase,
        body: payload,
      });

      if (res.status === 401) {
        let token: string | null = null;
        try {
          token = await ensureAuthToken();
        } catch (error) {
          log('Relay', 'warn', 'Optional JWT fetch failed for build settle', { error: String(error) });
        }
        if (!token) {
          try {
            token = await ensureAuthToken(true);
          } catch (error) {
            log('Relay', 'warn', 'JWT refresh failed for build settle', { error: String(error) });
          }
        }
        if (token) {
          log('Relay', 'warn', 'Retry build settle with JWT');
          res = await fetch(settleUrl, {
            method: "POST",
            headers: { ...headersBase, Authorization: `Bearer ${token}` },
            body: payload,
          });
        }
      }

      if (!res.ok) {
        throw new Error(`Build settle failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.message && data.messageBase64) {
        data.message = data.messageBase64;
      }
      return data as BuildSettleResponse;
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );


  // DAS ownership verification preflight
  const verifyOwnership = useCallback(
    async (args: { assetId: string; owner: string; network?: string }): Promise<{ owned: boolean; details?: any }> => {
      const token = await ensureAuthToken();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const verifyUrl = `${API_BASE}/nft/verify-ownership`;
      log('Relay', 'debug', 'verify ownership', { url: verifyUrl });
      let res = await fetch(verifyUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
      });
      if (res.status === 401) {
        const fresh = await ensureAuthToken(true);
        log('Relay', 'warn', 'Retry verify ownership with fresh token');
        res = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
        });
      }
      if (!res.ok) throw new Error(`Ownership verify failed: ${res.status}`);
      return res.json();
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );

  // Check Bubblegum asset (burned/ownership) before building
  const checkBubblegumAsset = useCallback(
    async (args: { assetId: string; network?: string }): Promise<{ burned?: boolean; removeFromList?: boolean } | any> => {
      const token = await ensureAuthToken();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const checkUrl = `${API_BASE}/tx/check/bubblegum/asset`;
      log('Relay', 'debug', 'check bubblegum asset', { url: checkUrl });
      let res = await fetch(checkUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
      });
      if (res.status === 401) {
        const fresh = await ensureAuthToken(true);
        log('Relay', 'warn', 'Retry check bubblegum asset with fresh token');
        res = await fetch(checkUrl, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
        });
      }
      if (!res.ok) {
        let errText = '';
        try { errText = await res.text(); } catch {}
        throw new Error(errText || `Check bubblegum asset failed: ${res.status}`);
      }
      return res.json();
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );

  // Upsert asset → position mapping after creation/mint
  const mapPosition = useCallback(
    async (args: {
      assetId: string; // base58
      owner: string; // base58
      marketId: number;
      amount?: string | number;
      direction?: string; // "Yes" | "No"
      network?: string;
    }): Promise<{ success: boolean } | any> => {
      const token = await ensureAuthToken();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      let res = await fetch(`${API_BASE}/nft/map-position`, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
      });
      if (res.status === 401) {
        const fresh = await ensureAuthToken(true);
        res = await fetch(`${API_BASE}/nft/map-position`, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify({ ...args, network: resolveNet(args.network) }),
        });
      }
      if (!res.ok) throw new Error(`map-position failed: ${res.status}`);
      return res.json();
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );

  const forwardTx = useCallback(
    async (payload: ForwardTxRequest): Promise<ForwardTxResponse> => {
      const idKey = await generateIdempotencyKey();
      const headersBase = {
        "Content-Type": "application/json",
        "Idempotency-Key": idKey,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const forwardUrl = `${API_BASE}/tx/forward`;
      log('Relay', 'debug', 'forward tx', { url: forwardUrl });
      let res = await fetch(forwardUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        let token: string | null = null;
        try {
          token = await ensureAuthToken();
        } catch (error) {
          log('Relay', 'warn', 'Optional JWT fetch failed for forward tx', { error: String(error) });
        }
        if (!token) {
          try {
            token = await ensureAuthToken(true);
          } catch (error) {
            log('Relay', 'warn', 'JWT refresh failed for forward tx', { error: String(error) });
          }
        }
        if (token) {
          log('Relay', 'warn', 'Retry forward tx with JWT');
          res = await fetch(forwardUrl, {
            method: "POST",
            headers: {
              ...headersBase,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!res.ok) {
        let text = "";
        try { text = await res.text(); } catch {}
        // Surface SIMULATION_FAILED and program logs snippets directly
        if (text) {
          try {
            const maybe = JSON.parse(text);
            if (maybe?.error?.code === 'SIMULATION_FAILED' || typeof maybe?.error?.message === 'string') {
              const logs = maybe?.error?.logs || maybe?.logs || maybe?.programLogs;
              const logSnippet = Array.isArray(logs) ? `\nLogs: ${logs.slice(-10).join('\n')}` : '';
              throw new Error(`${maybe.error.message || 'SIMULATION_FAILED'}${logSnippet}`);
            }
          } catch {}
        }
        log('Relay', 'error', 'forward tx failed', { status: res.status, body: text });
        throw new Error(text || `Submit failed: ${res.status}`);
      }
      const json = await res.json();
      try { console.log('[Forward Success]', { signature: json?.signature, status: json?.status }); } catch {}
      return json;
    },
    [API_BASE, ensureAuthToken, selectedAccount]
  );

  // Helper to get SSE stream URL for a given signature
  const getTxStreamUrl = useCallback((signature: string) => {
    const base = API_BASE.replace(/\/$/, '');
    return `${base}/tx/stream?signature=${encodeURIComponent(signature)}`;
  }, [API_BASE]);

  // Fetch markets from backend DB (JWT required)
  const getMarkets = useCallback(async (): Promise<any[]> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;

    const net = ENABLE_NETWORK_TOGGLE
      ? ((currentChain && currentChain.includes('mainnet')) ? 'mainnet' : 'devnet')
      : 'mainnet';
    const url = `${API_BASE}/markets?network=${encodeURIComponent(net)}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, {
        method: 'GET',
        headers: { ...headersBase, Authorization: `Bearer ${fresh}` },
      });
    }
    if (!res.ok) {
      let text = '';
      try { text = await res.text(); } catch {}
      throw new Error(text || `GET /markets failed: ${res.status}`);
    }
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  const getMarketsActive = useCallback(async (): Promise<any[]> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;
    const net = ENABLE_NETWORK_TOGGLE
      ? ((currentChain && currentChain.includes('mainnet')) ? 'mainnet' : 'devnet')
      : 'mainnet';
    const url = `${API_BASE.replace(/\/$/, '')}/markets/active?network=${encodeURIComponent(net)}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, { method: 'GET', headers: { ...headersBase, Authorization: `Bearer ${fresh}` } });
    }
    if (!res.ok) throw new Error(`GET /markets/active failed: ${res.status}`);
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  const getMarketsObserving = useCallback(async (): Promise<any[]> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;
    const net = ENABLE_NETWORK_TOGGLE
      ? ((currentChain && currentChain.includes('mainnet')) ? 'mainnet' : 'devnet')
      : 'mainnet';
    const url = `${API_BASE.replace(/\/$/, '')}/markets/observing?network=${encodeURIComponent(net)}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, { method: 'GET', headers: { ...headersBase, Authorization: `Bearer ${fresh}` } });
    }
    if (!res.ok) throw new Error(`GET /markets/observing failed: ${res.status}`);
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  const getMarketsResolved = useCallback(async (lastHours = 24): Promise<any[]> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;
    const net = ENABLE_NETWORK_TOGGLE
      ? ((currentChain && currentChain.includes('mainnet')) ? 'mainnet' : 'devnet')
      : 'mainnet';
    const url = `${API_BASE.replace(/\/$/, '')}/markets/resolved?lastHours=${encodeURIComponent(String(lastHours))}&network=${encodeURIComponent(net)}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, { method: 'GET', headers: { ...headersBase, Authorization: `Bearer ${fresh}` } });
    }
    if (!res.ok) throw new Error(`GET /markets/resolved failed: ${res.status}`);
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  const getMarketById = useCallback(async (idOrMarketId: string | number): Promise<any | null> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;
    const base = API_BASE.replace(/\/$/, '');
    const url = `${base}/markets/${encodeURIComponent(String(idOrMarketId))}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, { method: 'GET', headers: { ...headersBase, Authorization: `Bearer ${fresh}` } });
    }
    if (!res.ok) return null;
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  // Fetch user bets summary (fast grouped view)
  const getUserBetsSummary = useCallback(async (walletAddress?: string): Promise<any> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;

    const wallet = walletAddress || selectedAccount?.publicKey?.toBase58?.();
    if (!wallet) throw new Error('Wallet not connected');
    const url = `${API_BASE.replace(/\/$/, '')}/bets/user/${encodeURIComponent(wallet)}/summary`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, {
        method: 'GET',
        headers: { ...headersBase, Authorization: `Bearer ${fresh}` },
      });
    }
    if (!res.ok) {
      let text = '';
      try { text = await res.text(); } catch {}
      throw new Error(text || `GET /bets/user/:wallet/summary failed: ${res.status}`);
    }
    return res.json();
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  // Fetch user bets paginated list (fallback/pagination view)
  const getUserBetsPaginated = useCallback(async (walletAddress: string | undefined, limit = 25, offset = 0): Promise<any[]> => {
    const token = await ensureAuthToken();
    const headersBase = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'wallet-address': selectedAccount?.publicKey?.toBase58?.() ?? '',
    } as Record<string, string>;

    const wallet = walletAddress || selectedAccount?.publicKey?.toBase58?.();
    if (!wallet) throw new Error('Wallet not connected');
    const base = API_BASE.replace(/\/$/, '');
    const url = `${base}/bets/user/${encodeURIComponent(wallet)}?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
    let res = await fetch(url, { method: 'GET', headers: headersBase });
    if (res.status === 401) {
      const fresh = await ensureAuthToken(true);
      res = await fetch(url, {
        method: 'GET',
        headers: { ...headersBase, Authorization: `Bearer ${fresh}` },
      });
    }
    if (!res.ok) {
      let text = '';
      try { text = await res.text(); } catch {}
      throw new Error(text || `GET /bets/user/:wallet failed: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, [API_BASE, ensureAuthToken, selectedAccount]);

  const signBuiltTransaction = useCallback(
    async (messageBase64: string): Promise<{
      signedTx: VersionedTransaction;
      signaturesB64: string[];
    }> => {
      const rawBytes = Buffer.from(messageBase64, "base64");

      let unsignedTx: VersionedTransaction | null = null;
      // Attempt to interpret payload as a full serialized VersionedTransaction first.
      try {
        unsignedTx = VersionedTransaction.deserialize(rawBytes);
      } catch {
        // Fallback: treat payload as a serialized v0 message.
        try {
          const v0 = MessageV0.deserialize(rawBytes);
          unsignedTx = new VersionedTransaction(v0);
        } catch (parseErr) {
          console.error("[Relay] Failed to parse settle payload", parseErr);
          throw new Error("Unable to deserialize settle transaction payload");
        }
      }

      if (!unsignedTx) {
        throw new Error("Failed to reconstruct settle transaction");
      }

      // Run a client-side simulation so we can surface token balance deltas before prompting the wallet.
      if (connection) {
        try {
          const sim = await connection.simulateTransaction(unsignedTx, {
            sigVerify: false,
            commitment: "processed",
            replaceRecentBlockhash: true,
          } as any);
          log("Relay", "debug", "settle simulate", {
            err: sim?.value?.err ?? null,
            logs: sim?.value?.logs?.slice?.(-10) ?? null,
            unitsConsumed: sim?.value?.unitsConsumed ?? null
          });
          if (sim?.value?.err) {
            console.error("[Relay] settle simulation error", sim.value.err, sim.value.logs);
          }
        } catch (simErr) {
          console.warn("[Relay] settle simulation failed", simErr);
        }
      }

      // Sign with wallet
      if (!signTransaction) throw new Error("Wallet does not support transaction signing");
      let result: VersionedTransaction | Transaction | undefined;
      try {
        result = (await signTransaction(unsignedTx)) as VersionedTransaction | undefined;
      } catch (err) {
        // Bubble up detailed wallet error
        throw err;
      }
      if (!result) {
        throw new Error("Wallet did not return a signed transaction");
      }
      const signed = result as VersionedTransaction;

      const signaturesB64 = signed.signatures.map((s) => bytesToBase64(s));
      return { signedTx: signed, signaturesB64 };
    },
    [signTransaction]
  );

  return useMemo(
    () => ({
      ensureAuthToken,
      clearTokenCache,
      buildOpenPosition,
      buildSettle,
      verifyOwnership,
      checkBubblegumAsset,
      mapPosition,
      forwardTx,
      getMarkets,
      getMarketsActive,
      getMarketsObserving,
      getMarketsResolved,
      getMarketById,
      getUserBetsSummary,
      getUserBetsPaginated,
      getTxStreamUrl,
      signBuiltTransaction,
    }),
    [ensureAuthToken, clearTokenCache, buildOpenPosition, buildSettle, verifyOwnership, checkBubblegumAsset, mapPosition, forwardTx, getMarkets, getUserBetsSummary, getUserBetsPaginated, getTxStreamUrl, signBuiltTransaction]
  );
}
