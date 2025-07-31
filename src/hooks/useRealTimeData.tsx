import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useShortx } from "../solana/useContract";
import * as Haptics from "expo-haptics";
import { WinningDirection } from "@endcorp/depredict";

// Real-time market data interface
interface RealTimeMarket {
  marketId: number; // Change from string to number
  yesLiquidity: string;
  noLiquidity: string;
  volume: string;
  updateTs: number;
  nextPositionId: string;
  winningDirection: WinningDirection;
  marketStart: string;
  marketEnd: string;
  marketState: string;
  question: string;
  lastUpdated: number;
}

// Real-time position data interface
interface RealTimePosition {
  positionId: number;
  marketId: number;
  mint: string;
  positionNonce: number;
  amount: number;
  direction: string;
  createdAt: number;
  positionStatus: string;
  ts: number;
}

// Global real-time state interface
interface RealTimeState {
  markets: Map<number, RealTimeMarket>;
  positions: RealTimePosition[];
  recentPositions: RealTimePosition[];
  marketUpdates: Map<number, number>; // marketId -> lastUpdateTimestamp
  positionUpdates: Map<number, number>; // positionId -> lastUpdateTimestamp
  totalVolume: number;
  totalPositions: number;
  activeMarkets: number;
  resolvedMarkets: number;
}

interface RealTimeContextType {
  // State
  realTimeState: RealTimeState;

  // Market methods
  getMarketById: (marketId: number) => RealTimeMarket | null;
  getMarketVolume: (marketId: number) => number;
  getMarketLiquidity: (marketId: number) => { yes: number; no: number };
  getMarketStatus: (marketId: number) => string;

  // Position methods
  getPositionsForMarket: (marketId: number) => RealTimePosition[];
  getRecentPositions: (limit?: number) => RealTimePosition[];
  getPositionById: (positionId: number) => RealTimePosition | null;

  // Analytics methods
  getTotalVolume: () => number;
  getTotalPositions: () => number;
  getActiveMarkets: () => number;
  getResolvedMarkets: () => number;

  // Utility methods
  isMarketActive: (marketId: number) => boolean;
  isMarketResolved: (marketId: number) => boolean;
  getMarketWinningDirection: (marketId: number) => WinningDirection | null;

