import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NftMetadata, useNftMetadata } from "../solana/useNft";
import { useShortx } from "../solana/useContract";
import { DefaultBg } from "../components/ui/ScreenWrappers/DefaultBg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LogoLoader } from "../components/ui/LoadingSpinner";
import { WinningDirection } from "@endcorp/depredict";
import { useAuthorization } from "../utils/useAuthorization";
import { MotiView } from "moti";
import theme from "../theme";
import { useGlobalToast } from "../components/ui/ToastProvider";
import { useCreateAndSendTx } from "../utils/useCreateAndSendTx";

interface PositionWithMarket extends NftMetadata {
  market?: any; // Market details from getMarketById
  isClaiming?: boolean; // Track claiming state
}

// Helper functions moved outside component
const getWeatherBackground = (marketId: number) => {
  const backgrounds = [
    require("../../assets/weather/morning-cloudy.png"),
    require("../../assets/weather/day-clear.png"),
    require("../../assets/weather/night-cloudy.png"),
    require("../../assets/weather/night-clear.png"),
  ];
  return backgrounds[marketId % backgrounds.length];
};

const getStatusColor = (position: PositionWithMarket) => {
  if (!position.market) return "#3b82f6";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    // Check if user won
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "#10b981" : "#ef4444";
  }
  return "#3b82f6";
};

const getStatusText = (position: PositionWithMarket) => {
  if (!position.market) return "ACTIVE";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "WON" : "LOST";
  }
  return "ACTIVE";
};

const getStatusIcon = (position: PositionWithMarket) => {
  if (!position.market) return "clock-outline";

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    return userWon ? "trophy" : "close-circle";
  }
  return "clock-outline";
};

const calculatePayout = (position: PositionWithMarket) => {
  if (!position.market) return null;

  if (position.market.winningDirection !== WinningDirection.NONE) {
    const userWon =
      position.direction === "Yes"
        ? position.market.winningDirection === WinningDirection.YES
        : position.market.winningDirection === WinningDirection.NO;

    if (userWon) {
      // Convert position amount from lamports to SOL
      const userBetAmount = position.amount / 1000000;
      
      // Get market liquidity
      const yesLiquidity = Number(position.market.yesLiquidity || 0) / 1000000;
      const noLiquidity = Number(position.market.noLiquidity || 0) / 1000000;
      
      // Determine winning and losing side liquidity
      const winningLiquidity = position.market.winningDirection === WinningDirection.YES 
        ? yesLiquidity 
        : noLiquidity;
      const losingLiquidity = position.market.winningDirection === WinningDirection.YES 
        ? noLiquidity 
        : yesLiquidity;
      
      // Calculate user's share of the winning side
      const userShare = userBetAmount / winningLiquidity;
      
      // Calculate payout: user's share of losing side + original bet
      const payout = (userShare * losingLiquidity) + userBetAmount;
      
      return payout;
    } else {
      return 0; // Lost the bet
    }
  }
  return null; // Market not resolved yet
};

// Check if position is claimable
const isPositionClaimable = (position: PositionWithMarket) => {
  if (!position.market) return false;

  return (
    position.market.winningDirection !== WinningDirection.NONE &&
    ((position.direction === "Yes" &&
      position.market.winningDirection === WinningDirection.YES) ||
      (position.direction === "No" &&
        position.market.winningDirection === WinningDirection.NO))
  );
};

