import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import theme from "../theme";
import { calculatePayout, getCurrencyLabel, formatAmountDisplay, formatPositionDate } from "../utils";
import type { HistoricalPosition } from "../hooks/useHistoricalPositions";

type PreviousPositionsTableProps = {
  positions: HistoricalPosition[];
  onPositionPress: (marketId: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
};

export function PreviousPositionsTable({
  positions,
  onPositionPress,
  onLoadMore,
  hasMore,
  loading = false,
}: PreviousPositionsTableProps) {
  if (positions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="history"
          size={48}
          color="rgba(255, 255, 255, 0.5)"
        />
        <Text style={styles.emptyText}>No previous positions</Text>
        <Text style={styles.emptySubtext}>
          Completed positions will appear here
        </Text>
      </View>
    );
  }

  const renderRow = React.useCallback(({ item: position, index }: { item: HistoricalPosition; index: number }) => {
    const currencyLabel = getCurrencyLabel(position.currency, position.market?.currency);

    const directionRaw =
      typeof position.direction === "string"
        ? position.direction.toUpperCase()
        : "";
    const isWon = position.isWon === true;
    
    // Calculate payout: prefer payoutAmount, fallback to calculated payout if won, otherwise use amount
    const payout = position.payoutAmount 
      ? Number(position.payoutAmount) 
      : isWon && position.amount 
        ? calculatePayout({ ...position, amount: position.amount } as any)
        : null;
    
    const displayAmount = payout !== null ? payout : position.amount || 0;
    const amountDisplay = formatAmountDisplay(displayAmount);
    const dateDisplay = formatPositionDate(position.claimedAt || position.createdAt);

    return (
      <TouchableOpacity
        style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
        onPress={() => onPositionPress(position.marketId)}
        activeOpacity={0.7}
      >
        <View style={styles.cellMarket}>
          <Text style={styles.marketText} numberOfLines={2}>
            {position.market?.question || `Market #${position.marketId}`}
          </Text>
        </View>
        <View style={styles.cellDirection}>
          <View
            style={[
              styles.directionBadge,
              directionRaw === "YES" && styles.directionYes,
              directionRaw === "NO" && styles.directionNo,
            ]}
          >
            <Text style={styles.directionText}>
              {directionRaw || "—"}
            </Text>
          </View>
        </View>
        <View style={styles.cellAmount}>
          <Text style={styles.amountText}>
            {currencyLabel} {amountDisplay}
          </Text>
        </View>
        <View style={styles.cellResult}>
          <MaterialCommunityIcons
            name={isWon ? "check-circle" : "close-circle"}
            size={20}
            color={isWon ? "#22c55e" : "#ef4444"}
          />
        </View>
        <View style={styles.cellDate}>
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [onPositionPress]);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.tableInner}>
          <View style={styles.tableHeader}>
            <View style={styles.cellMarket}>
              <Text style={styles.headerText}>Market</Text>
            </View>
            <View style={styles.cellDirection}>
              <Text style={styles.headerText}>Direction</Text>
            </View>
            <View style={styles.cellAmount}>
              <Text style={styles.headerText}>Amount</Text>
            </View>
            <View style={styles.cellResult}>
              <Text style={styles.headerText}>Result</Text>
            </View>
            <View style={styles.cellDate}>
              <Text style={styles.headerText}>Date</Text>
            </View>
          </View>
          <FlatList
            data={positions}
            renderItem={renderRow}
            keyExtractor={(item, index) => {
              // Use a more stable key that includes unique identifiers
              const assetId = item.assetId ?? item.nftAddress ?? '';
              const positionId = item.positionId ?? item.positionNonce ?? index;
              return `${item.marketId}-${assetId}-${positionId}`;
            }}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  onPress={onLoadMore}
                  style={styles.loadMoreButton}
                  disabled={loading}
                >
                  <Text style={styles.loadMoreText}>
                    {loading ? "Loading..." : `Load More (${positions.length} shown)`}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 400,
  },
  tableInner: {
    minWidth: 600,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  headerText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    minHeight: 56,
  },
  tableRowEven: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  cellMarket: {
    width: 200,
    paddingRight: 16,
  },
  cellDirection: {
    width: 100,
    paddingRight: 16,
  },
  cellAmount: {
    width: 120,
    paddingRight: 16,
  },
  cellResult: {
    width: 60,
    paddingRight: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cellDate: {
    width: 120,
  },
  marketText: {
    color: theme.colors.onSurface,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    lineHeight: 18,
  },
  directionBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "flex-start",
  },
  directionYes: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  directionNo: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  directionText: {
    color: theme.colors.onSurface,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  amountText: {
    color: theme.colors.onSurface,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  dateText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
  },
  loadMoreButton: {
    padding: 18,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  loadMoreText: {
    color: theme.colors.primary || "#6366f1",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.onSurface,
    fontSize: 16,
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

