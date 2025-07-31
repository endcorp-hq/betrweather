import React from "react";
import { Pressable, View, Text, StyleSheet, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Market, MarketType, WinningDirection } from "@endcorp/depredict";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { RefractiveBgCard } from "./RefractiveBgCard";
import { useRealTimeData } from '../../hooks/useRealTimeData';

function getTimeLeft(endTimestamp: string | number | undefined) {
  if (!endTimestamp) return "market ended";
  const now = Date.now();
  const end = Number(endTimestamp) * 1000;
  const diff = end - now;
  if (diff <= 0) return "market ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return "ending soon";
}

function getBettingTimeLeft(startTimestamp: string | number | undefined) {
  if (!startTimestamp) return "betting ended";
  const now = Date.now();
  const start = Number(startTimestamp) * 1000;
  const diff = start - now;
  if (diff <= 0) return "betting ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `betting ends in ${hours}h ${minutes}m`;
  if (minutes > 0) return `betting ends in ${minutes}m`;
  return "betting ends soon";
}

function formatDate(timestamp: string | number | undefined) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isLiveMarket(market: Market) {
  return market.marketType === MarketType.LIVE;
}

export function MarketCard({ market, index = 0, animatedValue }: { 
  market: Market; 
  index?: number;
  animatedValue?: Animated.Value;
}) {
  const navigation = useNavigation();

  // Each card subscribes to its own market data
  const { getMarketVolume, getMarketLiquidity, isMarketActive } = useRealTimeData();
  
  const marketId = Number(market.marketId);
  const realTimeVolume = getMarketVolume(marketId);
  const realTimeLiquidity = getMarketLiquidity(marketId);
  const isActive = isMarketActive(marketId);

  // Use real-time data with fallback to static data
  const displayVolume = realTimeVolume || Number(market.volume);
  const displayYesLiquidity = realTimeLiquidity?.yes || Number(market.yesLiquidity);
  const displayNoLiquidity = realTimeLiquidity?.no || Number(market.noLiquidity);

  // Determine if this is a live or future market
  const isLive = isLiveMarket(market);

  // Determine if resolved
  const winningDirection = market.winningDirection?.toLowerCase?.() || "none";
  // Check if market is resolved
  const isResolved = market.winningDirection !== WinningDirection.NONE;

  // Get market status and styling - matching StatusFilterBar colors
  const getMarketStatus = () => {
    if (isResolved) {
      if (winningDirection === "yes") {
        return {
          text: "YES WON",
          color: "#8b5cf6",
          bgColor: "rgba(139, 92, 246, 0.1)",
          icon: "check-circle",
        };
      } else if (winningDirection === "no") {
        return {
          text: "NO WON",
          color: "#8b5cf6",
          bgColor: "rgba(139, 92, 246, 0.1)",
          icon: "close-circle",
        };
      } else {
        return {
          text: "DRAW",
          color: "#8b5cf6",
          bgColor: "rgba(139, 92, 246, 0.1)",
          icon: "minus-circle",
        };
      }
    } else {
      // Check if this is an active market (future market that has completed betting but not resolved)
      const now = Date.now();
      const marketStart = Number(market.marketStart) * 1000;
      const marketEnd = Number(market.marketEnd) * 1000;

      if (isLive) {
        // Live market - betting happens during market interval
        return {
          text: "LIVE",
          color: "#3b82f6",
          bgColor: "rgba(59, 130, 246, 0.1)",
          icon: "radio-tower",
        };
      } else {
        // Future market
        if (now >= marketStart && now <= marketEnd) {
          // Market is currently running (active)
          return {
            text: "ACTIVE",
            color: "#3b82f6",
            bgColor: "rgba(59, 130, 246, 0.1)",
            icon: "play-circle",
          };
        } else if (now < marketStart) {
          // Betting period
          return {
            text: "BETTING",
            color: "#10b981",
            bgColor: "rgba(16, 185, 129, 0.1)",
            icon: "gavel",
          };
        } else {
          // Market has ended but not resolved
          return {
            text: "ACTIVE",
            color: "#3b82f6",
            bgColor: "rgba(59, 130, 246, 0.1)",
            icon: "play-circle",
          };
        }
      }
    }
  };

  const status = getMarketStatus();

  // Calculate probability from yesLiquidity and noLiquidity
  const yes = Number(market.yesLiquidity || 0);
  const no = Number(market.noLiquidity || 0);
  let probability = 0.5;
  if (yes + no > 0) {
    probability = yes / (yes + no);
  }
  const probabilityPercent = Math.round(probability * 100);

  const handlePress = () => {
    navigation.navigate("MarketDetail", { id: market.marketId });
  };

  return (
    <Animated.View
      style={[
        {
          opacity: animatedValue || 1,
          transform: [
            {
              translateY: animatedValue?.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }) || 0,
            },
          ],
        },
      ]}
    >
      <Pressable onPress={handlePress}>
        <RefractiveBgCard style={styles.card} borderRadius={16}>
          {/* Header with status badge */}
          <View style={styles.headerRow}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons
                name={status.icon as any}
                size={16}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            <Text style={styles.volume}>
              ${parseFloat(market.volume || "0").toFixed(1)}
            </Text>
          </View>

          {/* Question */}
          <Text style={styles.question} numberOfLines={2}>
            {market.question}
          </Text>

          {/* Interval and Time Details - always show time range */}
          <View style={styles.intervalSection}>
            <View style={styles.intervalRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="rgba(255, 255, 255, 0.7)"
              />
              <Text style={styles.intervalLabel}>Time:</Text>
              <Text style={styles.intervalValue}>
                {new Date(Number(market.marketStart) * 1000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}{" "}
                to{" "}
                {new Date(Number(market.marketEnd) * 1000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}
              </Text>
            </View>
          </View>

          {/* Voting Bias section */}
          <View style={styles.probabilitySection}>
            <View style={styles.probabilityHeader}>
              <Text style={styles.probabilityLabel}>Voting Bias</Text>
              <Text style={styles.probabilityValue}>{probabilityPercent}%</Text>
            </View>
            <View style={styles.probabilityBarContainer}>
              <View style={styles.probabilityBarBg}>
                <View
                  style={[
                    styles.probabilityBarFill,
                    {
                      width: `${probabilityPercent}%`,
                      backgroundColor: status.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.probabilityLabels}>
                <Text style={styles.probabilityLabelText}>NO</Text>
                <Text style={styles.probabilityLabelText}>YES</Text>
              </View>
            </View>
          </View>

          {/* Bottom info */}
          <View style={styles.bottomRow}>
            <View style={styles.timeInfo}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color="rgba(255, 255, 255, 0.6)"
              />
              <Text style={styles.timeText}>
                {isLive
                  ? getTimeLeft(market.marketEnd)
                  : getBettingTimeLeft(market.marketStart)}
              </Text>
            </View>
            {(() => {
              const startDate = new Date(Number(market.marketStart) * 1000);
              const endDate = new Date(Number(market.marketEnd) * 1000);
              const isSameDay =
                startDate.toDateString() === endDate.toDateString();

              // Check if betting is ending soon (less than 30 minutes)
              const now = Date.now();
              const bettingEndTime = Number(market.marketStart) * 1000;
              const timeUntilBettingEnds = bettingEndTime - now;
              const minutesLeft = Math.floor(timeUntilBettingEnds / (1000 * 60));

              if (minutesLeft > 0 && minutesLeft <= 30) {
                return (
                  <Text style={[styles.dateText, { color: "#f59e0b" }]}>
                    {minutesLeft} mins left
                  </Text>
                );
              }

              if (isSameDay) {
                return (
                  <Text style={styles.dateText}>
                    {formatDate(market.marketStart)}
                  </Text>
                );
              }
              return null;
            })()}
          </View>
        </RefractiveBgCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    height: 320,
    width: "100%",
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  volume: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  question: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: "Poppins-SemiBold",
  },
  probabilitySection: {
    marginBottom: 16,
  },
  probabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  probabilityLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  probabilityValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  probabilityBarContainer: {
    marginBottom: 4,
  },
  probabilityBarBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  probabilityBarFill: {
    height: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  probabilityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  probabilityLabelText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  dateText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  intervalSection: {
    marginBottom: 16,
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  intervalLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginLeft: 8,
  },
  intervalValue: {
    color: "white",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeItem: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  timeLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  timeValue: {
    color: "white",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
});
