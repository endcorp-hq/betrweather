import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import { MarketCard, StatusFilterBar, LogoLoader as LoadingSpinner } from "@/components";
import { useFilters } from "@/components";
import theme from '../theme';
import { WinningDirection, MarketType } from "@endcorp/depredict";
import { MotiView } from "moti";
import { useRealTimeMarkets, ShortxErrorType } from "@/hooks";

// Memoized MarketCard component to prevent unnecessary re-renders
const MemoizedMarketCard = React.memo(({ market, index }: { market: any; index: number }) => (
  <MotiView
    key={`market-${market.marketId}-${market.marketStart}`}
    from={{
      opacity: 0,
      translateY: 10,
    }}
    animate={{
      opacity: 1,
      translateY: 0,
    }}
    transition={{
      type: 'timing',
      duration: 350,
      delay: index * 50,
    }}
    style={{ marginBottom: 16 }}
  >
    <MarketCard
      market={market}
      index={index}
    />
  </MotiView>
));

export default function MarketScreen() {
  const { markets, loadingMarkets, error } = useRealTimeMarkets();

  //time filters
  const { selected: timeFilter, FilterBar: TimeFilterBar } = useFilters([
    "daily",
    "weekly",
    "monthly",
    "longterm",
  ]);

  //status filter
  const [statusFilter, setStatusFilter] = useState("betting");

  // Memoize the status filter handler to prevent unnecessary re-renders
  const handleStatusFilterChange = useCallback((filter: string) => {
    setStatusFilter(filter);
  }, []);

  // Memoize filtered markets to prevent recalculation on every render
  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const now = Date.now();
      const marketStart = Number(market.marketStart) * 1000;
      const marketEnd = Number(market.marketEnd) * 1000;

      let matchesStatus = false;
      switch (statusFilter) {
        case "betting":
          // Betting period: for future markets, current time is before market start
          if (market.marketType === MarketType.LIVE) {
            // Live markets don't have a betting period
            matchesStatus = false;
          } else {
            // Future markets: betting period is before market start
            matchesStatus = now < marketStart;
          }
          break;
        case "resolved":
          // Resolved: market has a winningDirection
          matchesStatus = market.winningDirection !== WinningDirection.NONE;
          break;
        case "active":
          // Active: future markets that have completed betting but not resolved
          if (market.marketType === MarketType.LIVE) {
            // Live markets are always active during their interval
            matchesStatus = now >= marketStart && now <= marketEnd;
          } else {
            // Future markets: active when betting is done but not resolved
            matchesStatus = now >= marketStart && market.winningDirection === WinningDirection.NONE;
          }
          break;
        default:
          matchesStatus = true;
      }

      if (!matchesStatus) return false;

      const marketStartDate = new Date(marketStart);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let matchesTime = false;
      switch (timeFilter) {
        case "daily":
          // Same day as today
          const marketStartDay = new Date(marketStartDate);
          marketStartDay.setHours(0, 0, 0, 0);
          matchesTime = marketStartDay.getTime() === today.getTime();
          break;
        case "weekly":
          // Within the current week (Monday to Sunday)
          const startOfWeek = new Date(today);
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0
          startOfWeek.setDate(today.getDate() - daysToMonday);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          matchesTime =
            marketStart >= startOfWeek.getTime() &&
            marketStart <= endOfWeek.getTime();
          break;

        case "monthly":
          // Within the current month
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );

          matchesTime =
            marketStart >= startOfMonth.getTime() &&
            marketStart <= endOfMonth.getTime();
          break;

        case "longterm":
          // Beyond current month (future months)
          const startOfNextMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
          );
          matchesTime = marketStart >= startOfNextMonth.getTime();
          break;

        default:
          matchesTime = true;
      }

      return matchesTime;
    });
  }, [markets, statusFilter, timeFilter]);

  return (
    <View className="flex-1">
      {loadingMarkets ? (
        <LoadingSpinner message="Loading markets" />
      ) : (
        <View className="flex-1">
          {/* Fixed Header Section */}
          <View className="px-4 pt-10">
            <Text className="text-white text-2xl font-better-semi-bold mb-4">
              Climate Prediction Markets
            </Text>
            <TimeFilterBar />
            <StatusFilterBar 
              selected={statusFilter} 
              onSelect={handleStatusFilterChange}
            />
          </View>

          {/* Scrollable Market Cards Section */}
          <ScrollView 
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {error && error.type === ShortxErrorType.MARKET_FETCH && (
              <Text style={styles.errorText}>{error.message}</Text>
            )}
            {!loadingMarkets && !error && filteredMarkets.length === 0 && (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-white text-lg font-better-regular pt-10">No markets found for the selected filters.</Text>  
              </View>
            )}
            
            {/* Add top padding to separate cards from status buttons */}
            <View>
              {filteredMarkets.map((market, idx) => (
                <MemoizedMarketCard
                  key={`market-${market.marketId}-${market.marketStart}`}
                  market={market}
                  index={idx}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  filterCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    marginVertical: theme.spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginVertical: theme.spacing.lg,
    textAlign: 'center',
  },
});
