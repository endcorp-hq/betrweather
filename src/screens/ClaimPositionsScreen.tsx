import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DefaultBg, LogoLoader, SwipeablePositionCard, PreviousPositionsTable } from "@/components";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import { MotiView } from "moti";
import theme from "../theme";
import { usePositionsContext } from "../contexts/PositionsProvider";
import { calculatePayout } from "@/utils";
import { useHistoricalPositions } from "../hooks/useHistoricalPositions";
import { isMarketResolvedAndEnded } from "../utils/positionUtils";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const {
    positions,
    loading,
    loadingMarkets,
    refreshPositions,
    settlePosition,
    lastError,
    retryCount,
  } = usePositionsContext();
  const {
    positions: historicalPositions,
    loading: loadingHistorical,
    refresh: refreshHistorical,
  } = useHistoricalPositions();
  const [refreshing, setRefreshing] = useState(false);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const pageSize = 5;
  const previousPageSize = 10; // Larger page size for table since it's more compact
  const [visibleCount, setVisibleCount] = useState(pageSize);
  
  // Helper function to generate consistent position keys
  const getPositionKey = useCallback((p: any): string => {
    const assetId = p.assetId?.toString?.() ?? p.assetId ?? p.nftAddress ?? '';
    const positionId = p.positionId ?? p.positionNonce ?? '';
    return `${assetId}-${p.marketId ?? ''}-${positionId}`;
  }, []);

  // Helper function to parse date to timestamp
  const getDateTimestamp = useCallback((date?: string | Date | number): number => {
    if (!date) return 0;
    if (typeof date === 'number') return date * 1000;
    return new Date(date).getTime();
  }, []);

  const previousPositions = useMemo(() => {
    const now = Date.now();
    
    // Create a set of current position keys using consistent format
    const currentPositionKeys = new Set(
      positions.map((p: any) => getPositionKey(p))
    );
    
    const filtered = historicalPositions.filter((p: any) => {
      // If claimed or burned, it's definitely a previous position
      if (p.isClaimed || p.isBurned) {
        return true;
      }
      
      // Check if market is resolved using the utility function
      if (p.market && isMarketResolvedAndEnded(p.market)) {
        return true;
      }
      
      // Check if market has ended (marketEnd < now) - even if not resolved
      if (p.market?.marketEnd) {
        const marketEndMs = getDateTimestamp(p.market.marketEnd);
        if (Number.isFinite(marketEndMs) && now > marketEndMs) {
          return true;
        }
      }
      
      // If it's NOT in current positions, it's a previous position
      const positionKey = getPositionKey(p);
      if (!currentPositionKeys.has(positionKey)) {
        return true;
      }
      
      return false;
    });
    
    // Sort by date: newest first (latest at top, oldest at bottom)
    const sorted = [...filtered].sort((a: any, b: any) => {
      const timeA = getDateTimestamp(a.claimedAt || a.createdAt);
      const timeB = getDateTimestamp(b.claimedAt || b.createdAt);
      return timeB - timeA; // Descending order (newest first)
    });
    
    return sorted;
  }, [historicalPositions, positions, getPositionKey, getDateTimestamp]);
  
  const [previousVisibleCount, setPreviousVisibleCount] = useState(previousPageSize);
  const [showPreviousPositions, setShowPreviousPositions] = useState(false);

  // Calculate unclaimed payout total
  const unclaimedPayoutTotal = useMemo(() => {
    return positions
      .map((position: any) => calculatePayout(position))
      .filter((payout): payout is number => payout !== null && payout > 0)
      .reduce((sum, payout) => sum + payout, 0)
      .toFixed(2);
  }, [positions]);
  
  // Reset the flag when account changes
  React.useEffect(() => {
    setHasAttemptedInitialLoad(false);
  }, [selectedAccount?.publicKey?.toString()]);


  // Clamp visible count when positions change
  useEffect(() => {
    if (visibleCount > positions.length) {
      setVisibleCount(Math.max(pageSize, positions.length));
    }
  }, [positions.length, visibleCount]);

  const handleCardPress = useCallback((marketId: number) => {
    navigation.navigate("MarketDetail", { id: marketId.toString() });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Use regular refresh for pull-to-refresh
      await Promise.allSettled([refreshPositions(), refreshHistorical()]);
      // Reset the flag after a successful manual refresh
      setHasAttemptedInitialLoad(false);
      setVisibleCount(pageSize);
      setPreviousVisibleCount(previousPageSize);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPositions, refreshHistorical]);

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing) return;
    if (visibleCount >= positions.length) return;
    setVisibleCount((current) => Math.min(current + pageSize, positions.length));
  }, [loading, refreshing, visibleCount, positions.length]);

  const handleLoadMorePrevious = useCallback(() => {
    if (loadingHistorical || refreshing) return;
    if (previousVisibleCount >= previousPositions.length) return;
    setPreviousVisibleCount((current) => Math.min(current + previousPageSize, previousPositions.length));
  }, [loadingHistorical, refreshing, previousVisibleCount, previousPositions.length, previousPageSize]);

  // Show loading state only for initial load, not for background refreshes
  if (loading && positions.length === 0 && !hasAttemptedInitialLoad) {
    return (
      <DefaultBg>
        <View style={styles.loadingContainer}>
          <LogoLoader
            message="Loading your positions"
          />
        </View>
      </DefaultBg>
    );
  }


  return (
    <DefaultBg>
      <View style={styles.container}>
        {/* Back Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Markets' as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start', // This makes it size to content
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 9999, // rounded-full
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.5)',
              backgroundColor: 'transparent',
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color="black"
              style={{ marginRight: 6 }}
            />
            <Text className="font-better-regular text-black text-sm">
              Back
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Section */}
        <View style={styles.header}>
          <Text className="text-black text-2xl font-better-semi-bold mb-4">
            Current Positions
          </Text>
          <Text style={styles.subtitle}>
            Track your prediction market positions
          </Text>
        </View>

        {/* Stats Section with Moti animations */}
        <View style={styles.statsContainer}>
          <MotiView
            from={{
              opacity: 0,
              translateY: 10,
            }}
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{
              type: "timing",
              duration: 350,
              delay: 0 * 50,
            }}
            style={{ flex: 1, height: 70 }}
          >
            <View
              style={[
                styles.statCard,
                { borderColor: "rgba(0,0,0, 0.4)", backgroundColor: "transparent" },
              ]}
            >
              <Text style={styles.statNumber} className="!text-black">{positions.length}</Text>
              <Text style={styles.statLabel} className="!text-black">Held Positions</Text>
            </View>
          </MotiView>

          <MotiView
            from={{
              opacity: 0,
              translateY: 10,
            }}
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{
              type: "timing",
              duration: 350,
              delay: 2 * 50,
            }}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.statCard,
                { borderColor: "rgba(16, 185, 129, 0.85)", backgroundColor: "rgba(16, 185, 129, 0.85)" },
              ]}
            >
              <Text style={styles.statNumber} className="text-black">
                ${unclaimedPayoutTotal}
              </Text>
              <Text style={styles.statLabel} className="!text-white">Unclaimed</Text>
            </View>
          </MotiView>

          {/* Previous Positions Toggle Button */}
          {previousPositions.length > 0 && (
            <MotiView
              from={{
                opacity: 0,
                translateY: 10,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: "timing",
                duration: 350,
                delay: 3 * 50,
              }}
              style={{ flex: 1, height: 70 }}
            >
              <TouchableOpacity
                onPress={() => setShowPreviousPositions(!showPreviousPositions)}
                style={[
                  styles.statCard,
                  styles.previousToggleButton,
                  showPreviousPositions && styles.previousToggleButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={showPreviousPositions ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={showPreviousPositions ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[
                  styles.previousToggleText,
                  showPreviousPositions && styles.previousToggleTextActive,
                ]} numberOfLines={2}>
                  History
                </Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </View>

        {/* Previous Positions Table (shown when toggled) */}
        {showPreviousPositions && previousPositions.length > 0 && (
          <View style={styles.previousSectionExpanded}>
            <PreviousPositionsTable
              positions={previousPositions.slice(0, previousVisibleCount)}
              onPositionPress={handleCardPress}
              onLoadMore={handleLoadMorePrevious}
              hasMore={previousVisibleCount < previousPositions.length}
              loading={loadingHistorical}
            />
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            New bets may take 1 - 2 minutes to display
          </Text>
        </View>

        {/* Error Section */}
        {lastError && (
          <View style={styles.errorSection}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={20}
              color="#ef4444"
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Loading Error</Text>
              <Text style={styles.errorMessage}>
                {lastError.includes("400") 
                  ? "New bets may still be processing on the blockchain"
                  : "Failed to load positions. Please try again."}
              </Text>
              {retryCount > 0 && (
                <Text style={styles.retryInfo}>
                  Retry {retryCount}/3 completed
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing || loadingMarkets}
              style={[
                styles.retryButton,
                (refreshing || loadingMarkets) && styles.retryButtonDisabled
              ]}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={refreshing || loadingMarkets ? "#9ca3af" : "#ffffff"}
              />
              <Text style={[
                styles.retryButtonText,
                (refreshing || loadingMarkets) && styles.retryButtonTextDisabled
              ]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}


        
        {/* Positions Section with infinite scroll */}
        <FlatList
          data={positions.slice(0, visibleCount)}
          keyExtractor={(position: any) => getPositionKey(position)}
          renderItem={({ item: position, index: idx }: { item: any; index: number }) => (
            <MotiView
              from={{
                opacity: 0,
                translateY: 10,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: "timing",
                duration: 350,
                delay: (3 + idx) * 50,
              }}
              style={{ marginBottom: 16 }}
            >
              <SwipeablePositionCard
                position={position}
                onClaim={async () => {
                  await settlePosition(position);
                }}
                onBurn={async () => {
                  await settlePosition(position);
                }}
                onPress={() => handleCardPress(position.marketId)}
                isClaiming={position.isClaiming || false}
              />
            </MotiView>
          )}
          ListEmptyComponent={
            <MotiView
              from={{
                opacity: 0,
                translateY: 10,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: "timing",
                duration: 350,
                delay: 3 * 50,
              }}
            >
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={48}
                  color="rgba(255, 255, 255, 0.5)"
                />
                <Text style={styles.emptyText}>No positions found</Text>
                <Text style={styles.emptySubtext}>
                  Start betting on markets to see your positions here
                </Text>
              </View>
            </MotiView>
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </View>
    </DefaultBg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorContent: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  errorMessage: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    lineHeight: 16,
  },
  retryInfo: {
    color: '#ef4444',
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
    fontStyle: 'italic',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  retryButtonDisabled: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 6,
  },
  retryButtonTextDisabled: {
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  previousToggleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  previousToggleButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  previousToggleText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  previousToggleTextActive: {
    color: theme.colors.onSurface,
  },
  previousSectionExpanded: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 2,
  },
  statNumber: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  previousSection: {
    marginTop: 48,
    paddingTop: 32,
    paddingBottom: 24,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 32,
    marginHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  sectionSubtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
  },
  tableWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emptyPreviousContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderStyle: 'dashed',
  },
  emptyPreviousText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 20,
  },
});
