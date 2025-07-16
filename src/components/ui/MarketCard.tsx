import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import theme from '../../theme';
import { formatMarket } from "../../utils/formatMarket";
import { useNavigation } from "@react-navigation/native";
import { Market, MarketType } from "shortx-sdk";
import { formatMarketDuration } from "../market/format-market-duration";

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
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function isLiveMarket(market: Market) {
  return market.marketType === MarketType.LIVE;
}

export function MarketCard({ market }: { market: any }) {
  const formatted = formatMarket(market);
  const navigation = useNavigation();

  // Determine if this is a live or future market
  const isLive = isLiveMarket(market);

  // Determine if resolved
  const isResolved = market.marketState === 'resolved';
  const winningDirection = market.winningDirection?.toLowerCase?.() || 'none';

  // Color for left border and badge
  let borderColor = 'transparent';
  let badgeColor = theme.colors.onSurfaceVariant;
  let badgeText = '';
  if (isResolved) {
    if (winningDirection === 'yes') {
      borderColor = theme.colors.success;
      badgeColor = theme.colors.success;
      badgeText = 'Yes Won';
    } else if (winningDirection === 'no') {
      borderColor = theme.colors.error;
      badgeColor = theme.colors.error;
      badgeText = 'No Won';
    } else if (winningDirection === 'draw') {
      borderColor = theme.colors.onSurfaceVariant;
      badgeColor = theme.colors.onSurfaceVariant;
      badgeText = 'Draw';
    } else {
      borderColor = theme.colors.surfaceContainerHigh;
      badgeColor = theme.colors.onSurfaceVariant;
      badgeText = 'Resolved';
    }
  }

  // Calculate probability from yesLiquidity and noLiquidity
  const yes = Number(formatted.yesLiquidity || 0);
  const no = Number(formatted.noLiquidity || 0);
  let probability = 0.5;
  if (yes + no > 0) {
    probability = yes / (yes + no);
  }
  const probabilityPercent = Math.round(probability * 100);

  const handlePress = () => {
    navigation.navigate("MarketDetail", { id: formatted.marketId });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.card,
        isResolved && {
          borderLeftWidth: 5,
          borderLeftColor: borderColor,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.question}>{market.question}</Text>
        {isResolved && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}> 
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}
      </View>

      {!isLive && (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {formatMarketDuration(formatted.marketStart, formatted.marketEnd)}
          </Text>
          <Text style={styles.metaTextSecondary}>
            {formatDate(formatted.marketStart)}
          </Text>
        </View>
      )}

      {/* Probability */}
      <View style={styles.probabilityRow}>
        <Text style={styles.probabilityText}>{probabilityPercent}%</Text>
        <View style={styles.probabilityBarBg}>
          <View style={[styles.probabilityBarFill, { width: `${probabilityPercent}%` }]} />
        </View>
      </View>

      {/* Bottom row: Volume and State */}
      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>
          ${parseFloat(formatted.volume || "0").toFixed(1)} Vol.
        </Text>
        <Text style={styles.bottomText}>
          {isLive 
            ? getTimeLeft(formatted.marketEnd)
            : getBettingTimeLeft(formatted.marketStart)
          }
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    marginHorizontal: 0,
    borderLeftWidth: 0,
    // Remove shadow and overlays for simplicity
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  question: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  badge: {
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  metaText: {
    color: theme.colors.onSurface,
    fontSize: 14,
    marginRight: theme.spacing.md,
  },
  metaTextSecondary: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  probabilityText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
    marginRight: theme.spacing.md,
  },
  probabilityBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 4,
    overflow: 'hidden',
  },
  probabilityBarFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  bottomText: {
    color: theme.colors.onSurface,
    fontSize: 12,
  },
});