// Swipeable Position Card Component
function SwipeablePositionCard({
  position,
  onClaim,
  onPress,
  isClaiming,
}: {
  position: PositionWithMarket;
  onClaim: () => Promise<void>;
  onPress: () => void;
  isClaiming: boolean;
}) {
  const pan = useRef(new Animated.ValueXY()).current;

  // Check if position is claimable
  const isClaimable = isPositionClaimable(position);

  const handleRelease = async (_: any, gesture: any) => {
    if (isClaimable && Math.abs(gesture.dx) > 80) {
      await onClaim();

      // Snap back to original position
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
    } else {
      // Reset position
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
      // setSwipeDir(null); // This line was removed from the new_code, so it's removed here.
    }
  };

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          {
            rotate: pan.x.interpolate({
              inputRange: [-200, 0, 200],
              outputRange: ["-15deg", "0deg", "15deg"],
              extrapolate: "clamp",
            }),
          },
        ],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 8,
        elevation: 8,
      }}
      {...{
        ...require("react-native").PanResponder.create({
          onMoveShouldSetPanResponder: (_: any, g: any) =>
            isClaimable &&
            Math.abs(g.dx) > 10 &&
            Math.abs(g.dx) > Math.abs(g.dy),
          // onPanResponderGrant: () => setSwiping(true),
          onPanResponderMove: (event: any, gesture: any) => {
            // Only update X position, keep Y at 0
            pan.x.setValue(gesture.dx);
            pan.y.setValue(0);
          },
          onPanResponderRelease: handleRelease,
          // onPanResponderTerminate: () => setSwiping(false),
        }).panHandlers,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.cardTouchable}
        disabled={isClaimable || isClaiming}
      >
        <ImageBackground
          source={getWeatherBackground(position.marketId)}
          style={styles.cardBackground}
          imageStyle={styles.cardBackgroundImage}
        >
          {isClaiming && (
            <View className="w-full h-full bg-white/80 flex items-center justify-center">
              <Text className="text-black text-2xl font-better-semi-bold">
                Processing Claim
              </Text>
            </View>
          )}
          {/* Tint Overlay */}
          <View style={styles.tintOverlay}>
            {/* Top Row: Status Badge and Bet Direction */}
            <View style={styles.topRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(position)}20` },
                ]}
              >
                <MaterialCommunityIcons
                  name={getStatusIcon(position) as any}
                  size={12}
                  color={getStatusColor(position)}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(position) },
                  ]}
                >
                  {getStatusText(position)}
                </Text>
              </View>

              <View
                style={[
                  styles.directionBadge,
                  position.direction === "Yes"
                    ? styles.yesBadge
                    : styles.noBadge,
                ]}
              >
                <Text
                  style={[
                    styles.directionText,
                    position.direction === "Yes"
                      ? styles.yesText
                      : styles.noText,
                  ]}
                >
                  {position.direction}
                </Text>
              </View>
            </View>

            {/* Market Question */}
            <Text style={styles.questionText} numberOfLines={2}>
              {position.market?.question || `Market #${position.marketId}`}
            </Text>

            {/* Resolved Direction (if applicable) */}
            {position.market?.winningDirection !== WinningDirection.NONE &&
              position.market?.winningDirection && (
                <View style={styles.resolvedContainer}>
                  <Text style={styles.resolvedLabel}>Resolved:</Text>
                  <View
                    style={[
                      styles.resolvedBadge,
                      position.market.winningDirection === WinningDirection.YES
                        ? styles.yesBadge
                        : styles.noBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.resolvedText,
                        position.market.winningDirection ===
                        WinningDirection.YES
                          ? styles.yesText
                          : styles.noText,
                      ]}
                    >
                      {position.market.winningDirection === WinningDirection.YES
                        ? "YES"
                        : "NO"}
                    </Text>
                  </View>
                </View>
              )}

            {/* Amount and Payout */}
            <View style={styles.amountContainer}>
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Position Amount</Text>
                <Text style={styles.amountValue}>
                  ${(position.amount / 1000000).toFixed(2)}
                </Text>
              </View>

              <View style={styles.payoutSection}>
                <Text style={styles.payoutLabel}>
                  {position.market?.winningDirection !== WinningDirection.NONE
                    ? "Payout"
                    : "Expected Payout"}
                </Text>
                <Text
                  style={[
                    styles.payoutValue,
                    position.market?.winningDirection !== WinningDirection.NONE &&
                    !isClaimable &&
                    styles.lostPayout,
                  ]}
                >
                  $
                  {position.market?.winningDirection !== WinningDirection.NONE
                    ? (calculatePayout(position) || 0).toFixed(2)
                    : (() => {
                        // Calculate expected payout if user's side wins
                        const userBetAmount = position.amount / 1000000;
                        const yesLiquidity = Number(position.market?.yesLiquidity || 0) / 1000000;
                        const noLiquidity = Number(position.market?.noLiquidity || 0) / 1000000;
                        
                        // Determine user's side liquidity and opposite side liquidity
                        const userSideLiquidity = position.direction === "Yes" ? yesLiquidity : noLiquidity;
                        const oppositeSideLiquidity = position.direction === "Yes" ? noLiquidity : yesLiquidity;
                        
                        // Calculate expected payout
                        const userShare = userBetAmount / userSideLiquidity;
                        const expectedPayout = (userShare * oppositeSideLiquidity) + userBetAmount;
                        
                        return expectedPayout.toFixed(2);
                      })()}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { fetchNftMetadata, loading } = useNftMetadata();
  const { selectedMarket,getMarketById, payoutPosition } = useShortx();
  const { toast } = useGlobalToast();
  const { createAndSendTx } = useCreateAndSendTx();
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimPayout = async (
    position: PositionWithMarket,
    setIsClaiming: (isClaiming: boolean) => void
  ) => {
    // Show loading toast
    const loadingToastId = toast.loading(
      "Claiming Payout",
      "Processing your claim...",
      {
        position: "top",
      }
    );

    if (!selectedAccount) {
      toast.update(loadingToastId, {
        type: "error",
        title: "Error",
        message: "Please connect your wallet to claim your payout",
        duration: 4000,
      });
      return;
    }

    try {
      const tx = await payoutPosition({
        marketId: position.marketId,
        positionId: position.positionId,
        positionNonce: position.positionNonce,
        payer: selectedAccount?.publicKey,
      });

      if (!tx) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Error",
          message: "Failed to create transaction",
          duration: 4000,
        });
        return;
      }
      await createAndSendTx([], true, tx);
    } catch (error) {
      console.error("Error claiming payout:", error);
      toast.update(loadingToastId, {
        type: "error",
        title: "Error",
        message: "Failed to claim payout",
        duration: 4000,
      });
    }

    // Simulate 2-second claiming process
    setTimeout(() => {
      // Update loading toast to success
      toast.update(loadingToastId, {
        type: "success",
        title: "Claim Successful!",
        message: `Successfully claimed $${(
          calculatePayout(position) || 0
        ).toFixed(2)} payout`,
        duration: 4000,
      });

      // Remove the position from the list immediately after success toast
      setPositions((prev) =>
        prev.filter(
          (p) =>
            !(
              p.positionId === position.positionId &&
              p.positionNonce === position.positionNonce
            )
        )
      );
      setIsClaiming(false);
    }, 2000);
  };

  useEffect(() => {
    // Only fetch data if wallet is connected
    if (selectedAccount) {
      fetchNftMetadata().then(async (metadata) => {
        if (metadata) {
          setLoadingMarkets(true);

          // Fetch market details for each position
          const positionsWithMarkets = await Promise.all(
            metadata.map(async (position) => {
              console.log("position market id", position.marketId);
              try {
                const market = await getMarketById(position.marketId); // Get market directly
                
                return {
                  ...position,
                  market: market, // Use the returned market data
                };
              } catch (error) {
                console.error(
                  `Error fetching market ${position.marketId}:`,
                  error
                );
                return {
                  ...position,
                  market: null,
                };
              }
            })
          );

          setPositions(positionsWithMarkets);
          setLoadingMarkets(false);
        }
      });
    }
  }, [selectedAccount]);

  // Filter out positions with null markets for better UX
  const validPositions = positions.filter(
    (position) => position.market !== null
  );


  const handleCardPress = (marketId: number) => {
    navigation.navigate("MarketDetail", { id: marketId.toString() });
  };

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

  if (!loading && !loadingMarkets && validPositions.length === 0) {
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
              <Text style={styles.statNumber}>{validPositions.length}</Text>
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
                {validPositions
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
                {validPositions
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
              <Text style={styles.statLabel}>Total Won</Text>
                </View>
          </MotiView>
                  </View>

        {/* Positions Section with Moti animations */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {validPositions.length === 0 ? (
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
            validPositions.map((position, idx) => {
              const payout = calculatePayout(position);
              const isResolved =
                position.market?.winningDirection !== WinningDirection.NONE;

              return (
                <MotiView
                  key={`${position.positionId}-${position.positionNonce}`}
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
                      setIsClaiming(true);
                      handleClaimPayout(position, setIsClaiming);
                    }}
                    onPress={() => handleCardPress(position.marketId)}
                    isClaiming={isClaiming}
                  />
                </MotiView>
              );
            })
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
  title: {
    color: theme.colors.onSurface,
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
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
  cardTouchable: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardBackground: {
    width: "100%",
    height: 220,
    borderRadius: 20,
  },
  cardBackgroundImage: {
    borderRadius: 20,
  },
  tintOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    padding: 20,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 4,
  },
  questionText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    lineHeight: 20,
    marginBottom: 12,
  },
  resolvedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resolvedLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    marginRight: 6,
  },
  resolvedBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  resolvedText: {
    fontWeight: "600",
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  yesBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  noBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  directionText: {
    fontWeight: "600",
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  yesText: {
    color: "#059669",
  },
  noText: {
    color: "#dc2626",
  },
  amountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    marginBottom: 2,
  },
  amountValue: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  payoutSection: {
    alignItems: "flex-end",
  },
  payoutLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    marginBottom: 2,
  },
  payoutValue: {
    color: "#059669",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  lostPayout: {
    color: "#dc2626",
  },
  claimContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  claimText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    marginLeft: 4,
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 20,
  },
});
