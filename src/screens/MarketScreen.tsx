import React, { useState, useMemo, useCallback } from "react";
import { Text, StyleSheet, View, FlatList, TouchableOpacity } from "react-native";
import { MarketCard, StatusFilterBar } from "@/components";
import { computeDerived, normalizeWinningDirection, isBackendResolvedState, isPositionClaimable } from "@/utils";
import { useFilters } from "@/components";
import theme from "../theme";
import { MarketType } from "@endcorp/depredict";
import { MotiView } from "moti";

import { useShortx } from "../hooks/solana";
import { useMarketsContext } from "../contexts/MarketsProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePositionsContext } from "../contexts/PositionsProvider";

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

  const progressive = useMarketsContext();
  const navigation = useNavigation();
  const { positions } = usePositionsContext();
  const [refreshing, setRefreshing] = useState(false);

  const claimableCount = useMemo(
    () => positions.filter((position) => isPositionClaimable(position)).length,
    [positions]
  );
  const hasClaimable = claimableCount > 0;
  const claimableBadgeLabel = claimableCount > 9 ? "9+" : String(claimableCount);

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
      const rawDirection =
        m?.winningDirection ??
        m?.resolution?.winningDirection ??
        m?.resolution?.direction ??
        m?.outcome ??
        m?.result;
      const normalizedWinner = normalizeWinningDirection(rawDirection);
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
        winningDirection: normalizedWinner,
        yesLiquidity: m.yesLiquidity ?? "0",
        noLiquidity: m.noLiquidity ?? "0",
        volume: m.volume ?? "0",
        marketState: m.marketState ?? m.state ?? null,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Only trigger backend progressive refresh to avoid extra RPC calls
      await Promise.resolve(progressive?.refresh?.());
    } finally {
      setRefreshing(false);
    }
  }, [progressive]);

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
      const hasStart = Number.isFinite(marketStart);
      const hasEnd = Number.isFinite(marketEnd);
      const backendResolved = isBackendResolvedState(market.marketState);
      const hasWinner = market.winningDirection != null;

      let matchesStatus = false;
      switch (statusFilter) {
        case "betting":
          // Betting period: for future markets, current time is before market start
          if (
            market.marketType === MarketType.LIVE ||
            !hasStart ||
            hasWinner ||
            backendResolved
          ) {
            matchesStatus = false;
          } else {
            matchesStatus = now < marketStart;
          }
          break;
        case "resolved":
          // Resolved only when a winning side has been set
          matchesStatus = hasWinner;
          break;
        case "active":
          // Active: future markets that have completed betting but not resolved
          if (hasWinner || backendResolved) {
            matchesStatus = false;
          } else if (market.marketType === MarketType.LIVE) {
            // Live markets are always active during their interval
            const hasStarted = hasStart ? now >= marketStart : false;
            const notEnded = !hasEnd || now <= marketEnd;
            matchesStatus = hasStarted && notEnded;
          } else {
            // Future markets: active once betting ends but until resolved
            const hasBegun = hasStart ? now >= marketStart : false;
            matchesStatus = hasBegun;
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
            className="relative flex-row items-center gap-4 bg-white/90 rounded-xl border-2 border-white/20 p-4 py-2"
          >
            {hasClaimable && (
              <View
                className="absolute items-center justify-center"
                style={{
                  top: -8,
                  right: -8,
                  backgroundColor: "#ef4444",
                  borderRadius: 9999,
                  minWidth: 24,
                  height: 24,
                  paddingHorizontal: 6,
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.85)",
                }}
              >
                <Text className="text-white text-xs font-better-semi-bold">
                  {claimableBadgeLabel}
                </Text>
              </View>
            )}
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

      {/* Virtualized Market Cards Section */}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        data={filteredMarkets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
    getItemLayout={(_, index) => {
      // Approximate item height from MarketCard styles.height (320) + margins (~24)
      const ITEM_HEIGHT = 344;
      return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index };
    }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing || Boolean(progressive?.loading)}
        onRefresh={onRefresh}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={!progressive?.loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-white text-lg font-better-regular pt-10">No markets found for the selected filters.</Text>
          </View>
        ) : null}
      />
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
