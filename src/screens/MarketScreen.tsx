import React, { useState, useMemo, useCallback } from "react";
import { Text, StyleSheet, View, FlatList, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { MarketCard, CompactMarketCard, StatusFilterBar } from "@/components";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  //status filter (default to Betting tab)
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
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = market.question?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

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
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
  }, [mergedMarkets, statusFilter, timeFilter, searchQuery]);

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

  // Dummy quick markets for demo
  const quickMarkets = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        id: "quick-1",
        question: "Will it rain in London between 5:00 - 6:00 on 15th November 2025?",
        marketStart: now + 1740, // 29 mins from now
        marketEnd: now + 5340, // 89 mins from now
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 0,
        yesOdds: 50,
        marketId: undefined,
      },
      {
        id: "quick-2",
        question: "Will temperature exceed 30°C in Miami between 2:00 - 3:00 PM today?",
        marketStart: now + 2400, // 40 mins from now
        marketEnd: now + 6000, // 100 mins from now
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 5.50,
        yesOdds: 60,
        marketId: 42,
      },
      {
        id: "quick-3",
        question: "Will there be snow in Denver between 8:00 AM - 10:00 AM tomorrow?",
        marketStart: now + 3000, // 50 mins from now
        marketEnd: now + 6600, // 110 mins from now
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 12.00,
        yesOdds: 35,
        marketId: 128,
      },
    ];
  }, []);

  // Rainfall markets
  const rainfallMarkets = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        id: "rain-1",
        question: "Will it rain more than 2mm in Seattle today?",
        marketStart: now + 1200,
        marketEnd: now + 4800,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 8.20,
        yesOdds: 70,
        marketId: 201,
      },
      {
        id: "rain-2",
        question: "Will London experience rainfall between 3-4 PM?",
        marketStart: now + 1800,
        marketEnd: now + 5400,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 15.00,
        yesOdds: 45,
        marketId: 202,
      },
      {
        id: "rain-3",
        question: "Will Mumbai get heavy rainfall (>10mm) tonight?",
        marketStart: now + 2100,
        marketEnd: now + 5700,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 22.50,
        yesOdds: 80,
        marketId: 203,
      },
    ];
  }, []);

  // Temperature markets
  const temperatureMarkets = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        id: "temp-1",
        question: "Will NYC temperature drop below 0°C tonight?",
        marketStart: now + 900,
        marketEnd: now + 4500,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 18.75,
        yesOdds: 25,
        marketId: 301,
      },
      {
        id: "temp-2",
        question: "Will Dubai reach 45°C between 12-2 PM today?",
        marketStart: now + 1500,
        marketEnd: now + 5100,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 30.00,
        yesOdds: 65,
        marketId: 302,
      },
      {
        id: "temp-3",
        question: "Will Tokyo temperature stay between 20-25°C all day?",
        marketStart: now + 2700,
        marketEnd: now + 6300,
        winningDirection: null,
        marketType: MarketType.FUTURE,
        volume: 12.90,
        yesOdds: 55,
        marketId: 303,
      },
    ];
  }, []);

  return (
    <ScrollView 
      className="flex-1"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Fixed Header Section */}
      <View className="px-4 pt-10 pb-4">
        <View className="flex-row justify-end items-center mb-4">
          {/* <Text className="text-white text-2xl font-better-semi-bold">
            Climate Markets
          </Text> */}
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
        {/* Search Bar and Filter */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3">
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="rgba(255, 255, 255, 0.6)"
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search markets..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              className="flex-1 ml-2 text-white font-better-regular"
              style={{ fontSize: 14 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color="rgba(255, 255, 255, 0.6)"
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            className="bg-white/10 border border-white/20 rounded-xl p-3"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="tune"
              size={22}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Markets Section */}
      <View className="mb-6">
        <Text className="text-white text-lg font-better-semi-bold text-left mb-4 pl-4">
          Quick Markets
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          nestedScrollEnabled={true}
        >
          {quickMarkets.map((market, index) => (
            <CompactMarketCard key={`quick-${index}`} market={market} type="quick" />
          ))}
        </ScrollView>
      </View>

      {/* Rainfall Markets Section */}
      <View className="mb-6">
        <Text className="text-white text-lg font-better-semi-bold text-left mb-4 pl-4">
          Rainfall Markets
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          nestedScrollEnabled={true}
        >
          {rainfallMarkets.map((market, index) => (
            <CompactMarketCard key={`rain-${index}`} market={market} type="rainfall" />
          ))}
        </ScrollView>
      </View>

      {/* Temperature Markets Section */}
      <View className="mb-6">
        <Text className="text-white text-lg font-better-semi-bold text-left mb-4 pl-4">
          Temperature Markets
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          nestedScrollEnabled={true}
        >
          {temperatureMarkets.map((market, index) => (
            <CompactMarketCard key={`temp-${index}`} market={market} type="temperature" />
          ))}
        </ScrollView>
      </View>

      {/* Climate Markets Section */}
      <View className="px-4 mb-4">
        <Text className="text-white text-xl font-better-semi-bold mb-3">
          Climate Markets
        </Text>
      </View>

      {/* Market Cards Section */}
      <View className="px-4 pb-24">
        {filteredMarkets.length > 0 ? (
          filteredMarkets.map((market, index) => (
            <View key={keyExtractor(market, index)} className="mb-6">
              {renderItem({ item: market, index })}
            </View>
          ))
        ) : (
          !progressive?.loading && (
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-white text-lg font-better-regular pt-10">
                No markets found for the selected filters.
              </Text>
            </View>
          )
        )}
      </View>
    </ScrollView>
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
