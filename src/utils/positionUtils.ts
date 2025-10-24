import type { PublicKey } from "@metaplex-foundation/umi";
import { CurrencyType } from "src/types/currency";
import { apiClient } from "./apiClient";
import { getJWTTokens } from "./authUtils";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export interface PositionWithMarket {
  assetId: PublicKey; 
  marketId: number;
  direction: "Yes" | "No";
  amount: number; // UI units
  isBurned?: boolean;
  userWallet?: string;
  // Legacy/optional fields kept for backward compatibility in UI filtering
  positionId?: number;
  positionNonce?: number;
  currency: string;
  isWon: boolean;
  createdAt: Date;
  updatedAt: Date;
  nftAddress: string;
  market?: any; // Market details from getMarketById or backend
  isClaiming?: boolean; // Track claiming state
}

// Helper functions for position cards
export const getWeatherBackground = (position: PositionWithMarket) => {
  // Import the background images
  const backgrounds = {
    won: require("../../assets/weather/day-clear.png"), // Sunny for won positions
    lost: require("../../assets/weather/night-cloudy.png"), // Cloudy night for lost positions
    active: require("../../assets/weather/morning-cloudy.png"), // Cloudy day for active positions
  };

  // Determine position status
  if (position.market && isMarketResolvedAndEnded(position.market)) {
    // Check if user won
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === 'YES'
        : position.market.winningDirection === 'NO';

    return userWon ? backgrounds.won : backgrounds.lost;
  }

  return backgrounds.active; // Market not resolved yet
};

export const getStatusColor = (position: PositionWithMarket) => {
  if (!position.market) return "#3b82f6";
  if (!isMarketResolvedAndEnded(position.market)) return "#3b82f6";
  const wd = String(position.market?.winningDirection ?? 'NONE').toUpperCase();
  const userWon =
    position.direction === "Yes"
      ? wd === 'YES'
      : wd === 'NO';

  return userWon ? "#10b981" : "#ef4444";
};

export const getStatusText = (position: PositionWithMarket) => {
  if (position.market && isMarketResolvedAndEnded(position.market)) {
    const wd = String(position.market?.winningDirection ?? 'NONE').toUpperCase();
    const userWon =
      position.direction === "Yes"
        ? wd === 'YES'
        : wd === 'NO';

    return userWon ? "WON" : "LOST";
  }
  // Unresolved: differentiate between betting window and live observing
  try {
    const nowMs = Date.now();
    const startMs = Number(position.market?.marketStart) * 1000;
    if (Number.isFinite(startMs) && nowMs < startMs) {
      return "BETTING";
    }
  } catch {}
  return "OBSERVING";
};

// Helper: determine if market is truly resolved and ended
export const isMarketResolvedAndEnded = (market: any): boolean => {
  if (!market) return false;
  const rawState = market?.marketState;
  const stateRaw =
    typeof rawState === "string"
      ? rawState.toUpperCase()
      : rawState && typeof rawState === "object"
        ? JSON.stringify(rawState).toUpperCase()
        : "";
  const backendResolved =
    stateRaw.includes("RESOLV") ||
    stateRaw.includes("SETTL") ||
    stateRaw.includes("CLOSED") ||
    stateRaw.includes("FINAL");
  if (!backendResolved) return false;

  const wd = String(market?.winningDirection ?? "NONE").toUpperCase();
  const outcomeResolved = wd === "YES" || wd === "NO";
  if (!outcomeResolved) return false;

  // If we have an end time, ensure it has passed; otherwise trust outcome flag
  const endMs = Number(market?.marketEnd) * 1000;
  const timeEnded = Number.isFinite(endMs) ? Date.now() >= endMs : true;
  return timeEnded;
};

export const getStatusIcon = (position: PositionWithMarket) => {
  if (!position.market) return "clock-outline";
  if (isMarketResolvedAndEnded(position.market)) {
    const wd = String(position.market?.winningDirection ?? 'NONE').toUpperCase();
    const userWon =
      position.direction === "Yes"
        ? wd === 'YES'
        : wd === 'NO';

    return userWon ? "trophy" : "close-circle";
  }
  return "clock-outline";
};

