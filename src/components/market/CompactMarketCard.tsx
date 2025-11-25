import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DarkCard } from "../ui";
import { normalizeWinningDirection } from "@/utils";
import { formatMarketDuration } from "./format-market-duration";

function getTimeLeft(endTimestamp: string | number | undefined) {
  if (!endTimestamp) return "ended";
  const now = Date.now();
  const end = Number(endTimestamp) * 1000;
  const diff = end - now;
  if (diff <= 0) return "ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "soon";
}

function formatTime(timestamp: string | number | undefined) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}

export function CompactMarketCard({ market, type = "quick" }: { market: any; type?: "quick" | "rainfall" | "temperature" }) {
  const navigation = useNavigation();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const winningDirection = normalizeWinningDirection(market.winningDirection);
  const hasOutcome = winningDirection !== null;

  const handlePress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    const id = market?.id ?? market?.dbId ?? market?.marketId;
    if (id) {
      navigation.navigate("MarketDetail", {
        id: String(id),
        market,
        ...(market?.dbId !== undefined ? { dbId: String(market.dbId) } : {}),
        ...(market?.marketId !== undefined && market.marketId !== null ? { marketId: String(market.marketId) } : {}),
      });
    }
    setTimeout(() => setIsNavigating(false), 500);
  };

  // Determine status and color
  const now = Date.now();
  const marketStart = Number(market.marketStart) * 1000;
  const marketEnd = Number(market.marketEnd) * 1000;
  const isBettingOpen = now < marketStart;
  
  const statusColor = hasOutcome 
    ? "#10b981" 
    : isBettingOpen 
    ? "#10b981" 
    : "#3b82f6";
  
  const statusText = hasOutcome 
    ? "Resolved" 
    : isBettingOpen 
    ? "Predicting" 
    : "Observing";

  // Calculate odds from liquidity
  const yesLiq = Number(market.yesLiquidity || 0);
  const noLiq = Number(market.noLiquidity || 0);
  let yesOdds = 50;
  if (yesLiq + noLiq > 0) {
    yesOdds = Math.round((yesLiq / (yesLiq + noLiq)) * 100);
  }
  const noOdds = 100 - yesOdds;

  // Volume
  const volume = Number(market.volume/10**6 || 0);

  // Determine bar color based on type
  const getBarColor = () => {
    switch (type) {
      case "rainfall":
        return "#60a5fa"; // Light blue for rainfall
      case "temperature":
        return "#fb923c"; // Subtle orange for temperature
      default:
        return "#10b981"; // Green for quick markets
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        isNavigating && styles.navigating,
      ]}
      className="w-[350px] mx-auto"
    >
      <DarkCard style={styles.card} borderRadius={16}>
        {/* Header with Status and Volume */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <MaterialCommunityIcons
              name="clock-fast"
              size={11}
              color={statusColor}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
          <Text style={styles.volume}>${volume.toFixed(2)}</Text>
        </View>

        {/* Question */}
        <Text style={styles.question} numberOfLines={2}>
          {market.question}
        </Text>

        {/* Time Range */}
        <View style={styles.timeRange}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={12}
            color="rgba(255, 255, 255, 0.5)"
          />
          <Text style={styles.timeRangeText}>
            {formatMarketDuration(market.marketStart, market.marketEnd)}
          </Text>
        </View>

        {/* Odds Bar */}
        <View style={styles.oddsContainer}>
          <Text style={styles.oddsText}>{yesOdds}/{noOdds}</Text>
          <View style={styles.oddsBar}>
            <View style={[styles.yesBar, { width: `${yesOdds}%`, backgroundColor: getBarColor() }]} />
          </View>
          <View style={styles.oddsLabels}>
            <Text style={styles.noLabel}>NO</Text>
            <Text style={styles.yesLabel}>YES</Text>
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>
          {hasOutcome ? (
            <>
              <View style={styles.timeInfo}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={12}
                  color={statusColor}
                />
                <Text style={styles.timeText}>
                  Resolved to {winningDirection === "Yes" ? "YES" : "NO"}
                </Text>
              </View>
              {/* <Text style={[styles.countdownHighlight, { color: statusColor }]}>
                {winningDirection === "Yes" ? "YES" : "NO"}
              </Text> */}
            </>
          ) : isBettingOpen ? (
            <>
              <View style={styles.timeInfo}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color="rgba(255, 255, 255, 0.5)"
                />
                <Text style={styles.timeText}>
                  betting ends in {getTimeLeft(market.marketStart)}
                </Text>
              </View>
              <Text style={styles.countdownHighlight}>
                {getTimeLeft(market.marketStart)} left
              </Text>
            </>
          ) : (
            <>
              <View style={styles.timeInfo}>
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={12}
                  color="rgba(255, 255, 255, 0.5)"
                />
                <Text style={styles.timeText}>
                  resolves in {getTimeLeft(market.marketEnd)}
                </Text>
              </View>
              <Text style={styles.countdownHighlight}>
                {getTimeLeft(market.marketEnd)} left
              </Text>
            </>
          )}
        </View>

        {/* Market ID */}
        <Text style={styles.marketId}>
          {market?.marketId !== undefined ? String(market.marketId) : 'none'}
        </Text>
      </DarkCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  navigating: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  card: {
    
    padding: 12,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  volume: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  question: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    lineHeight: 16,
    marginBottom: 6,
    height: 32,
  },
  timeRange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 6,
  },
  timeRangeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontFamily: "Poppins-Regular",
  },
  oddsContainer: {
    marginBottom: 6,
  },
  oddsText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  oddsBar: {
    height: 6,
    backgroundColor: "rgba(55, 65, 81, 1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 3,
  },
  yesBar: {
    height: "100%",
    borderRadius: 3,
  },
  oddsLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  noLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontFamily: "Poppins-Regular",
  },
  yesLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
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
    gap: 3,
    flex: 1,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 9,
    fontFamily: "Poppins-Regular",
    flexShrink: 1,
  },
  countdownHighlight: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  marketId: {
    position: "absolute",
    bottom: 6,
    right: 10,
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 7,
    fontFamily: "Poppins-Regular",
  },
});

