import { WinningDirection } from "@endcorp/depredict";
import { PublicKey } from "@metaplex-foundation/umi";
export interface PositionWithMarket {
  assetId: PublicKey; 
  marketId: number;
  direction: "Yes" | "No";
  amount: number; // UI units
  isActive?: boolean;
  isBurned?: boolean;
  userWallet?: string;
  // Legacy/optional fields kept for backward compatibility in UI filtering
  positionId?: number;
  positionNonce?: number;
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
  if (!position.market) {
    return backgrounds.active; // Default to active if no market data
  }

  if (position.market.winningDirection !== WinningDirection.NONE) {
    // Check if user won
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? backgrounds.won : backgrounds.lost;
  }

  return backgrounds.active; // Market not resolved yet
};

export const getStatusColor = (position: PositionWithMarket) => {
  if (!position.market) return "#3b82f6";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    // Check if user won
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "#10b981" : "#ef4444";
  }
  return "#3b82f6";
};

export const getStatusText = (position: PositionWithMarket) => {
  if (!position.market) return "OBSERVING";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "WON" : "LOST";
  }
  return "OBSERVING";
};

export const getStatusIcon = (position: PositionWithMarket) => {
  if (!position.market) return "clock-outline";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "trophy" : "close-circle";
  }
  return "clock-outline";
};

export const calculatePayout = (position: PositionWithMarket) => {
  if (!position.market) return null;

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    if (userWon) {
      // amount now comes from DB in UI units; liquidity still needs decimals scaling
      const userBetAmount = Number(position.amount || 0);
      const decimals = Number(position.market.decimals ?? 6);
      const scale = Math.pow(10, decimals);
      const yesLiquidity = Number(position.market.yesLiquidity || 0) / scale;
      const noLiquidity = Number(position.market.noLiquidity || 0) / scale;

      // Determine winning and losing side liquidity
      const winningLiquidity =
        position.market.winningDirection === WinningDirection.YES
          ? yesLiquidity
          : noLiquidity;
      const losingLiquidity =
        position.market.winningDirection === WinningDirection.YES
          ? noLiquidity
          : yesLiquidity;

      // If there's no liquidity on the losing side, user just gets their bet back
      if (losingLiquidity === 0) {
        return userBetAmount;
      }

      // Calculate user's share of the winning side
      const userShare = userBetAmount / winningLiquidity;

      // Calculate payout: user's share of losing side + original bet
      const payout = userShare * losingLiquidity + userBetAmount;

      // Ensure user gets at least their original bet back
      return Math.max(payout, userBetAmount);
    } else {
      return 0; // Lost the bet
    }
  }
  return null; // Market not resolved yet
};

// Check if position is claimable
export const isPositionClaimable = (position: PositionWithMarket) => {
  if (!position.market) return false;

  return (
    position.market.winningDirection !== WinningDirection.NONE &&
    ((position.direction === "Yes" &&
      position.market.winningDirection === WinningDirection.YES) ||
      (position.direction === "No" &&
        position.market.winningDirection === WinningDirection.NO))
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
    return userBetAmount;
  }

  // Calculate expected payout
  const userShare = userBetAmount / userSideLiquidity;
  const expectedPayout = userShare * oppositeSideLiquidity + userBetAmount;

  // Ensure user gets at least their original bet back
  return Math.max(expectedPayout, userBetAmount);
};