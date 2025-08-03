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
            style={styles.statCard}
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.statValue}>{positions.length}</Text>
            <Text style={styles.statLabel}>Total Positions</Text>
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
            style={styles.statCard}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.statValue}>
              ${positions
                .reduce((total, position) => total + (calculatePayout(position) || 0), 0)
                .toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </MotiView>
        </View>

        {/* Positions List */}
        <ScrollView
          style={styles.positionsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.positionsListContent}
        >
          {positions.map((position, index) => (
            <MotiView
              key={`${position.positionId}-${position.positionNonce}`}
              from={{
                opacity: 0,
                translateY: 20,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: "timing",
                duration: 350,
                delay: (index + 2) * 50,
              }}
              style={styles.positionCard}
            >
              <SwipeablePositionCard
                position={position}
                onPress={() => handleCardPress(position.marketId)}
                onClaim={() => handleClaimPayout(position)}
                isClaiming={false}
              />
            </MotiView>
          ))}
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
  statValue: {
    color: theme.colors.onSurface,
    fontSize: 24,
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
  positionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  positionsListContent: {
    paddingBottom: 80,
  },
  positionCard: {
    marginBottom: 16,
  },
});
