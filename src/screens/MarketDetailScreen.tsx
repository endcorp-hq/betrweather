import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useShortx, useAuthorization, useCreateAndSendTx } from "../hooks/solana";
import { useRealTimeMarkets } from "../hooks/useRealTimeMarkets";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  formatMarketDuration,
  DarkCard,
  DynamicTextInput,
  LogoLoader,
  MaterialCard,
  DefaultBg,
} from "@/components";
import { WinningDirection, MarketType, Market } from "@endcorp/depredict";
import axios from "axios";
import { getMint, formatDate, extractErrorMessage } from "@/utils";
import { PublicKey } from "@solana/web3.js";
import theme from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import SwipeButton from "rn-swipe-button";
import { useToast } from "@/contexts";
import { getMarketToken } from "src/utils/marketUtils";

const SUGGESTED_BETS_USDC = [5, 10, 25, 50];
const SUGGESTED_BETS_BONK = ["35k", "70k", "100k", "200k"];

// Helper function to convert BONK string to number
const parseBonkAmount = (bonkString: string): number => {
  if (bonkString.toLowerCase().includes("k")) {
    return parseInt(bonkString.toLowerCase().replace("k", "")) * 1000;
  }
  if (bonkString.toLowerCase().includes("m")) {
    return parseInt(bonkString.toLowerCase().replace("m", "")) * 1000000;
  }
  return parseInt(bonkString) || 0;
};

