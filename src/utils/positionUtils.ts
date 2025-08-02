import { WinningDirection } from "@endcorp/depredict";

export interface PositionWithMarket {
  positionId: number;
  positionNonce: number;
  marketId: number;
  direction: "Yes" | "No";
  amount: number;
  market?: any; // Market details from getMarketById
  isClaiming?: boolean; // Track claiming state
}

// Helper functions for position cards
export const getWeatherBackground = (marketId: number) => {
  const backgrounds = [
    require("../../assets/weather/morning-cloudy.png"),
    require("../../assets/weather/day-clear.png"),
    require("../../assets/weather/night-cloudy.png"),
    require("../../assets/weather/night-clear.png"),
  ];
  return backgrounds[marketId % backgrounds.length];
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
  if (!position.market) return "ACTIVE";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "WON" : "LOST";
  }
  return "ACTIVE";
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
      // Convert position amount from lamports to SOL
      const userBetAmount = position.amount / 1000000;
      
      // Get market liquidity
      const yesLiquidity = Number(position.market.yesLiquidity || 0) / 1000000;
      const noLiquidity = Number(position.market.noLiquidity || 0) / 1000000;
      
      // Determine winning and losing side liquidity
      const winningLiquidity = position.market.winningDirection === WinningDirection.YES 
        ? yesLiquidity 
        : noLiquidity;
      const losingLiquidity = position.market.winningDirection === WinningDirection.YES 
        ? noLiquidity 
        : yesLiquidity;
      
      // Calculate user's share of the winning side
      const userShare = userBetAmount / winningLiquidity;
      
      // Calculate payout: user's share of losing side + original bet
      const payout = (userShare * losingLiquidity) + userBetAmount;
      
      return payout;
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
  
  const userBetAmount = position.amount / 1000000;
  const yesLiquidity = Number(position.market?.yesLiquidity || 0) / 1000000;
  const noLiquidity = Number(position.market?.noLiquidity || 0) / 1000000;
  
  // Determine user's side liquidity and opposite side liquidity
  const userSideLiquidity = position.direction === "Yes" ? yesLiquidity : noLiquidity;
  const oppositeSideLiquidity = position.direction === "Yes" ? noLiquidity : yesLiquidity;
  
  // If there's no liquidity on the user's side (they're the only one who bet),
  // they just get their money back
  if (userSideLiquidity === 0) {
    return userBetAmount;
  }
  
  // Calculate expected payout
  const userShare = userBetAmount / userSideLiquidity;
  const expectedPayout = (userShare * oppositeSideLiquidity) + userBetAmount;
  
  return expectedPayout;
}; 