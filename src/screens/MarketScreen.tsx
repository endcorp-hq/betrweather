import React, { useState, useMemo, useCallback } from "react";
import { Text, StyleSheet, View, FlatList } from "react-native";
import { MarketCard, StatusFilterBar } from "@/components";
import { computeDerived } from "@/utils";
import { useFilters } from "@/components";
import theme from "../theme";
import { WinningDirection, MarketType } from "@endcorp/depredict";
import { MotiView } from "moti";

import { useShortx } from "../hooks/solana";
import { useMarketsContext } from "../contexts/MarketsProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Memoized MarketCard component to prevent unnecessary re-renders
const MemoizedMarketCard = React.memo(({ market, index }: { market: any; index: number }) => (
  <MotiView
    key={`market-${market.marketId ?? market.id ?? index}`}
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
  // On-chain list overlays inside global markets state
  const { refresh: refreshOnchain } = useShortx();
  const progressive = useMarketsContext();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Normalize backend markets to the UI shape used here
  const dbMarkets = useMemo(() => {
    const dbMarketsRaw = progressive?.markets || [];
    if (!dbMarketsRaw || !Array.isArray(dbMarketsRaw)) return [] as any[];
    return dbMarketsRaw.map((m: any) => {
      // Convert ISO dates to epoch seconds
      const toSeconds = (iso?: string | null) => typeof iso === 'string' ? Math.floor(new Date(iso).getTime() / 1000) : undefined;
      const maybeMarketId = m.marketId === null || m.marketId === undefined ? null : Number(m.marketId);
      const mt = String(m.marketType || '').toUpperCase();
      const normalizedMarketType = mt === 'LIVE' ? MarketType.LIVE : MarketType.FUTURE;
      return {
        // Keep UUID id explicitly for navigation and stable keys
        id: m.id ?? m.uuid ?? m.dbId ?? m._id ?? undefined,
        // Retain legacy dbId field if upstream provided, for compatibility
        dbId: m.dbId ?? m._id ?? undefined,
        marketId: maybeMarketId,
        question: m.question ?? '',
        marketStart: toSeconds(m.marketStart),
        marketEnd: toSeconds(m.marketEnd),
        marketType: normalizedMarketType,
        currency: m.currency,
        isActive: Boolean(m.isActive),
        // Preserve live values from stream/backend when present
        winningDirection: m.winningDirection ?? WinningDirection.NONE,
        yesLiquidity: m.yesLiquidity ?? "0",
        noLiquidity: m.noLiquidity ?? "0",
        volume: m.volume ?? "0",
      };
    });
  }, [progressive?.markets]);

  // Progressive hook already overlays on-chain deltas; just use it
  const mergedMarkets = useMemo(() => {
    return dbMarkets.map((m: any) => {
      const d = computeDerived(m);
      return { ...m, _derived: d };
    });
  }, [dbMarkets]);

  // (focus refresh removed to avoid spamming backend)

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        Promise.resolve(progressive?.refresh?.()),
        Promise.resolve(refreshOnchain?.()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [progressive, refreshOnchain]);

  //time filters
  const { selected: timeFilter, FilterBar: TimeFilterBar } = useFilters([
    "hourly",
    "daily",
    "longterm",
  ]);

  //status filter (default to Predict tab)
  const [statusFilter, setStatusFilter] = useState("betting");

  // Memoize the status filter handler to prevent unnecessary re-renders
  const handleStatusFilterChange = useCallback((filter: string) => {
    setStatusFilter(filter);
  }, []);

  const handlePortfolioPress = useCallback(() => {
    navigation.navigate("ClaimPositions");
  }, [navigation]);

  // Memoize filtered markets to prevent recalculation on every render
  const filteredMarkets = useMemo(() => {
    return mergedMarkets.filter((market) => {
      // Do not strictly filter out inactive; rely on status filter/time windows
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
            matchesStatus =
              now >= marketStart &&
              market.winningDirection === WinningDirection.NONE;
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
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
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
  }, [mergedMarkets, statusFilter, timeFilter]);

  // FlatList render item
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <MemoizedMarketCard
      market={item}
      index={index}
    />
  ), []);

  const keyExtractor = useCallback((item: any, index: number) => {
    const id = item?.marketId ?? item?.id ?? index;
    return String(id);
  }, []);

  return (
    <View className="flex-1">
      {/* Fixed Header Section */}
      <View className="px-4 pt-10">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-2xl font-better-semi-bold">
            Climate Markets
          </Text>
          <TouchableOpacity
            onPress={handlePortfolioPress}
            activeOpacity={0.8}
            className="flex-row items-center gap-4 bg-white/90 rounded-xl border-2 border-white/20 p-4 py-2"
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={16}
              color="black"
            />
            <Text className="text-black text-sm font-better-semi-bold">
              Portfolio
            </Text>
          </TouchableOpacity>
        </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing || Boolean(progressive?.loading)}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* Do not block on loading; only show empty state when not loading */}
        {!progressive?.loading && filteredMarkets.length === 0 && (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-white text-lg font-better-regular pt-10">No markets found for the selected filters.</Text>  
          </View>
        )}
        
        {/* Add top padding to separate cards from status buttons */}
        <View>
          {visibleMarkets.map((market, idx) => (
            <MemoizedMarketCard
              key={`market-${market.marketId ?? market.id ?? idx}-${market.marketStart}`}
              market={market}
              index={idx}
            />
          ))}
          {canLoadMore && (
            <TouchableOpacity onPress={loadMore} style={{ alignSelf: 'center', marginTop: 16, marginBottom: 32, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Poppins-SemiBold' }}>Load more</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: theme.spacing.lg,
  },
  filterCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    marginVertical: theme.spacing.md,
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginVertical: theme.spacing.lg,
    textAlign: "center",
  },
});
