import React, { useEffect } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { useShortx } from "../solana/useContract";
import { MarketCard } from "../components/ui/MarketCard";
import { useFilters } from "../components/ui/useFilters";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function MarketScreen() {
  const { markets, error, loadingMarkets, isInitialized } = useShortx();

  console.log("this is markets", markets, isInitialized, error);

  useEffect(() => {
    if (isInitialized) {
      console.log("this is markets", markets);
    }
  }, [isInitialized]);

  // Use the filter hook for time filters
  const { selected: timeFilter, FilterBar: TimeFilterBar } = useFilters([
    "daily",
    "weekly",
    "monthly",
    "longterm",
  ]);

  // Use the filter hook for status filters
  const { selected: statusFilter, FilterBar: StatusFilterBar } = useFilters([
    "betting",
    "active",
    "resolved",
  ]);

  // Filter markets based on selected filters
  const filteredMarkets = markets.filter((market) => {
    const now = Date.now();
    const marketStart = Number(market.marketStart) * 1000;
    const marketEnd = Number(market.marketEnd) * 1000;

    // Status filtering
    let matchesStatus = false;
    switch (statusFilter) {
      case "betting":
        // Betting period: current time is before market start
        matchesStatus = now < marketStart;
        break;
      case "active":
        // Active period: current time is between start and end
        matchesStatus = now >= marketStart && now < marketEnd;
        break;
      case "resolved":
        // Resolved: current time is after market end
        matchesStatus = now >= marketEnd;
        break;
      default:
        matchesStatus = true;
    }

    if (!matchesStatus) return false;

    // Time filtering
    const marketStartDate = new Date(marketStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let matchesTime = false;
    switch (timeFilter) {
      case "daily":
        // Same day as today
        const marketStartDay = new Date(marketStartDate);
        marketStartDay.setHours(0, 0, 0, 0);
        matchesTime = marketStartDay.getTime() === today.getTime();
        break;

      case "weekly":
        // Within the current week (Monday to Sunday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we need to handle it
        startOfWeek.setDate(today.getDate() - daysToMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        matchesTime =
          marketStart >= startOfWeek.getTime() &&
          marketStart <= endOfWeek.getTime();
        break;

      case "monthly":
        // Within the current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        matchesTime =
          marketStart >= startOfMonth.getTime() &&
          marketStart <= endOfMonth.getTime();
        break;

      case "longterm":
        // Beyond current month (future months)
        const startOfNextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        matchesTime = marketStart >= startOfNextMonth.getTime();
        break;

      default:
        matchesTime = true;
    }

    return matchesTime;
  });

  return (
    <ScreenWrapper>
      {loadingMarkets ? (
        <LoadingSpinner message="Loading markets..." />
      ) : (
        <View className="flex-1 pt-10">
          <Text className="text-white text-xl font-better-bold mb-2">
            Climate Prediction Markets
          </Text>

          {/* Time Filters */}
          <TimeFilterBar />

          <Text className="font-better-bold text-xl text-white flex items-center justify-center text-center w-full">
            ⦿
          </Text>

          {/* Status Filters */}
          <StatusFilterBar />

          <View className="border-b border-gray-200 h-1 mt-5 w-1/2 mx-auto rounded-full" />

          {error && <Text style={{ color: "red" }}>{error.message}</Text>}
          {!loadingMarkets && !error && filteredMarkets.length === 0 && (
            <Text className="text-white text-center mt-8 font-better-regular text-lg">
              No markets found for the selected filters.
            </Text>
          )}
          
          {/* Scrollable content area */}
          <ScrollView 
            className="flex-1 mt-4"
            showsVerticalScrollIndicator={false}
          >
            {!loadingMarkets &&
              !error &&
              filteredMarkets.map((market, idx) => (
                <MarketCard
                  key={market.address?.toString?.() || idx}
                  market={market}
                />
              ))}
          </ScrollView>
        </View>
      )}
    </ScreenWrapper>
  );
}
