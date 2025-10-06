import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo, useRef } from "react";
import { useAuthorization } from "./solana/useAuthorization";
import { useChain } from "@/contexts";
import { Buffer } from "buffer";
import { MessageV0, VersionedTransaction, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import * as Crypto from "expo-crypto";
import { useMobileWallet } from "./useMobileWallet";

type BuildTxResponse = {
  txRef: string;
  message: string; // base64-encoded v0 message bytes
  lookupTables?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  expiresAt: number;
};

type ForwardTxRequest = {
  signedTx: string; // base64 serialized VersionedTransaction
  reference?: string; // optional readonly key
  options?: { skipPreflight?: boolean; maxRetries?: number };
};

type ForwardTxResponse = { signature: string; status: string };

const TOKEN_STORAGE_KEY_PREFIX = "relay-jwt";

type TokenRecord = { token: string; exp?: number };

function base64UrlToJson<T = any>(segment: string): T | null {
  try {
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function extractJwtExpMs(token: string): number | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const payload = base64UrlToJson<{ exp?: number }>(parts[1]);
  if (!payload?.exp) return undefined;
  return payload.exp * 1000; // seconds → ms
}

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
  const { currentChain } = useChain();
  const { signMessage, signTransaction } = useMobileWallet();
  const tokenRef = useRef<string | null>(null);

  const API_BASE = useMemo(() => {
    return process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";
  }, []);

  const storageKey = useMemo(() => {
    const wallet = selectedAccount?.publicKey?.toBase58?.();
    const chain = currentChain || "devnet";
    return `${TOKEN_STORAGE_KEY_PREFIX}:${chain}:${wallet || "anon"}`;
  }, [selectedAccount, currentChain]);

  const bytesToBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
  const base64ToBytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));

  const ensureAuthToken = useCallback(async (forceRefresh = false): Promise<string> => {
    if (!selectedAccount?.publicKey) throw new Error("Wallet not connected");

    // in-memory first
    if (!forceRefresh && tokenRef.current) return tokenRef.current;

    // try storage
    const cachedRaw = forceRefresh ? null : await AsyncStorage.getItem(storageKey);
    if (cachedRaw && !forceRefresh) {
      // Back-compat: either plain token or JSON TokenRecord
      let record: TokenRecord | null = null;
      try {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && typeof parsed === "object" && typeof parsed.token === "string") {
          record = parsed as TokenRecord;
        }
      } catch {
        record = { token: cachedRaw };
      }
      const now = Date.now();
      const expMs = record ? (record.exp ?? extractJwtExpMs(record.token)) : undefined;
      const isExpired = !!expMs && now >= expMs - 60_000; // refresh 60s early
      if (record && !isExpired) {
        tokenRef.current = record.token;
        return record.token;
      }
    }

    // Challenge
    const challengeRes = await fetch(`${API_BASE}/wallet/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: selectedAccount.publicKey.toBase58() }),
    });
    if (!challengeRes.ok) throw new Error(`Challenge failed: ${challengeRes.status}`);
    const { nonce } = await challengeRes.json();

    // Sign nonce with wallet
    if (!signMessage) throw new Error("Wallet does not support signMessage");
    const sigBytes = await signMessage(new TextEncoder().encode(nonce));
    const signature = bs58.encode(sigBytes);

    // Verify
    const verifyRes = await fetch(`${API_BASE}/wallet/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: selectedAccount.publicKey.toBase58(),
        nonce,
        signature,
      }),
    });
    if (!verifyRes.ok) throw new Error(`Verify failed: ${verifyRes.status}`);
    const { token } = await verifyRes.json();

    const record: TokenRecord = { token, exp: extractJwtExpMs(token) };
    tokenRef.current = record.token;
    await AsyncStorage.setItem(storageKey, JSON.stringify(record));
    return record.token;
  }, [API_BASE, selectedAccount, signMessage, storageKey]);

  const buildOpenPosition = useCallback(
    async (args: {
      marketId: number;
      amount: string | number; // base units (prefer string)
      direction: { yes: object } | { no: object };
      payerPubkey: string; // base58
      token: string; // mint address or symbol
      network?: string;
      metadataUri?: string;
    }): Promise<BuildTxResponse> => {
      const token = await ensureAuthToken();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const openUrl = `${API_BASE}/tx/build/shortx/open-position`;
      let res = await fetch(openUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ ...args, network: args.network || currentChain || "devnet" }),
      });
      if (res.status === 401) {
        // Force re-auth and retry once
        const fresh = await ensureAuthToken(true);
        res = await fetch(openUrl, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify({ ...args, network: args.network || currentChain || "devnet" }),
        });
      }
      if (!res.ok) {
        let text = "";
        try {
          text = await res.text();
        } catch {}
        try {
          console.log(
            "[build open-position]",
            JSON.stringify({ url: openUrl, status: res.status, body: text }, null, 2)
          );
        } catch {}
        throw new Error(`Build open-position failed: ${res.status}`);
      }
      return res.json();
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );

  const buildPayout = useCallback(
    async (args: {
      marketId: number;
      payerPubkey: string; // base58
      assetId: string; // base58
      network?: string;
    }): Promise<BuildTxResponse> => {
      const token = await ensureAuthToken();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      let res = await fetch(`${API_BASE}/tx/build/shortx/payout`, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ ...args, network: args.network || currentChain || "devnet" }),
      });
      if (res.status === 401) {
        const fresh = await ensureAuthToken(true);
        res = await fetch(`${API_BASE}/tx/build/shortx/payout`, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify({ ...args, network: args.network || currentChain || "devnet" }),
        });
      }
      if (!res.ok) throw new Error(`Build payout failed: ${res.status}`);
      return res.json();
    },
    [API_BASE, ensureAuthToken, currentChain, selectedAccount]
  );

  const forwardTx = useCallback(
    async (payload: ForwardTxRequest): Promise<ForwardTxResponse> => {
      const token = await ensureAuthToken();
      const idKey = await generateIdempotencyKey();
      const headersBase = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": idKey,
        "wallet-address": selectedAccount?.publicKey?.toBase58?.() ?? "",
      } as Record<string, string>;

      const forwardUrl = `${API_BASE}/tx/forward`;
      let res = await fetch(forwardUrl, {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // refresh JWT and retry once
        const fresh = await ensureAuthToken(true);
        res = await fetch(forwardUrl, {
          method: "POST",
          headers: {
            ...headersBase,
            Authorization: `Bearer ${fresh}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        let text = "";
        try {
          text = await res.text();
        } catch {}
        try {
          console.log(
            "[forward tx]",
            JSON.stringify({ url: forwardUrl, status: res.status, body: text }, null, 2)
          );
        } catch {}
        throw new Error(text || `Submit failed: ${res.status}`);
      }
      return res.json();
    },
    [API_BASE, ensureAuthToken, selectedAccount]
  );

  const signBuiltTransaction = useCallback(
    async (messageBase64: string): Promise<{
      signedTx: VersionedTransaction;
      signaturesB64: string[];
    }> => {
      // Reconstruct VersionedTransaction from serialized TransactionMessage (v0)
      const messageBytes = base64ToBytes(messageBase64);
      const v0 = MessageV0.deserialize(Buffer.from(messageBytes));
      const unsignedTx = new VersionedTransaction(v0);

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
        // Retry once after re-auth in case session stale
        await ensureAuthToken(true);
        result = (await signTransaction(unsignedTx)) as VersionedTransaction | undefined;
      }
      if (!result) throw new Error("Wallet did not return a signed transaction");
      const signed = result as VersionedTransaction;

      const signaturesB64 = signed.signatures.map((s) => bytesToBase64(s));
      return { signedTx: signed, signaturesB64 };
    },
    [signTransaction]
  );

  return useMemo(
    () => ({
      ensureAuthToken,
      buildOpenPosition,
      buildPayout,
      forwardTx,
      signBuiltTransaction,
    }),
    [ensureAuthToken, buildOpenPosition, buildPayout, forwardTx, signBuiltTransaction]
  );
}