export const calculatePayout = (position: PositionWithMarket): number | null => {
  if (!position.market) return null;
  if (!isMarketResolvedAndEnded(position.market)) return null;
  const wd = String(position.market?.winningDirection ?? "NONE").toUpperCase();
  const userWon =
    position.direction === "Yes"
      ? wd === "YES"
      : wd === "NO";

  if (!userWon) {
    return formatPositionAmount(0, position.currency as CurrencyType); // Lost the bet
  }

  // amount now comes from DB in UI units; liquidity still needs decimals scaling
  const userBetAmount = Number(position.amount || 0);
  const decimals = Number(position.market.decimals ?? 6);
  const scale = Math.pow(10, decimals);
  const yesLiquidity = Number(position.market.yesLiquidity || 0) / scale;
  const noLiquidity = Number(position.market.noLiquidity || 0) / scale;

  // Determine winning and losing side liquidity
  const winningLiquidity =
    position.market.winningDirection === "YES"
      ? yesLiquidity
      : noLiquidity;
  const losingLiquidity =
    position.market.winningDirection === "YES"
      ? noLiquidity
      : yesLiquidity;

  // If there's no liquidity on the losing side, user just gets their bet back
  if (losingLiquidity === 0) {
    return formatPositionAmount(
      userBetAmount,
      position.currency as CurrencyType
    );
  }

  // Calculate user's share of the winning side
  const userShare = userBetAmount / winningLiquidity;

  // Calculate payout: user's share of losing side + original bet
  const payout = userShare * losingLiquidity + userBetAmount;

  // Ensure user gets at least their original bet back
  const output = Math.max(payout, userBetAmount);
  return formatPositionAmount(output, position.currency as CurrencyType);
};

// Check if position is claimable
export const isPositionClaimable = (position: PositionWithMarket) => {
  if (!position.market) return false;
  if (!isMarketResolvedAndEnded(position.market)) return false;
  const wd = String(position.market?.winningDirection ?? 'NONE').toUpperCase();
  return (
    (position.direction === "Yes" && wd === 'YES') ||
    (position.direction === "No" && wd === 'NO')
  );
};

// Check if position is lost (resolved and user lost)
export const isPositionLost = (position: PositionWithMarket) => {
  if (!position.market) return false;
  if (!isMarketResolvedAndEnded(position.market)) return false;
  const wd = String(position.market?.winningDirection ?? 'NONE').toUpperCase();
  return (
    (position.direction === "Yes" && wd === 'NO') ||
    (position.direction === "No" && wd === 'YES')
  );
};

// Calculate expected payout for active positions
export const calculateExpectedPayout = (position: PositionWithMarket) => {
  if (!position.market) return 0;

  // amount is UI units from DB; liquidity scales by decimals
  const userBetAmount = Number(position.amount || 0);
  const decimals = Number(position.market.decimals ?? 6);
  const scale = Math.pow(10, decimals);
  const yesLiquidity = Number(position.market?.yesLiquidity || 0) / scale;
  const noLiquidity = Number(position.market?.noLiquidity || 0) / scale;

  // Determine user's side liquidity and opposite side liquidity
  const userSideLiquidity =
    position.direction === "Yes" ? yesLiquidity : noLiquidity;
  const oppositeSideLiquidity =
    position.direction === "Yes" ? noLiquidity : yesLiquidity;

  // If there's no liquidity on the user's side (they're the only one who bet),
  // they just get their money back
  if (userSideLiquidity === 0) {
    return formatPositionAmount(userBetAmount, position.currency as CurrencyType);
  }

  // Calculate expected payout
  const userShare = userBetAmount / userSideLiquidity;
  const expectedPayout = userShare * oppositeSideLiquidity + userBetAmount;

  // Ensure user gets at least their original bet back
  const output = Math.max(expectedPayout, userBetAmount);
  return formatPositionAmount(output, position.currency as CurrencyType);
};

export async function getUserBetsRefreshed(walletAddress: string) {
  try {
    const jwtTokens = await getJWTTokens();
    if (!jwtTokens?.accessToken) {
      throw new Error("No access token available");
    }

    const response = await apiClient.request(
      `/bets/user-refreshed/${walletAddress}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtTokens.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh user bets: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error refreshing user bets:", error);
    throw error;
  }
}

export const formatPositionAmount = (
  amount: number,
  currency: CurrencyType
): number => {
  if (currency === CurrencyType.SOL_9) {
    const output = amount / LAMPORTS_PER_SOL;
    return Number(output.toFixed(2));
  }

  if (currency === CurrencyType.USDC_6) {
    const output = amount / 1000000;
    return Number(output.toFixed(2));
  }

  if (currency === CurrencyType.BONK_5) {
    const output = amount / 100000;
    return Number(output.toFixed(2));
  }
  return Number(amount.toFixed(2));
};