// Helper function to format BONK amount for display
const formatBonkAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k`;
  }
  return amount.toString();
};

function SwipeableBetCard({
  market,
  onSelect,
  scrollViewRef,
  marketEvents,
}: {
  market: any;
  onSelect: (dir: "yes" | "no") => void;
  scrollViewRef: React.RefObject<ScrollView>;
  marketEvents: any[];
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [swiping, setSwiping] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"yes" | "no" | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { bottom: 24 };

  // Memoize expensive calculations
  const isSwipeable = useMemo(() => {
    const now = Date.now();
    const marketStart = Number(market.marketStart) * 1000;
    const marketEnd = Number(market.marketEnd) * 1000;

    if (market.winningDirection !== WinningDirection.NONE) {
      return false; // Resolved markets
    }

    if (now > marketEnd) {
      return false; // Market ended but not resolved
    }

    if (market.marketType === MarketType.FUTURE && now > marketStart) {
      return false; // Future market where betting time is over
    }

    return true; // All other cases (betting, active live markets)
  }, [
    market.winningDirection,
    market.marketStart,
    market.marketEnd,
    market.marketType,
  ]);

  const marketStatus = useMemo(() => {
    const now = Date.now();
    const marketStart = Number(market.marketStart) * 1000;
    const marketEnd = Number(market.marketEnd) * 1000;

    if (market.winningDirection !== WinningDirection.NONE) {
      return { text: "RESOLVED", color: "#8b5cf6", icon: "check-circle" };
    } else if (now < marketStart) {
      return { text: "BETTING", color: "#10b981", icon: "gavel" };
    } else if (now > marketEnd) {
      return { text: "RESOLVING", color: "#f59e0b", icon: "loading" };
    } else {
      return { text: "OBSERVING", color: "#3b82f6", icon: "play-circle" };
    }
  }, [market.winningDirection, market.marketStart, market.marketEnd]);

  const handleRelease = useCallback(
    (_: any, gesture: any) => {
      if (gesture.dx > 80) {
        setSwipeDir("yes");
        Animated.timing(pan, {
          toValue: { x: 500, y: 0 },
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onSelect("yes");
          pan.setValue({ x: 0, y: 0 });
          setSwipeDir(null);
        });
      } else if (gesture.dx < -80) {
        setSwipeDir("no");
        Animated.timing(pan, {
          toValue: { x: -500, y: 0 },
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onSelect("no");
          pan.setValue({ x: 0, y: 0 });
          setSwipeDir(null);
        });
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
        setSwipeDir(null);
      }
    },
    [pan, onSelect]
  );

  // Memoize PanResponder to prevent recreation on every render
  const panResponder = useMemo(() => {
    if (!isSwipeable) return {};

    return require("react-native").PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, g: any) => Math.abs(g.dx) > 10,
      onPanResponderGrant: () => setSwiping(true),
      onPanResponderMove: (_: any, gesture: any) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: handleRelease,
      onPanResponderTerminate: () => setSwiping(false),
    }).panHandlers;
  }, [isSwipeable, handleRelease, pan]);

  const handleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && scrollViewRef.current) {
      // Scroll to completely hide the back button and market card
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      }, 100);
    }
  }, [isExpanded, scrollViewRef]);

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Swipe Direction Indicators - Only show for swipeable markets */}
      {isSwipeable && (
        <View className="flex flex-row justify-between items-center w-full mb-4 px-4">
          <View className="flex flex-row items-center gap-2">
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text
              className="text-base font-better-semi-bold"
              style={{
                color: "white",
              }}
            >
              No
            </Text>
          </View>
          <View className="flex flex-row items-center gap-2">
            <Text
              className="text-base font-better-semi-bold"
              style={{
                color: "white",
              }}
            >
              Yes
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="rgba(255, 255, 255, 0.8)"
            />
          </View>
        </View>
      )}

      <Animated.View
        style={{
          width: "100%",
          minHeight: 420,
          maxHeight: "98%",
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: "transparent",
          transform: isSwipeable
            ? [
                { translateX: pan.x },
                { translateY: pan.y },
                {
                  rotate: pan.x.interpolate({
                    inputRange: [-200, 0, 200],
                    outputRange: ["-15deg", "0deg", "15deg"],
                    extrapolate: "clamp",
                  }),
                },
              ]
            : [], // No transforms for non-swipeable markets
        }}
        {...panResponder}
      >
        {/* Combined overlay for better performance */}
        {isSwipeable && (
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 20,
              zIndex: 2,
              backgroundColor: pan.x.interpolate({
                inputRange: [-200, -80, 0, 80, 200],
                outputRange: [
                  "rgba(239, 68, 68, 0.3)", // Red for left
                  "rgba(239, 68, 68, 0.15)", // Light red
                  "transparent", // No color
                  "rgba(16, 185, 129, 0.15)", // Light green
                  "rgba(16, 185, 129, 0.3)", // Green for right
                ],
                extrapolate: "clamp",
              }),
            }}
          />
        )}

        <DarkCard style={{ flex: 1, minHeight: 420 }} borderRadius={20}>
          <View style={styles.swipeCardInner}>
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons
                name={marketStatus.icon as any}
                size={16}
                color={marketStatus.color}
              />
              <Text style={[styles.statusText, { color: marketStatus.color }]}>
                {marketStatus.text}
              </Text>
            </View>

            {/* Winning Direction Display (only show if resolved) */}
            {market.winningDirection !== WinningDirection.NONE && (
              <Text style={styles.swipeInstruction}>
                Winning Direction:{" "}
                <Text
                  style={{
                    color:
                      market.winningDirection === WinningDirection.YES
                        ? "#059669"
                        : "#dc2626",
                    fontWeight: "bold",
                  }}
                >
                  {market.winningDirection === WinningDirection.YES
                    ? "YES"
                    : "NO"}
                </Text>
              </Text>
            )}

            {/* Combined YES/NO overlay for better performance */}
            {isSwipeable && (
              <Animated.View
                style={[
                  styles.swipeOverlay,
                  {
                    opacity: pan.x.interpolate({
                      inputRange: [-200, -80, 0, 80, 200],
                      outputRange: [1, 0.5, 0, 0.5, 1],
                      extrapolate: "clamp",
                    }),
                  },
                ]}
              >
                <Animated.Text
                  style={[
                    styles.swipeNoText,
                    {
                      opacity: pan.x.interpolate({
                        inputRange: [-200, -80, 0],
                        outputRange: [1, 0.5, 0],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  NO
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.swipeYesText,
                    {
                      opacity: pan.x.interpolate({
                        inputRange: [0, 80, 200],
                        outputRange: [0, 0.5, 1],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  YES
                </Animated.Text>
              </Animated.View>
            )}

            {/* Market Question */}
            <Text style={styles.swipeCardQuestion}>{market.question}</Text>

            {/* Market Details */}
            <View style={styles.marketDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color="rgba(255, 255, 255, 0.7)"
                />
                <Text style={styles.detailLabel}>Market Time:</Text>
                <Text style={styles.detailValue}>
                  {formatMarketDuration(market.marketStart, market.marketEnd)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={16}
                  color="rgba(255, 255, 255, 0.7)"
                />
                <Text style={styles.detailLabel}>
                  {(() => {
                    const now = Date.now();
                    const marketStart = Number(market.marketStart) * 1000;
                    const marketEnd = Number(market.marketEnd) * 1000;

                    // Show "Betting Ends" for betting state or active live markets
                    if (market.winningDirection !== WinningDirection.NONE) {
                      return "Betting period ended";
                    } else if (now < marketStart) {
                      return "Betting Ends:";
                    } else if (
                      market.marketType === MarketType.LIVE &&
                      now >= marketStart &&
                      now <= marketEnd
                    ) {
                      return "Betting Ends:";
                    } else {
                      return "Betting period ended";
                    }
                  })()}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    (() => {
                      const now = Date.now();
                      const marketStart = Number(market.marketStart) * 1000;
                      const marketEnd = Number(market.marketEnd) * 1000;

                      // Apply orange color for ended betting periods
                      if (
                        market.winningDirection !== WinningDirection.NONE ||
                        (now > marketEnd &&
                          market.marketType !== MarketType.LIVE)
                      ) {
                        return { color: "#f59e0b" };
                      }
                      return {};
                    })(),
                  ]}
                >
                  {formatDate(market.marketEnd)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={16}
                  color="rgba(255, 255, 255, 0.7)"
                />
                <Text style={styles.detailLabel}>Volume:</Text>
                <Text style={styles.detailValue}>
                  ${(parseFloat(market.volume || "0") / 10 ** 6).toFixed(1)}
                  {marketEvents.some(
                    (event) => event.marketId.toString() === market.marketId
                  ) && (
                    <Text style={{ color: "#10b981", fontSize: 12 }}> ●</Text>
                  )}
                </Text>
              </View>
            </View>
          </View>
        </DarkCard>
      </Animated.View>

      {/* Expand/Collapse Arrow - Outside animated container */}
      <View style={styles.expandButtonContainer}>
        <Text className="text-white text-lg font-better-regular">
          {!isExpanded && "Market Details"}
        </Text>
        <TouchableOpacity
          onPress={handleExpand}
          style={styles.expandButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="rgba(255, 255, 255, 0.8)"
          />
        </TouchableOpacity>
      </View>

      {/* Full Screen Details Section */}
      {isExpanded && (
        <View style={styles.fullScreenDetails}>
          <ScrollView
            style={styles.detailsScrollView}
            contentContainerStyle={styles.detailsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailsCard}>
              {/* Market Description */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>
                  {market.description ||
                    "This market allows users to bet on the outcome of a specific event. The resolution will be determined based on the criteria outlined below. Users can place bets on whether the specified condition will occur within the given time frame."}
                </Text>
              </View>

              {/* Resolution Details */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Resolution Details</Text>
                <Text style={styles.descriptionText}>
                  {market.resolutionDetails ||
                    "The market will be resolved based on official data sources and verified information. The outcome will be determined at the resolution time specified above. All bets will be settled according to the official results."}
                </Text>
              </View>

              {/* Market Rules */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Market Rules</Text>
                <View style={styles.rulesList}>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>Minimum bet: $1 USDC</Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>
                      Maximum bet: $10,000 USDC
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>
                      Bets are final once placed
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>
                      Resolution based on official sources
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>
                      No refunds after betting period ends
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                    <Text style={styles.ruleText}>
                      Disputes resolved by market administrators
                    </Text>
                  </View>
                </View>
              </View>

              {/* Additional Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                <Text style={styles.descriptionText}>
                  This prediction market operates on blockchain technology,
                  ensuring transparency and immutability of all transactions.
                  All betting activity is publicly verifiable and cannot be
                  altered once confirmed on the network.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Arrow */}
          <TouchableOpacity
            onPress={() => {
              // Use requestAnimationFrame to prevent frame drops during heavy operations
              requestAnimationFrame(() => {
                setIsExpanded(false);
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ y: 0, animated: true });
                }
              });
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="chevron-up"
              size={24}
              color="rgba(255, 255, 255, 0.8)"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function SlotMachineScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { createAndSendTx } = useCreateAndSendTx();
  const { toast } = useToast();
  // @ts-ignore
  const { id } = route.params || {};

  const { openPosition, getMarketById, loadingMarket } = useShortx();

  // Get real-time markets data
  const {
    markets: realTimeMarkets,
    marketEvents,
    loadingMarkets,
  } = useRealTimeMarkets();
  const [betAmount, setBetAmount] = useState("");
  const [selectedDirection, setSelectedDirection] = useState<
    "yes" | "no" | null
  >(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  // Comment out BONK in the token selection
  const [selectedToken, setSelectedToken] = useState<"USDC" | "BONK">("USDC");
  const [showBetModal, setShowBetModal] = useState(false);
  const [betStatus, setBetStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<unknown>(null);
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Memoize real-time market lookup
  const realTimeMarket = useMemo(
    () => realTimeMarkets.find((market) => market.marketId === id),
    [realTimeMarkets, id]
  );

  // Immediately set the market if it's available from real-time data
  useEffect(() => {
    if (realTimeMarket && !selectedMarket) {
      setSelectedMarket(realTimeMarket);
    }
  }, [realTimeMarket, selectedMarket]);

  // Optimized loading logic: only show loading if we don't have the market data
  // and we're not in the middle of fetching markets
  const isLoading = !selectedMarket && (loadingMarkets || isFetchingMarket);

  useEffect(() => {
    async function fetchMarket() {
      // First try to get from real-time markets
      if (realTimeMarket) {
        setSelectedMarket(realTimeMarket);
        return;
      }

      // Check if we have the market in our cached list
      const cachedMarket = realTimeMarkets.find(market => market.marketId === id);
      if (cachedMarket) {
        setSelectedMarket(cachedMarket);
        return;
      }

      // Only show loading state if we don't have the market anywhere
      setIsFetchingMarket(true);

      // Fallback to fetching from blockchain
      try {
        const market = await getMarketById(id);
        if (market) {
          setSelectedMarket(market);
        } else {
          setSelectedMarket(null);
        }
      } catch (error) {
        console.error(
          `MarketDetailScreen: Error fetching market ${id}:`,
          error
        );
        setError(error as unknown);
        setSelectedMarket(null);
      } finally {
        setIsFetchingMarket(false);
      }
    }

    if (id) {
      fetchMarket();
    }
  }, [id, realTimeMarket, getMarketById, realTimeMarkets]);

  useEffect(() => {
    const token = getMarketToken(selectedMarket?.mint || "");
    setSelectedToken(token);
  }, [selectedMarket]);

  const handleBet = async (bet: string) => {
    if (!selectedAccount || !selectedAccount.publicKey) {
      toast.error("Wallet Error", "Please connect your wallet to place a bet", {
        position: "top",
      });
      return;
    }

    setBetStatus("loading");

    // Show loading toast and get the ID
    const loadingToastId = toast.loading(
      "Placing Bet",
      "Processing your bet on the blockchain...",
      {
        position: "top",
      }
    );

    try {
      // Parse the bet amount based on token type
      let parsedAmount: number;
      if (selectedToken === "BONK") {
        parsedAmount = parseBonkAmount(betAmount);
      } else {
        parsedAmount = parseFloat(betAmount);
      }

      if (parsedAmount <= 0) {
        toast.update(loadingToastId, {
          type: "error",
          title: "Invalid Amount",
          message: "Please enter a valid bet amount.",
          duration: 4000,
        });
        setBetStatus("error");
        return;
      }

      const metadata = {
        question: selectedMarket?.question,
        collection: false,
        startTime: selectedMarket?.marketStart,
        endTime: selectedMarket?.marketEnd,
        amount: parsedAmount,
        direction: bet === "yes" ? WinningDirection.YES : WinningDirection.NO,
      };

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/nft/create`,
        metadata,
        {
          headers: {
            "wallet-address": selectedAccount.publicKey.toBase58(),
          },
        }
      );

      const metadataUri = response.data.metadataUrl;
      if (!metadataUri || !selectedMarket) {
        // Update loading toast to error
        toast.update(loadingToastId, {
          type: "error",
          title: "Bet Failed",
          message: "Failed to create bet metadata. Please try again.",
          duration: 4000,
        });
        setBetStatus("error");
        return; // Don't navigate, just return
      }

      const buyIxs = await openPosition({
        marketId: parseInt(selectedMarket.marketId),
        direction: bet === "yes" ? { yes: {} } : { no: {} },
        amount: parsedAmount,
        token: getMint(selectedToken, "devnet").toBase58(),
        payer: selectedAccount.publicKey,
        feeVaultAccount: new PublicKey(
          process.env.EXPO_PUBLIC_FEE_VAULT ||
            "DrBmuCCXHoug2K9dS2DCoBBwzj3Utoo9FcXbDcjgPRQx"
        ),
        metadataUri: metadataUri,
      });

      if (typeof buyIxs === "string" || !buyIxs) {
        // Update loading toast to error
        toast.update(loadingToastId, {
          type: "error",
          title: "Bet Failed",
          message: "Failed to create bet transaction. Please try again.",
          duration: 4000,
        });
        setBetStatus("error");
        return; // Don't navigate, just return
      }

      const signature = await createAndSendTx(buyIxs.ixs, true, undefined, undefined, {
        addressLookupTableAccounts: buyIxs.addressLookupTableAccounts,
      });

      // Success! Update loading toast to success
      const displayAmount =
        selectedToken === "BONK"
          ? formatBonkAmount(parsedAmount)
          : `${parsedAmount}`;
      toast.update(loadingToastId, {
        type: "success",
        title: "Bet Placed!",
        message: `Successfully placed ${displayAmount} ${selectedToken} bet on ${bet.toUpperCase()}`,
        duration: 4000,
      });

      setBetStatus("success");

      // Close modal and navigate ONLY on success
      setTimeout(() => {
        setShowBetModal(false);
        setBetStatus("idle");
        setBetAmount("");
        setSelectedDirection(null);
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error("Bet error:", error);
      // Update loading toast to error
      toast.update(loadingToastId, {
        type: "error",
        title: "Bet Failed",
        message: extractErrorMessage(
          error,
          "An error occurred while placing your bet. Please try again."
        ),
        duration: 5000,
      });
      setBetStatus("idle"); // Reset immediately so user can try again
      // Don't navigate on error - modal stays open
    }
  };

  return (
    <DefaultBg>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          className="bg-transparent px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={0}
          snapToAlignment="start"
          bounces={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center justify-center mt-6 px-3 py-4 rounded-full border border-white/50 bg-white/08 max-w-40"
            activeOpacity={0.85}
          >
            <Text className="font-better-regular text-white text-sm">
              Back to markets
            </Text>
          </TouchableOpacity>

          {isLoading && !selectedMarket && (
            <View className="flex-1 items-center justify-center h-full mt-20">
              <LogoLoader message="Loading market" />
            </View>
          )}

          {Boolean(error) && !loadingMarket && (
            <MaterialCard variant="filled" style={styles.errorCard}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>
                {extractErrorMessage(error as Error)}
              </Text>
            </MaterialCard>
          )}

          {!isLoading && !error && !selectedMarket && (
            <MaterialCard variant="filled" style={styles.errorCard}>
              <Text style={styles.errorMessage}>No market found.</Text>
            </MaterialCard>
          )}

          {!isLoading && !error && selectedMarket && (
            <>
              {/* Single Swipeable Card with all info */}
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 600,
                }}
              >
                <SwipeableBetCard
                  market={selectedMarket}
                  onSelect={(dir) => {
                    setSelectedDirection(dir);
                    setShowBetModal(true);
                  }}
                  scrollViewRef={scrollViewRef}
                  marketEvents={marketEvents}
                />
              </View>
              {/* Slot Machine, Aggregated outcome, etc. can go here if desired */}
            </>
          )}
        </ScrollView>
        {/* Bet Modal (restyled) - Custom Overlay */}
        {showBetModal && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              zIndex: 1000,
            }}
          >
            {/* Add TouchableOpacity for click outside */}
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              activeOpacity={1}
              onPress={() => {
                setShowBetModal(false);
                setBetAmount(""); // Reset bet amount when modal is closed
                setSelectedDirection(null);
              }}
            />

            <TouchableOpacity
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                width: "100%",
                maxWidth: 350,
                overflow: "hidden",
              }}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header Section */}
              <View
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f0f0f0",
                  position: "relative",
                }}
              >
                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowBetModal(false);
                    setBetAmount(""); // Reset bet amount when modal is closed
                    setSelectedDirection(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    zIndex: 1,
                    width: 24,
                    height: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#666" />
                </TouchableOpacity>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingLeft: 40, // Make room for close button
                  }}
                >
                  {/* Market Question */}
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        color: "#000",
                        fontSize: 14,
                        fontFamily: "Poppins-Regular",
                        lineHeight: 18,
                      }}
                    >
                      {selectedMarket?.question || "Loading..."}
                    </Text>
                  </View>

                  {/* Direction Badge */}
                  <View
                    style={{
                      backgroundColor:
                        selectedDirection === "yes" ? "#dcfce7" : "#fee2e2",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        selectedDirection === "yes" ? "#bbf7d0" : "#fecaca",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDirection === "yes" ? "#166534" : "#dc2626",
                        fontSize: 14,
                        fontFamily: "Poppins-SemiBold",
                      }}
                    >
                      {selectedDirection === "yes" ? "YES" : "NO"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Content Section */}
              <View style={{ padding: 20 }}>
                <Text className="text-black text-lg font-better-semi-bold text-center mb-2">
                  How much do you want to bet?
                </Text>

                {/* Custom styled input for modal */}
                <View
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderColor: "#e9ecef",
                    borderWidth: 1.5,
                    borderRadius: 16,
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                    minHeight: 160,
                    width: "100%",
                  }}
                >
                  <DynamicTextInput
                    value={betAmount}
                    onChangeText={(text) => {
                      // Allow different input patterns based on token
                      if (selectedToken === "BONK") {
                        // Allow numbers and k/m suffixes for BONK
                        const regex = /^\d*\.?\d*[km]?$/i;
                        if (text === "" || regex.test(text)) {
                          setBetAmount(text);
                        }
                      } else {
                        // Only allow numbers and decimals for USDC
                        const regex = /^\d*\.?\d*$/;
                        if (text === "" || regex.test(text)) {
                          setBetAmount(text);
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      borderWidth: 0,
                      height: 100,
                    }}
                    placeholder="0"
                    disabled={betStatus === "loading"}
                    selectedToken={selectedToken}
                    // onTokenChange={(token) => {
                    //   setSelectedToken(token);
                    //   // Clear bet amount when switching tokens
                    //   setBetAmount("");
                    // }}
                  />
                </View>

                {/* Update the suggested amounts section to be additive */}
                <View style={styles.suggestedRowBig}>
                  {(selectedToken === "BONK"
                    ? SUGGESTED_BETS_BONK
                    : SUGGESTED_BETS_USDC
                  ).map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.suggestedButtonBig,
                        // Remove the selected state styling since these are now additive
                      ]}
                      onPress={() => {
                        // Add the amount to current input instead of replacing
                        let currentAmount = 0;

                        if (selectedToken === "BONK") {
                          // Parse current BONK amount
                          currentAmount = parseBonkAmount(betAmount) || 0;
                          // Parse the suggested amount
                          const suggestedAmount = parseBonkAmount(
                            amt.toString()
                          );
                          const newAmount = currentAmount + suggestedAmount;
                          setBetAmount(formatBonkAmount(newAmount));
                        } else {
                          // USDC - simple number addition
                          currentAmount = parseFloat(betAmount) || 0;
                          const newAmount =
                            currentAmount +
                            (typeof amt === "string" ? parseFloat(amt) : amt);
                          setBetAmount(newAmount.toString());
                        }
                      }}
                      activeOpacity={0.85}
                      disabled={betStatus === "loading"}
                    >
                      <Text
                        style={[
                          styles.suggestedButtonTextBig,
                          betStatus === "loading" && { opacity: 0.5 },
                        ]}
                      >
                        +{selectedToken === "BONK" ? amt : `$${amt}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Manual success/failure toggle */}
                {/* <View style={styles.manualToggleRow}>
                  <Text style={styles.manualToggleLabel}>Bet NO</Text>
                  <Switch
                    value={selectedDirection === "yes"}
                    onValueChange={(value) =>
                      setSelectedDirection(value ? "yes" : "no")
                    }
                    thumbColor={
                      selectedDirection === "yes" ? "#8b5cf6" : "#8b5cf6"
                    }
                    trackColor={{ true: "#8b5cf655", false: "#8b5cf655" }}
                    disabled={betStatus === "loading"}
                  />
                  <Text style={styles.manualToggleLabel}>Bet YES</Text>
                </View> */}
                <SwipeButton
                  disabled={
                    betStatus !== "idle" ||
                    !betAmount ||
                    (selectedToken === "BONK"
                      ? parseBonkAmount(betAmount) <= 0
                      : parseFloat(betAmount) <= 0)
                  }
                  title={
                    betStatus === "loading"
                      ? "Placing bet..."
                      : `Swipe to bet ${
                          selectedDirection?.toUpperCase() || "YES"
                        }`
                  }
                  titleColor="#ffffff"
                  titleFontSize={16}
                  titleStyles={{
                    fontFamily: "Poppins-SemiBold",
                    fontWeight: "600",
                  }}
                  onSwipeSuccess={() => {
                    // Don't close modal - keep it open during processing
                    setBetStatus("loading");
                    // Call the actual handleBet function
                    handleBet(selectedDirection || "yes");
                  }}
                  onSwipeFail={() => {
                    console.log("Swipe failed - not swiped far enough");
                  }}
                  railBackgroundColor={
                    betStatus === "loading" ? "#10b981" : "#000000"
                  }
                  railBorderColor={
                    betStatus === "loading" ? "transparent" : "#fff"
                  }
                  railFillBackgroundColor="#088F8F"
                  railFillBorderColor="#10b981"
                  railStyles={{
                    borderRadius: 30,
                    borderWidth: 1,
                  }}
                  thumbIconBackgroundColor="#10b981"
                  thumbIconBorderColor="#10b981"
                  disabledThumbIconBorderColor={"transparent"}
                  thumbIconComponent={() => (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color="#ffffff"
                    />
                  )}
                  height={60}
                  swipeSuccessThreshold={80}
                  shouldResetAfterSuccess={true}
                  resetAfterSuccessAnimDelay={500}
                  finishRemainingSwipeAnimationDuration={300}
                  containerStyles={{
                    marginBottom: 18,
                    marginTop: 18,
                  }}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </DefaultBg>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: "transparent",
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.08)",
    maxWidth: 120,
  },
  backButtonText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
  },
  loadingText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "500",
  },
  errorCard: {
    marginVertical: 18,
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    color: theme.colors.onSurface,
    fontSize: 16,
    textAlign: "center",
  },
  marketInfoCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  marketInfoHeader: {
    marginBottom: 4,
    flex: 1,
    alignItems: "flex-end",
  },
  marketInfoDate: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  marketInfoQuestion: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "Poppins-Bold",
  },
  marketInfoMeta: {
    marginTop: 2,
    gap: 2,
  },
  marketInfoMetaLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  marketInfoMetaValue: {
    color: theme.colors.onSurface,
    fontWeight: "500",
    fontFamily: "Poppins-Bold",
  },
  slotMachineCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  slotMachineRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 8,
  },
  reelWrapper: {
    alignItems: "center",
    marginHorizontal: 4,
  },
  reelLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginBottom: 4,
  },
  reelContainer: {
    width: 100,
    height: 100,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
  },
  reelItem: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  reelIcon: {
    fontSize: 48,
    textAlign: "center",
  },
  aggregatedCard: {
    marginBottom: theme.spacing.lg,
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 14,
  },
  aggregatedText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "500",
    fontFamily: "Poppins-Regular",
  },
  inputCard: {
    marginBottom: theme.spacing.lg,
    padding: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  betButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 18,
    marginHorizontal: 4,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    elevation: 2,
  },
  yesButton: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "#10b981",
  },
  noButton: {
    backgroundColor: "rgba(244,63,94,0.18)",
    borderColor: "#f43f5e",
  },
  betButtonText: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  fixedBetBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: "center",
    backgroundColor: "transparent",
    paddingBottom: 0,
  },
  fixedBetCard: {
    width: "100%",
    alignSelf: "center",
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.colors.surfaceContainerHigh,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    minHeight: 90,
    justifyContent: "center",
  },
  betLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  compactInput: {
    height: 60,
    minHeight: 40,
    maxHeight: 60,
    borderRadius: 12,
    fontSize: 32,
    paddingVertical: 0,
    marginVertical: 0,
  },
  suggestedRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  suggestedButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestedButtonText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "Poppins-Bold",
  },
  swipeCard: {
    width: "90%",
    height: 150,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  swipeCardInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeCardQuestion: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
  swipeOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  swipeYes: {
    backgroundColor: "rgba(16,185,129,0.2)",
  },
  swipeNo: {
    backgroundColor: "rgba(244,63,94,0.2)",
  },
  swipeYesText: {
    color: "#10b981",
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  swipeNoText: {
    color: "#ef4444",
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  swipeInstruction: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  swipeCardMeta: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  swipeCardMetaValue: {
    color: theme.colors.onSurface,
    fontWeight: "500",
    fontFamily: "Poppins-Bold",
  },
  betModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 100,
  },
  betModalCard: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  betModalDirection: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: "Poppins-Bold",
  },
  betModalLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    fontFamily: "Poppins-Regular",
  },
  betModalLabelBig: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: "Poppins-Bold",
  },
  suggestedRowBig: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  suggestedButtonBig: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e9ecef",
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestedButtonBigSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  suggestedButtonTextBig: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  suggestedButtonTextBigSelected: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  placeBetButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  placeBetButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  placeBetButtonBig: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  placeBetButtonTextBig: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  betStatusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 1000,
  },
  fullScreenStatusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.82)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenStatusText: {
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
    fontFamily: "Poppins-Bold",
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  betStatusCard: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  betStatusText: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
    fontFamily: "Poppins-Bold",
  },
  manualToggleRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    width: "100%",
  },
  manualToggleLabel: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Poppins-Regular",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: "Poppins-Bold",
  },
  marketDetails: {
    marginTop: 12,
    width: "100%",
    paddingHorizontal: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
  },
  detailValue: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Poppins-Bold",
    marginLeft: 8,
  },
  expandButton: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fullScreenDetails: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  detailsScrollView: {
    flex: 1,
    width: "100%",
  },
  detailsScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  detailsCard: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 400,
    width: "100%",
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "Poppins-SemiBold",
  },
  descriptionText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
  },
  rulesList: {
    marginTop: 12,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ruleText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
  },
  closeButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  swipeIndicators: {
    position: "absolute",
    top: -40,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 1,
  },
  indicatorLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicatorRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicatorText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  claimContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  claimText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
  },
  expandButtonContainer: {
    alignSelf: "center",
    marginTop: 32,
    alignItems: "center",
  },
});
