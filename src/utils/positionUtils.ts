// import { WinningDirection } from "@endcorp/depredict";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  burn,
  fetchAsset,
  collectionAddress,
  fetchCollection,
} from "@metaplex-foundation/mpl-core";
import { CurrencyType } from "src/types/currency";
import { apiClient } from "./apiClient";
import { getJWTTokens } from "./authUtils";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

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
  currency: string;
  isBurned: boolean;
  isWon: boolean;
  isActive: boolean;
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
  if (!position.market) {
    return backgrounds.active; // Default to active if no market data
  }

  if (position.market.winningDirection !== 'NONE') {
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

  if (position.market.winningDirection !== 'NONE') {
    // Check if user won
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === 'YES'
        : position.market.winningDirection === 'NO';

    return userWon ? "#10b981" : "#ef4444";
  }
  return "#3b82f6";
};

export const getStatusText = (position: PositionWithMarket) => {
  if (position.market.winningDirection !== 'NONE') {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === 'YES'
        : position.market.winningDirection === 'NO';

    return userWon ? "WON" : "LOST";
  }
  return "OBSERVING";
};

export const getStatusIcon = (position: PositionWithMarket) => {
  if (!position.market) return "clock-outline";

  if (position.market.winningDirection !== 'NONE') {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === 'YES'
        : position.market.winningDirection === 'NO';

    return userWon ? "trophy" : "close-circle";
  }
  return "clock-outline";
};

export const calculatePayout = (position: PositionWithMarket): number | null=> {
  if (!position.market) return null;

  if (position.market.winningDirection !== 'NONE') {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === 'YES'
        : position.market.winningDirection === 'NO';

    if (userWon) {
      // amount now comes from DB in UI units; liquidity still needs decimals scaling
      const userBetAmount = Number(position.amount || 0);
      const decimals = Number(position.market.decimals ?? 6);
      const scale = Math.pow(10, decimals);
      const yesLiquidity = Number(position.market.yesLiquidity || 0) / scale;
      const noLiquidity = Number(position.market.noLiquidity || 0) / scale;

      // Determine winning and losing side liquidity
      const winningLiquidity =
        position.market.winningDirection === 'YES'
          ? yesLiquidity
          : noLiquidity;
      const losingLiquidity =
        position.market.winningDirection === 'YES'
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
    } else {
      return formatPositionAmount(0, position.currency as CurrencyType); // Lost the bet
    }
  }
  return null; // Market not resolved yet
};

// Check if position is claimable
export const isPositionClaimable = (position: PositionWithMarket) => {
  if (!position.market) return false;

  return (
    position.market.winningDirection !== 'NONE' &&
    ((position.direction === "Yes" &&
      position.market.winningDirection === 'YES') ||
      (position.direction === "No" &&
        position.market.winningDirection === 'NO'))
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

export const burnPosition = async (
  position: PositionWithMarket,
  signer: any,
  currentChain: string
) => {
  try {
    const chainString = `https://${currentChain}.helius-rpc.com/?api-key=${process.env.EXPO_PUBLIC_HELIUS_API_KEY}`;
    const rpcUrl = chainString;
    const umi = createUmi(rpcUrl);
    umi.use(keypairIdentity(signer));

    const assetId = publicKey(position.nftAddress);
    const asset = await fetchAsset(umi, assetId);

    const collectionId = collectionAddress(asset);

    let collection = undefined;

    if (collectionId) {
      collection = await fetchCollection(umi, collectionId);
    }

    // Build the burn transaction
    const tx = await burn(umi, {
      asset: asset,
      collection: collection,
    }).buildWithLatestBlockhash(umi);

    console.log("UMI burn transaction built:", tx);

    // Return the UMI transaction (will be converted and signed by the wallet adapter)
    return tx;
  } catch (error) {
    console.error("Error burning position", error);
    return null;
  }
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