  // Manual refresh
  refreshData: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(
  undefined
);

export const RealTimeProvider = ({ children }: { children: ReactNode }) => {
  const { client, markets, marketEvents, recentTrades } = useShortx();
  const [realTimeState, setRealTimeState] = useState<RealTimeState>({
    markets: new Map(),
    positions: [],
    recentPositions: [],
    marketUpdates: new Map(),
    positionUpdates: new Map(),
    totalVolume: 0,
    totalPositions: 0,
    activeMarkets: 0,
    resolvedMarkets: 0,
  });

  // Initialize real-time state from existing markets
  useEffect(() => {
    if (markets.length > 0) {
      const marketsMap = new Map<number, RealTimeMarket>();
      let totalVolume = 0;
      let activeMarkets = 0;
      let resolvedMarkets = 0;

      markets.forEach((market) => {
        const realTimeMarket: RealTimeMarket = {
          marketId: Number(market.marketId),
          yesLiquidity: market.yesLiquidity || "0",
          noLiquidity: market.noLiquidity || "0",
          volume: market.volume || "0",
          updateTs: Date.now(),
          nextPositionId: market.nextPositionId || "0",
          winningDirection: market.winningDirection || WinningDirection.NONE,
          marketStart: market.marketStart || "0",
          marketEnd: market.marketEnd || "0",
          marketState: market.marketState || "active",
          question: market.question || "",
          lastUpdated: Date.now(),
        };

        marketsMap.set(Number(market.marketId), realTimeMarket);
        totalVolume += Number(realTimeMarket.volume);

        if (realTimeMarket.winningDirection !== WinningDirection.NONE) {
          resolvedMarkets++;
        } else {
          activeMarkets++;
        }
      });

      setRealTimeState((prev) => ({
        ...prev,
        markets: marketsMap,
        totalVolume,
        activeMarkets,
        resolvedMarkets,
      }));
    }
  }, [markets]);

  // Handle market events
  useEffect(() => {
    if (marketEvents.length > 0) {
      const latestEvent = marketEvents[0]; // Most recent event

      setRealTimeState((prev) => {
        const newMarkets = new Map(prev.markets);
        const existingMarket = newMarkets.get(latestEvent.marketId);

        if (existingMarket) {
          // Check if this is a significant update (volume change > 1%)
          const volumeChange =
            Math.abs(latestEvent.volume - Number(existingMarket.volume)) /
            Number(existingMarket.volume);

          if (volumeChange > 0.01) {
            // Trigger haptic feedback for significant volume changes
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          const updatedMarket: RealTimeMarket = {
            ...existingMarket,
            yesLiquidity: latestEvent.yesLiquidity.toString(),
            noLiquidity: latestEvent.noLiquidity.toString(),
            volume: latestEvent.volume.toString(),
            updateTs: latestEvent.updateTs,
            nextPositionId: latestEvent.nextPositionId.toString(),
            winningDirection: latestEvent.winningDirection,
            marketStart: latestEvent.marketStart.toString(),
            marketEnd: latestEvent.marketEnd.toString(),
            marketState: latestEvent.state,
            lastUpdated: Date.now(),
          };

          newMarkets.set(latestEvent.marketId, updatedMarket);

          // Update analytics
          let totalVolume = 0;
          let activeMarkets = 0;
          let resolvedMarkets = 0;

          newMarkets.forEach((market) => {
            totalVolume += Number(market.volume);
            if (market.winningDirection !== WinningDirection.NONE) {
              resolvedMarkets++;
            } else {
              activeMarkets++;
            }
          });

          return {
            ...prev,
            markets: newMarkets,
            marketUpdates: new Map(prev.marketUpdates).set(
              latestEvent.marketId,
              Date.now()
            ),
            totalVolume,
            activeMarkets,
            resolvedMarkets,
          };
        }

        return prev;
      });
    }
  }, [marketEvents]);

  // Handle position events
  useEffect(() => {
    if (recentTrades.length > 0) {
      const latestPosition = recentTrades[0]; // Most recent position

      // Trigger haptic feedback immediately when a new position is created
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setRealTimeState((prev) => {
        const newPositions = [...prev.positions];
        const newRecentPositions = [...prev.recentPositions];

        const realTimePosition: RealTimePosition = {
          positionId: Number(latestPosition.positionId),
          marketId: Number(latestPosition.marketId),
          mint: latestPosition.mint,
          positionNonce: parseInt(latestPosition.positionNonce),
          amount: Number(latestPosition.amount),
          direction: latestPosition.direction,
          createdAt: parseInt(latestPosition.createdAt),
          positionStatus: latestPosition.positionStatus,
          ts: parseInt(latestPosition.ts),
        };

        // Add to positions list
        const existingIndex = newPositions.findIndex(
          (p) => p.positionId === realTimePosition.positionId
        );
        if (existingIndex >= 0) {
          newPositions[existingIndex] = realTimePosition;
        } else {
          newPositions.push(realTimePosition);
        }

        // Add to recent positions
        newRecentPositions.unshift(realTimePosition);
        if (newRecentPositions.length > 50) {
          newRecentPositions.pop(); // Keep only last 50
        }

        // Update market volume immediately based on the new position
        const newMarkets = new Map(prev.markets);
        const existingMarket = newMarkets.get(realTimePosition.marketId);

        if (existingMarket) {
          const currentVolume = Number(existingMarket.volume);
          const newVolume = currentVolume + realTimePosition.amount;
          
          const updatedMarket: RealTimeMarket = {
            ...existingMarket,
            volume: newVolume.toString(),
            lastUpdated: Date.now(),
          };

          newMarkets.set(realTimePosition.marketId, updatedMarket);

          // Update total volume
          let totalVolume = 0;
          newMarkets.forEach((market) => {
            totalVolume += Number(market.volume);
          });

          return {
            ...prev,
            positions: newPositions.slice(0, 100), // Keep only last 100 positions
            recentPositions: newRecentPositions.slice(0, 20), // Keep only last 20 recent positions
            positionUpdates: new Map(prev.positionUpdates).set(
              realTimePosition.positionId,
              Date.now()
            ),
            markets: newMarkets, // Include the updated markets
            totalVolume, // Include the updated total volume
            totalPositions: newPositions.length,
          };
        }

        return prev;
      });
    }
  }, [recentTrades]);

  // Market methods
  const getMarketById = (marketId: number): RealTimeMarket | null => {
    return realTimeState.markets.get(marketId) || null;
  };

  const getMarketVolume = (marketId: number): number => {
    const market = realTimeState.markets.get(marketId);
    return Number(market?.volume) || 0;
  };

  const getMarketLiquidity = (
    marketId: number
  ): { yes: number; no: number } => {
    const market = realTimeState.markets.get(marketId);
    return {
      yes: Number(market?.yesLiquidity) || 0,
      no: Number(market?.noLiquidity) || 0,
    };
  };

  const getMarketStatus = (marketId: number): string => {
    const market = realTimeState.markets.get(marketId);
    return market?.marketState || "unknown";
  };

  // Position methods
  const getPositionsForMarket = (marketId: number): RealTimePosition[] => {
    return realTimeState.positions.filter((p) => p.marketId === marketId);
  };

  const getRecentPositions = (limit: number = 10): RealTimePosition[] => {
    return realTimeState.recentPositions.slice(0, limit);
  };

  const getPositionById = (positionId: number): RealTimePosition | null => {
    return (
      realTimeState.positions.find((p) => p.positionId === positionId) || null
    );
  };

  // Analytics methods
  const getTotalVolume = (): number => realTimeState.totalVolume;
  const getTotalPositions = (): number => realTimeState.totalPositions;
  const getActiveMarkets = (): number => realTimeState.activeMarkets;
  const getResolvedMarkets = (): number => realTimeState.resolvedMarkets;

  // Utility methods
  const isMarketActive = (marketId: number): boolean => {
    const market = realTimeState.markets.get(marketId);
    return market?.winningDirection === WinningDirection.NONE;
  };

  const isMarketResolved = (marketId: number): boolean => {
    const market = realTimeState.markets.get(marketId);
    return market?.winningDirection !== WinningDirection.NONE;
  };

  const getMarketWinningDirection = (
    marketId: number
  ): WinningDirection | null => {
    const market = realTimeState.markets.get(marketId);
    return market?.winningDirection || null;
  };

  const refreshData = () => {
    // This could trigger a manual refresh of all data
    console.log("Manual refresh triggered");
  };

  const contextValue: RealTimeContextType = {
    realTimeState,
    getMarketById,
    getMarketVolume,
    getMarketLiquidity,
    getMarketStatus,
    getPositionsForMarket,
    getRecentPositions,
    getPositionById,
    getTotalVolume,
    getTotalPositions,
    getActiveMarkets,
    getResolvedMarkets,
    isMarketActive,
    isMarketResolved,
    getMarketWinningDirection,
    refreshData,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTimeData = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error("useRealTimeData must be used within a RealTimeProvider");
  }
  return context;
};
