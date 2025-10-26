import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DefaultBg, LogoLoader, SwipeablePositionCard } from "@/components";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import { MotiView } from "moti";
import theme from "../theme";
import { usePositionsContext } from "../contexts/PositionsProvider";
import { calculatePayout } from "@/utils";

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
  const [refreshing, setRefreshing] = useState(false);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const pageSize = 5;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  
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
      await Promise.allSettled([refreshPositions()]);
      // Reset the flag after a successful manual refresh
      setHasAttemptedInitialLoad(false);
      setVisibleCount(pageSize);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPositions]);

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing) return;
    if (visibleCount >= positions.length) return;
    setVisibleCount((current) => Math.min(current + pageSize, positions.length));
  }, [loading, refreshing, visibleCount, positions.length]);

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
              borderColor: 'rgba(255, 255, 255, 0.5)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color="white"
              style={{ marginRight: 6 }}
            />
            <Text className="font-better-regular text-white text-sm">
              Back
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Section */}
        <View style={styles.header}>
          <Text className="text-white text-2xl font-better-semi-bold mb-4">
            My Positions
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
                { borderColor: "rgba(255, 255, 255, 0.85)", backgroundColor: "rgba(255, 255, 255, 0.85)" },
              ]}
            >
              <Text style={styles.statNumber} className="!text-black">{positions.length}</Text>
              <Text style={styles.statLabel} className="!text-black">Total Positions</Text>
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
              delay: 1 * 50,
            }}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.statCard,
                { borderColor: "rgba(139, 92, 246, 0.85)", backgroundColor: "rgba(139, 92, 246, 0.85)" },
              ]}
            >
              <Text style={styles.statNumber} className="text-black">
                $
                {positions
                  .reduce((sum: number, position: any) => sum + position.amount, 0)
                  .toFixed(2)}
              </Text>
              <Text style={styles.statLabel} className="!text-white">Total Wagered</Text>
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
                $
                {positions
                  .filter((position: any) => {
                    const payout = calculatePayout(position);
                    return payout && payout > 0;
                  })
                  .reduce((sum: number, position: any) => {
                    const payout = calculatePayout(position);
                    return sum + (payout || 0);
                  }, 0)
                  .toFixed(2)}
              </Text>
              <Text style={styles.statLabel} className="!text-white">Unclaimed</Text>
            </View>
          </MotiView>
        </View>

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
          keyExtractor={(position: any) =>
            `${position.assetId?.toString?.() ?? position.assetId}-${position.positionId}-${position.positionNonce}`
          }
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

  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
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
    paddingBottom: 80,
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
});
