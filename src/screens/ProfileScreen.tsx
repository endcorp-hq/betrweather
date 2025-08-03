import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { DefaultBg } from "../components/ui/ScreenWrappers/DefaultBg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LogoLoader } from "../components/ui/LoadingSpinner";
import { useAuthorization } from "../solana/useAuthorization";
import { MotiView } from "moti";
import theme from "../theme";
import { SwipeablePositionCard } from "../components/position";
import { usePositions } from "../hooks/usePositions";
import { calculatePayout } from "../utils/positionUtils";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { positions, loading, loadingMarkets, refreshPositions, handleClaimPayout } = usePositions();
  // Refresh data when screen comes into focus (e.g., after returning from Phantom)
  useFocusEffect(
    useCallback(() => {
      if (selectedAccount) {
        refreshPositions();
      }
    }, [selectedAccount, refreshPositions])
  );

  useEffect(() => {
    // Only fetch data if wallet is connected
    if (selectedAccount) {
      refreshPositions();
    }
  }, [selectedAccount, refreshPositions]);

  const handleCardPress = useCallback((marketId: number) => {
    navigation.navigate("MarketDetail", { id: marketId.toString() });
  }, [navigation]);

  // Show loading state while fetching data
  if (loading || loadingMarkets) {
    return (
      <DefaultBg>
        <View style={styles.loadingContainer}>
          <LogoLoader
            message={
              loading ? "Loading your positions" : "Loading market details"
            }
          />
        </View>
      </DefaultBg>
    );
  }

  if (!loading && !loadingMarkets && positions.length === 0) {
    return (
      <DefaultBg>
        <View style={styles.loadingContainer}>
          <Text className="text-white text-2xl font-better-semi-bold mb-4">
            No positions found
          </Text>
          <Text style={styles.subtitle} className="px-4 text-center">
            Start betting on markets to see your positions here
          </Text>
        </View>
      </DefaultBg>
    );
  }

  return (
    <DefaultBg>
      <View style={styles.container}>
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
                { borderColor: "rgba(255, 255, 255, 0.6)" },
              ]}
            >
              <Text style={styles.statNumber}>{positions.length}</Text>
              <Text style={styles.statLabel}>Total Positions</Text>
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
                { borderColor: "rgba(139, 92, 246, 0.6)" },
              ]}
            >
              <Text style={styles.statNumber}>
                $
                {positions
                  .reduce((sum, position) => sum + position.amount / 1000000, 0)
                  .toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Wagered</Text>
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
                { borderColor: "rgba(16, 185, 129, 0.6)" },
              ]}
            >
              <Text style={styles.statNumber}>
                $
                {positions
                  .filter((position) => {
                    const payout = calculatePayout(position);
                    return payout && payout > 0;
                  })
                  .reduce((sum, position) => {
                    const payout = calculatePayout(position);
                    return sum + (payout || 0);
                  }, 0)
                  .toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Unclaimed</Text>
            </View>
          </MotiView>
        </View>

        {/* Positions Section with Moti animations */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {positions.length === 0 ? (
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
          ) : (
            positions.map((position, idx) => (
              <MotiView
                key={`${idx}`}
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
                  delay: (3 + idx) * 50, // Start after stats (3) + staggered for each card
                }}
                style={{ marginBottom: 16 }}
              >
                <SwipeablePositionCard
                  position={position}
                  onClaim={async () => {
                    await handleClaimPayout(position);
                  }}
                  onPress={() => handleCardPress(position.marketId)}
                  isClaiming={position.isClaiming || false}
                />
              </MotiView>
            ))
          )}
        </ScrollView>
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
