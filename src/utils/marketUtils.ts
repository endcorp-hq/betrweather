import { apiClient } from "./apiClient";
import { CurrencyType } from "../types/currency";

export const getMarketToken = (mint: string): CurrencyType => {
  console.log("mint", mint);
  switch (mint) {
    case "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": // USDC mainnet
    case "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": // USDC devnet
      return CurrencyType.USDC_6;
    case "So11111111111111111111111111111111111111112": // SOL
      return CurrencyType.SOL_9;
    default:
      return CurrencyType.BONK_5; // Default to BONK for unknown mints
  }
};

export const createBackendPosition = async (
  userId: string,
  marketId: number,
  nftAddress: string,
  amount: number,
  currency: CurrencyType,
  direction: string
) => {
  const response = await apiClient.request(`/bets`, {
    method: "POST",
    body: JSON.stringify({
      userWallet: userId,
      marketId,
      nftAddress,
      amount,
      currency,
      direction,
    }),
  });

  if (!response.ok) {
    throw new Error(`Update backend positions failed: ${response.status}`);
  }

  return response.json();
};

export const updateBackendPosition = async (
  nftAddress: string,
  amount: number,
  currency: CurrencyType
) => {
  const response = await apiClient.request(`/bets/${nftAddress}`, {
    method: 'PUT',
    body: JSON.stringify({
      amount,
      currency,
    })
  });

  if (!response.ok) {
    throw new Error(`Update backend position failed: ${response.status}`);
  }

  return response.json();
};

export const toUi = (raw: string | number | null | undefined, decimals = 6): number => {
  const n = Number(raw || 0);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
};

const stringIncludes = (value: string, target: string) =>
  value.indexOf(target) !== -1;

export type NormalizedWinningDirection = 'Yes' | 'No' | null;

export const normalizeWinningDirection = (value: any): NormalizedWinningDirection => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    if (stringIncludes(upper, "YES")) {
      return "Yes";
    }
    if (stringIncludes(upper, "NO")) {
      return "No";
    }
    // Treat all other labels (draw/none/pending/etc.) as unresolved
    return null;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).map((k) => k.toUpperCase());
    if (keys.some((k) => stringIncludes(k, "YES"))) return "Yes";
    if (keys.some((k) => stringIncludes(k, "NO"))) return "No";
    return null;
  }

  if (typeof value === "number") {
    if (value > 0) return "Yes";
    if (value < 0) return "No";
    return null;
  }

  return null;
};

export const isBackendResolvedState = (state: any): boolean => {
  if (state === undefined || state === null) return false;
  const raw =
    typeof state === "string"
      ? state
      : typeof state === "object"
      ? JSON.stringify(state)
      : String(state);
  const upper = raw.toUpperCase();
  return (
    stringIncludes(upper, "RESOLV") ||
    stringIncludes(upper, "SETTL") ||
    stringIncludes(upper, "CLOSED") ||
    stringIncludes(upper, "FINAL")
  );
};

export const computeDerived = (m: any) => {
  const decimals = Number(m?.decimals ?? 6);
  const yes = Number(m?.yesLiquidity || 0);
  const no = Number(m?.noLiquidity || 0);
  const total = yes + no;
  const yesPct = total > 0 ? yes / total : 0.5;
  const noPct = 1 - yesPct;
  return {
    totalLiquidity: String(total),
    yesPct,
    noPct,
    ui: {
      yes: toUi(yes, decimals),
      no: toUi(no, decimals),
      total: toUi(total, decimals),
      volume: toUi(m?.volume || 0, decimals),
    },
  };
};
