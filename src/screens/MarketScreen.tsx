import React, { useState, useMemo, useCallback } from "react";
import { Text, StyleSheet, View, FlatList, TouchableOpacity, ScrollView, Modal, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { MarketCard, CompactMarketCard } from "@/components";
import { computeDerived, normalizeWinningDirection, isBackendResolvedState, isPositionClaimable } from "@/utils";
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
  const [showFilterModal, setShowFilterModal] = useState(false);

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
        category: m.uiMarketCategory ?? null,
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

  //status filter (default to Active tab)
  const [statusFilter, setStatusFilter] = useState("active");

  // Memoize the status filter handler to prevent unnecessary re-renders
  const handleStatusFilterChange = useCallback((filter: string) => {
    setStatusFilter(filter);
    setShowFilterModal(false);
  }, []);

  const handlePortfolioPress = useCallback(() => {
    navigation.navigate("ClaimPositions");
  }, [navigation]);

  // // FlatList render item
  // const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
  //   <MemoizedMarketCard
  //     market={item}
  //     index={index}
  //   />
  // ), []);

  // const keyExtractor = useCallback((item: any, index: number) => {
  //   const id = item?.marketId ?? item?.id ?? index;
  //   return String(id);
  // }, []);

  // Helper function to filter markets by category and status
  const filterMarketsByCategory = useCallback((category: string) => {
    return mergedMarkets.filter((market) => {
      // Filter by category
      if (market.category !== category) return false;

      const now = Date.now();
      const marketStart = Number(market.marketStart) * 1000;
      const marketEnd = Number(market.marketEnd) * 1000;
      const hasStart = Number.isFinite(marketStart);
      const hasEnd = Number.isFinite(marketEnd);
      const backendResolved = isBackendResolvedState(market.marketState);
      const hasWinner = market.winningDirection != null;

      // Apply status filter
      let matchesStatus = false;
      switch (statusFilter) {
        case "active":
          // Active: Betting period - for future markets, current time is before market start
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
        case "observing":
          // Observing: markets that have completed betting but not resolved
          if (hasWinner || backendResolved) {
            matchesStatus = false;
          } else if (market.marketType === MarketType.LIVE) {
            // Live markets are observing during their interval
            const hasStarted = hasStart ? now >= marketStart : false;
            const notEnded = !hasEnd || now <= marketEnd;
            matchesStatus = hasStarted && notEnded;
          } else {
            // Future markets: observing once betting ends but until resolved
            const hasBegun = hasStart ? now >= marketStart : false;
            matchesStatus = hasBegun;
          }
          break;
        case "resolved":
          // Resolved only when a winning side has been set
          matchesStatus = hasWinner;
          break;
        default:
          matchesStatus = true;
      }

      return matchesStatus;
    });
  }, [mergedMarkets, statusFilter]);

  // Quick markets - filtered by uiMarketCategory === 'quick'
  const quickMarkets = useMemo(() => {
    return filterMarketsByCategory('quick');
  }, [filterMarketsByCategory]);

  // Rainfall markets - filtered by uiMarketCategory === 'rain'
  const rainfallMarkets = useMemo(() => {
    return filterMarketsByCategory('rain');
  }, [filterMarketsByCategory]);

  // Temperature markets - filtered by uiMarketCategory === 'temp' or 'temperature'
  const temperatureMarkets = useMemo(() => {
    return mergedMarkets.filter((market) => {
      // Filter by category (accept both 'temp' and 'temperature')
      if (market.category !== 'temp' && market.category !== 'temperature') return false;

      const now = Date.now();
      const marketStart = Number(market.marketStart) * 1000;
      const marketEnd = Number(market.marketEnd) * 1000;
      const hasStart = Number.isFinite(marketStart);
      const hasEnd = Number.isFinite(marketEnd);
      const backendResolved = isBackendResolvedState(market.marketState);
      const hasWinner = market.winningDirection != null;

      // Apply status filter
      let matchesStatus = false;
      switch (statusFilter) {
        case "active":
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
        case "observing":
          if (hasWinner || backendResolved) {
            matchesStatus = false;
          } else if (market.marketType === MarketType.LIVE) {
            const hasStarted = hasStart ? now >= marketStart : false;
            const notEnded = !hasEnd || now <= marketEnd;
            matchesStatus = hasStarted && notEnded;
          } else {
            const hasBegun = hasStart ? now >= marketStart : false;
            matchesStatus = hasBegun;
          }
          break;
        case "resolved":
          matchesStatus = hasWinner;
          break;
        default:
          matchesStatus = true;
      }

      return matchesStatus;
    });
  }, [mergedMarkets, statusFilter]);

  // Check if there are any markets at all
  const hasAnyMarkets = useMemo(() => {
    return quickMarkets.length > 0 || rainfallMarkets.length > 0 || temperatureMarkets.length > 0;
  }, [quickMarkets, rainfallMarkets, temperatureMarkets]);

  // Show loader when initially loading
  if (progressive?.loading && !hasAnyMarkets) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fcfcfc]">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-black text-base font-better-regular mt-4">
          Loading markets...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Fixed Header Section */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
      >
        <View className="px-4 pt-10 pb-4 bg-[#fcfcfc]">
          <View className="flex-row justify-end items-center gap-3 mb-4">
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              disabled={refreshing}
              className="bg-black border border-white/20 rounded-xl px-3 py-2.5 flex-row items-center gap-2"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons
                  name="refresh"
                  size={16}
                  color="white"
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
              className="bg-black border border-white/20 rounded-xl px-3 py-2.5 flex-row items-center gap-2"
            >
              <Text className="text-white text-xs font-better-regular">
                {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Text>
              <MaterialCommunityIcons
                name="tune"
                size={16}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePortfolioPress}
              activeOpacity={0.8}
              className="bg-black border border-white/20 rounded-xl px-3 py-2.5 flex-row items-center gap-2 relative"
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
              
              <Text className="text-white text-xs font-better-regular">
                Portfolio
              </Text>
              <MaterialCommunityIcons
                name="chart-line"
                size={16}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </MotiView>

      {/* Scrollable Markets Section */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
            colors={["#10b981"]}
          />
        }
      >

      {/* Quick Markets Section - Only show if markets exist */}
      {quickMarkets.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
          <View className="mb-6">
            <Text className="text-black text-lg font-better-semi-bold text-left mt-4 mb-4 pl-4">
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
        </MotiView>
      )}

      {/* Rainfall Markets Section - Only show if markets exist */}
      {rainfallMarkets.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
        >
          <View className="mb-6 mt-6">
            <Text className="text-black text-lg font-better-semi-bold text-left mb-4 pl-4">
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
        </MotiView>
      )}

      {/* Temperature Markets Section - Only show if markets exist */}
      {temperatureMarkets.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 300 }}
        >
          <View className="mb-6">
            <Text className="text-black text-lg font-better-semi-bold text-left mb-4 pl-4">
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
        </MotiView>
      )}

      {/* No markets message - Only show if no markets exist */}
      {!hasAnyMarkets && !progressive?.loading && (
        <View className="flex-1 justify-center items-center py-20">
          <Text className="text-white text-lg font-better-regular pt-10">
            No markets found for the selected filters.
          </Text>
        </View>
      )}

      </ScrollView>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable 
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable 
            className="bg-gray-900 rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-5">
              {/* Handle Bar */}
              <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-5" />
              
              {/* Title */}
              <Text className="text-white text-lg font-better-semi-bold mb-5">
                Filter Markets
              </Text>

              {/* Filter Options */}
              <TouchableOpacity
                onPress={() => handleStatusFilterChange('active')}
                className={`flex-row items-center justify-between p-3 rounded-xl mb-2.5 ${
                  statusFilter === 'active' ? 'bg-green-500/20 border-2 border-green-500' : 'bg-white/10'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialCommunityIcons
                    name="gavel"
                    size={20}
                    color={statusFilter === 'active' ? '#10b981' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <View>
                    <Text className={`text-base font-better-semi-bold ${
                      statusFilter === 'active' ? 'text-green-500' : 'text-white'
                    }`}>
                      Active
                    </Text>
                    <Text className="text-white/60 text-xs font-better-regular">
                      Betting open
                    </Text>
                  </View>
                </View>
                {statusFilter === 'active' && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStatusFilterChange('observing')}
                className={`flex-row items-center justify-between p-3 rounded-xl mb-2.5 ${
                  statusFilter === 'observing' ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-white/10'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={20}
                    color={statusFilter === 'observing' ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <View>
                    <Text className={`text-base font-better-semi-bold ${
                      statusFilter === 'observing' ? 'text-blue-500' : 'text-white'
                    }`}>
                      Observing
                    </Text>
                    <Text className="text-white/60 text-xs font-better-regular">
                      In progress
                    </Text>
                  </View>
                </View>
                {statusFilter === 'observing' && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStatusFilterChange('resolved')}
                className={`flex-row items-center justify-between p-3 rounded-xl mb-2.5 ${
                  statusFilter === 'resolved' ? 'bg-purple-500/20 border-2 border-purple-500' : 'bg-white/10'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={statusFilter === 'resolved' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <View>
                    <Text className={`text-base font-better-semi-bold ${
                      statusFilter === 'resolved' ? 'text-purple-500' : 'text-white'
                    }`}>
                      Resolved
                    </Text>
                    <Text className="text-white/60 text-xs font-better-regular">
                      Complete
                    </Text>
                  </View>
                </View>
                {statusFilter === 'resolved' && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#8b5cf6" />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}