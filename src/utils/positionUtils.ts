import { WinningDirection } from "@endcorp/depredict";
import { createNoopSigner, publicKey, Signer, signerIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  burn,
  fetchAsset,
  collectionAddress,
  fetchCollection,
} from "@metaplex-foundation/mpl-core";
import { PublicKey } from "@solana/web3.js";

export interface PositionWithMarket {
  assetId: string;
  positionId: number;
  positionNonce: number;
  marketId: number;
  direction: "Yes" | "No";
  amount: number;
  market?: any; // Market details from getMarketById
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
      // Convert position amount from lamports to SOL
      const userBetAmount = position.amount / 1000000;

      // Get market liquidity
      const yesLiquidity = Number(position.market.yesLiquidity || 0) / 1000000;
      const noLiquidity = Number(position.market.noLiquidity || 0) / 1000000;

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

  const userBetAmount = position.amount / 1000000;
  const yesLiquidity = Number(position.market?.yesLiquidity || 0) / 1000000;
  const noLiquidity = Number(position.market?.noLiquidity || 0) / 1000000;

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

export const burnPosition = async (position: PositionWithMarket, signerKey: PublicKey, currentChain: string) => {
  try {
 
    const signer = createNoopSigner(signerKey as any)
    const chainString = `https://${currentChain}.helius-rpc.com/?api-key=${process.env.EXPO_PUBLIC_HELIUS_API_KEY}`;
    const rpcUrl = chainString;
    const umi = createUmi(rpcUrl);
    umi.use(signerIdentity(signer))
    const assetId = publicKey(position.assetId);
    const asset = await fetchAsset(umi, assetId);

    const collectionId = collectionAddress(asset);

    let collection = undefined;

    if (collectionId) {
      collection = await fetchCollection(umi, collectionId);
    }

    const tx = burn(umi, {
      asset: asset,
      collection: collection,
    }).buildWithLatestBlockhash(umi);

    return tx;
  } catch (error) {
    console.error("Error burning position", error);
    return null;
  }
};
