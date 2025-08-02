import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WinningDirection } from "@endcorp/depredict";
import theme from "../../theme";
import { LogoLoader } from "../ui/LoadingSpinner";
import {
  PositionWithMarket,
  getWeatherBackground,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  calculatePayout,
  isPositionClaimable,
  calculateExpectedPayout,
} from "../../utils/positionUtils";

interface SwipeablePositionCardProps {
  position: PositionWithMarket;
  onClaim: () => Promise<void>;
  onPress: () => void;
  isClaiming: boolean;
}

// Helper function to format market time and date
const formatMarketTime = (marketStart: string | number, marketEnd: string | number) => {
  const start = new Date(Number(marketStart) * 1000);
  const end = new Date(Number(marketEnd) * 1000);
  
  // Format time as 7pm - 8pm
  const startTime = start.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    hour12: true 
  }).toLowerCase();
  const endTime = end.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    hour12: true 
  }).toLowerCase();
  
  // Format date as "july 31st"
  const date = start.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Add ordinal suffix
  const day = start.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
  
  return `${startTime} - ${endTime} ${date}${suffix}`;
};

export function SwipeablePositionCard({
  position,
  onClaim,
  onPress,
  isClaiming,
}: SwipeablePositionCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;

  // Check if position is claimable
  const isClaimable = isPositionClaimable(position);
  
  // Check if position is lost (for hiding payout)
  const isLost = position.market?.winningDirection !== WinningDirection.NONE && 
    ((position.direction === "Yes" && position.market.winningDirection === WinningDirection.NO) ||
     (position.direction === "No" && position.market.winningDirection === WinningDirection.YES));

  const showClaimIndication = isClaimable; 

  const handleRelease = async (_: any, gesture: any) => {
    if (isClaimable && Math.abs(gesture.dx) > 80) {
      await onClaim();
    }
    
    // Always snap back to original position
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: pan.x },
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
          onPanResponderMove: (event: any, gesture: any) => {
            pan.x.setValue(gesture.dx);
            pan.y.setValue(0);
          },
          onPanResponderRelease: handleRelease,
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
            <View style={styles.loaderOverlay}>
              <LogoLoader message="Claiming payout" />
            </View>
          )}
          
          
          
          {/* Tint Overlay */}
          <View style={styles.tintOverlay}>
            {/* First Row: Verdict + Resolved Direction */}
            <View className="flex-row justify-between items-center mb-5">
              {/* Verdict Badge */}
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

              {/* Resolved Direction (if applicable) */}
              {position.market?.winningDirection !== WinningDirection.NONE &&
                position.market?.winningDirection && (
                  <View style={styles.resolvedContainer}>
                    <Text className="text-white text-sm mr-2 font-better-regular">Resolved:</Text>
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
                          position.market.winningDirection === WinningDirection.YES
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
            </View>

            {/* Second Row: Market Question */}
            <Text style={styles.questionText} numberOfLines={2}>
              {position.market?.question || `Market #${position.marketId}`}
            </Text>

            {/* Third Row: Bet Direction + Time and Date */}
            <View style={styles.betTimeRow}>
              {/* Bet Direction */}
              <View style={styles.betDirectionContainer}>
                <Text className="text-white text-sm mr-2 font-better-regular">Your Bet:</Text>
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

              {/* Time and Date */}
              {position.market?.marketStart && position.market?.marketEnd && (
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                  <Text style={styles.timeText}>
                    {formatMarketTime(position.market.marketStart, position.market.marketEnd)}
                  </Text>
                </View>
              )}
            </View>

            {/* Fourth Row: Bet Amount and Payout */}
            <View style={styles.amountContainer}>
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Position Amount</Text>
                <Text style={styles.amountValue}>
                  ${(position.amount / 1000000).toFixed(2)}
                </Text>
              </View>

              {/* Only show payout if not lost */}
              {!isLost && (
                <View style={styles.payoutSection}>
                  <Text style={styles.payoutLabel}>
                    {position.market?.winningDirection !== WinningDirection.NONE
                      ? "Payout"
                      : "Expected Payout"}
                  </Text>
                  <Text style={styles.payoutValue}>
                    $
                    {position.market?.winningDirection !== WinningDirection.NONE
                      ? (calculatePayout(position) || 0).toFixed(2)
                      : calculateExpectedPayout(position).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Claim Indication Row */}
            {showClaimIndication && (
              <View style={styles.claimIndicationRow}>
                <View style={styles.claimIndicationContainer}>
                  <MaterialCommunityIcons
                    name="gesture-swipe-right"
                    size={16}
                    color="white"
                  />
                  <Text className="text-white text-xs font-better-regular">
                    Swipe right to claim
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    height: 300,
    borderRadius: 20,
  },
  cardBackgroundImage: {
    borderRadius: 20,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  claimIndicationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  claimIndicationContent: {
    alignItems: 'center',
    padding: 16,
  },
  claimIndicationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 8,
    textAlign: 'center',
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
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginLeft: 8,
  },
  betDirectionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  betDirectionLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginRight: 8,
  },
  resolvedContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: 3,
    borderWidth: 1,
  },
  resolvedText: {
    fontWeight: "600",
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    fontSize: 10,
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
  claimIndicationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  betTimeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  claimIndicationRow: {
    alignItems: 'center',
    marginTop: 2,
  },
}); 