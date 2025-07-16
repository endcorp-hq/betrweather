import React, { useEffect } from "react";
import { Animated, ScrollView, Text, View, StyleSheet } from "react-native";
import { useShortx } from "../solana/useContract";
import { MarketCard } from "../components/ui/MarketCard";
import { useFilters } from "../components/ui/useFilters";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import MaterialCard from '../components/ui/MaterialCard';
import theme from '../theme';

export default function MarketScreen() {
  const { markets, error, loadingMarkets, isInitialized } = useShortx();

  useEffect(() => {
    if (isInitialized) {
      // For debugging
      // console.log("Markets:", markets);
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
    today.setHours(0, 0, 0, 0);
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
        <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Markets</Text>
          <MaterialCard elevation="level1" style={styles.filterCard}>
            <TimeFilterBar />
            <StatusFilterBar />
          </MaterialCard>
          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
          {!loadingMarkets && !error && filteredMarkets.length === 0 && (
            <Text style={styles.emptyText}>No markets found for the selected filters.</Text>
          )}
          {filteredMarkets.map((market, idx) => (
            <MarketCard
              key={market.address?.toString?.() || idx}
              market={market}
            />
          ))}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  filterCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    marginVertical: theme.spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginVertical: theme.spacing.lg,
    textAlign: 'center',
  },
});
