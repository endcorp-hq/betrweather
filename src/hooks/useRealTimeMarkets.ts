import { useMemo } from 'react';
import { useShortx } from './solana';
import { WinningDirection } from '@endcorp/depredict';

export function useRealTimeMarkets() {
  const { markets, marketEvents, loadingMarkets, error, isInitialized } = useShortx();

  // Create a real-time markets array that updates immediately when events are received
  const realTimeMarkets = useMemo(() => {
    if(!isInitialized) {
      return [];
    }
    if (marketEvents.length === 0) {
      return markets;
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
      // Ensure we look up events using a consistent string key
      const marketKey = String(market.marketId);
      const latestEvent = latestEvents.get(marketKey);
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
        };
      }
      return market;
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