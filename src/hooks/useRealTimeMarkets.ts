import { useMemo } from 'react';
import { useShortx } from './solana';
import { WinningDirection, MarketType } from '@endcorp/depredict';

// Helper function to determine duration type based on market start and end times
function getDurationType(marketStart: string | number, marketEnd: string | number): 'hourly' | 'daily' | 'long-term' {
  const startTime = Number(marketStart) * 1000; // Convert to milliseconds
  const endTime = Number(marketEnd) * 1000; // Convert to milliseconds
  const durationMs = endTime - startTime;
  const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours

  if (durationHours <= 1) {
    return 'hourly';
  } else if (durationHours <= 24) {
    return 'daily';
  } else {
    return 'long-term';
  }
}

export function useRealTimeMarkets() {
  const { markets, marketEvents, loadingMarkets, error, isInitialized } = useShortx();

  // Create a real-time markets array that updates immediately when events are received
  const realTimeMarkets = useMemo(() => {
    if(!isInitialized) {
      return [];
    }
    if (marketEvents.length === 0) {
      return markets.map(market => ({
        ...market,
        durationType: getDurationType(market.marketStart, market.marketEnd)
      }));
    }

    // Create a map of the latest event for each market
    const latestEvents = new Map();
    marketEvents.forEach(event => {
      const marketId = event.marketId.toString();
      if (!latestEvents.has(marketId) || latestEvents.get(marketId).updateTs < event.updateTs) {
        latestEvents.set(marketId, event);
      }
    });

    // Update markets with real-time data
    return markets.map(market => {
      const latestEvent = latestEvents.get(market.marketId);
      if (latestEvent) {
        // Convert winningDirection from object format to enum
        let winningDirection: WinningDirection;
        if (latestEvent.winningDirection && typeof latestEvent.winningDirection === 'object') {
          if ('yes' in latestEvent.winningDirection) {
            winningDirection = WinningDirection.YES;
          } else if ('no' in latestEvent.winningDirection) {
            winningDirection = WinningDirection.NO;
          } else if ('draw' in latestEvent.winningDirection) {
            winningDirection = WinningDirection.DRAW;
          } else if ('none' in latestEvent.winningDirection) {
            winningDirection = WinningDirection.NONE;
          } else {
            winningDirection = WinningDirection.NONE;
          }
        } else {
          winningDirection = latestEvent.winningDirection as WinningDirection;
        }

        return {
          ...market,
          yesLiquidity: latestEvent.yesLiquidity.toString(),
          noLiquidity: latestEvent.noLiquidity.toString(),
          volume: latestEvent.volume.toString(),
          marketStart: latestEvent.marketStart.toString(),
          marketEnd: latestEvent.marketEnd.toString(),
          winningDirection: winningDirection,
          marketState: latestEvent.state as any,
          nextPositionId: latestEvent.nextPositionId.toString(),
          durationType: getDurationType(latestEvent.marketStart, latestEvent.marketEnd)
        };
      }
      return {
        ...market,
        durationType: getDurationType(market.marketStart, market.marketEnd)
      };
    });
  }, [markets, marketEvents, isInitialized]);

  return {
    markets: realTimeMarkets,
    loadingMarkets,
    error,
    marketEvents,
    isInitialized,
  };
} 