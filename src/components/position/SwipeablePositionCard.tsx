import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import theme from "../../theme";
import { LogoLoader } from "../ui/LoadingSpinner";
import {
  PositionWithMarket,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  isPositionClaimable,
  isPositionLost,
  calculatePayout,
} from "../../utils/positionUtils";
import { CURRENCY_DISPLAY_NAMES, CurrencyType } from "../../types/currency";

interface SwipeablePositionCardProps {
  position: PositionWithMarket;
  onClaim: () => Promise<void>;
  onPress: () => void;
  isClaiming: boolean;
  onBurn: () => Promise<void>;
}

// Minimal card design for portfolio positions

const currencySet = new Set<string>(Object.values(CurrencyType));

const resolveCurrency = (value?: string | null): CurrencyType | undefined => {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  return currencySet.has(normalized) ? (normalized as CurrencyType) : undefined;
};

const formatAmountDisplay = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

export function SwipeablePositionCard({
  position,
  onClaim,
  onPress,
  isClaiming,
  onBurn
}: SwipeablePositionCardProps) {
  // Only allow actions when market is resolved to a YES/NO outcome
  const isClaimable = isPositionClaimable(position);
  const isLost = isPositionLost(position);

  const resolvedCurrency =
    resolveCurrency(position.currency) ??
    resolveCurrency(position.market?.currency);

  const baseAmount = Number.isFinite(Number(position.amount))
    ? Number(position.amount)
    : 0;
  const payoutAmount = isClaimable ? calculatePayout(position) : null;
  const displayAmount = isClaimable && payoutAmount !== null ? payoutAmount : baseAmount;
  const amountLabel = isClaimable ? "Payout" : "Stake";
  const fallbackCurrency = position.market?.currency || position.currency || "";
  const currencyLabel = resolvedCurrency
    ? CURRENCY_DISPLAY_NAMES[resolvedCurrency]
    : fallbackCurrency.includes("_")
      ? fallbackCurrency.split("_")[0]
      : fallbackCurrency;
  const amountDisplay = formatAmountDisplay(displayAmount);

  const handleClaim = async () => {
    if (isClaimable && !isClaiming) {
      await onClaim();
    }
  };

  const handleBurn = async () => {
    if (isLost && !isClaiming) {
      await onBurn();
    }
  };

  return (
    <View style={styles.cardContainer}>
      {isClaiming && (
        <View style={styles.loaderOverlay}>
          <LogoLoader message={isClaimable ? "Claiming payout" : "Burning position"} />
        </View>
      )}
      <View style={styles.minimalCard}>
        <View style={styles.leftContent}>
          {/* Status (WON/LOST/BETTING/OBSERVING) */}
          <View style={styles.headerRow}>
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
          </View>

          {/* Market title */}
          <Text style={styles.questionText} numberOfLines={2}>
            {position.market?.question || `Market #${position.marketId}`}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{amountLabel}</Text>
            <Text style={styles.amountValue}>
              {amountDisplay}
              {currencyLabel ? ` ${currencyLabel}` : ""}
            </Text>
          </View>

          {/* Left actions
          <TouchableOpacity
            onPress={onPress}
            style={styles.viewMarketButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="eye-outline" size={16} color="white" />
            <Text style={styles.buttonText}>View Market</Text>
          </TouchableOpacity> */}
        </View>

        {/* Right primary action */}
        {(isClaimable || isLost) && (
          <View style={styles.rightAction}>
            {isClaimable ? (
              <TouchableOpacity
                onPress={handleClaim}
                style={[styles.primaryActionButton, styles.claimButton, isClaiming && styles.claimButtonDisabled]}
                activeOpacity={0.8}
                disabled={isClaiming}
              >
                <MaterialCommunityIcons name="cash-multiple" size={22} color="white" />
                <Text style={styles.primaryActionText}>
                  {isClaiming ? "Claiming" : "Claim"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleBurn}
                style={[styles.primaryActionButton, styles.burnButton, isClaiming && styles.burnButtonDisabled]}
                activeOpacity={0.8}
                disabled={isClaiming}
              >
                <MaterialCommunityIcons name="fire" size={22} color="white" />
                <Text style={styles.primaryActionText}>
                  {isClaiming ? "Burning" : "Burn"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {/* <Text style={styles.marketIdText}>
        {position?.marketId !== undefined && position?.marketId !== null
          ? String(position.marketId)
          : 'none'}
      </Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  marketIdText: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
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
  minimalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  leftContent: {
    flex: 1,
  },
  rightAction: {
    width: '30%',
    alignSelf: 'stretch',
    marginRight: -12,
    marginTop: -12,
    marginBottom: -12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 4,
  },
  questionText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    lineHeight: 24,
    marginBottom: 6,
    marginTop: 6,
  },
  amountRow: {
    marginTop: 2,
  },
  amountLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  amountValue: {
    color: "white",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  viewMarketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    height: 34,
    alignSelf: 'flex-start',
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    height: '100%',
  },
  claimButton: {
    backgroundColor: "rgba(16, 185, 129, 0.85)",
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(16, 185, 129, 0.4)",
  },
  burnButton: {
    backgroundColor: "rgba(239, 68, 68, 0.7)",
  },
  burnButtonDisabled: {
    backgroundColor: "rgba(239, 68, 68, 0.4)",
  },
  primaryActionText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  buttonText: {
    color: "white",
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    marginLeft: 6,
  },
}); 
