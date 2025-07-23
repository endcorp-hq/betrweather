import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { NftMetadata, useNftMetadata } from "../solana/useNft";
import { DefaultBg } from "../components/ui/ScreenWrappers/DefaultBg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import theme from '../theme';

const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const publicKey = selectedAccount?.publicKey.toBase58();
  const logout = async () => {
    await disconnect();
  };
  const navigation = useNavigation();
  const { fetchNftMetadata, loading } = useNftMetadata();
  const [nftMetadata, setNftMetadata] = useState<NftMetadata[]>([]);

  useEffect(() => {
    if (selectedAccount?.publicKey) {
      fetchNftMetadata(selectedAccount.publicKey.toBase58()).then(
        (metadata) => {
          if (metadata) {
            setNftMetadata(metadata);
          }
        }
      );
    }
  }, [selectedAccount?.publicKey]);

  // Example trades with more realistic data
  const [trades, setTrades] = useState([
    {
      id: 1,
      marketId: 1,
      question: "Will it rain in London tomorrow?",
      direction: "Yes",
      amount: 25.0,
      expectedPayout: 47.5,
      resolved: false,
      resolvedDirection: null,
      actualPayout: null,
      weatherBg: require("../../assets/weather/morning-cloudy.png"),
    },
    {
      id: 2,
      marketId: 2,
      question: "Will temperature exceed 30°C in Paris this week?",
      direction: "No",
      amount: 15.0,
      expectedPayout: 28.5,
      resolved: true,
      resolvedDirection: "No",
      actualPayout: 28.5,
      weatherBg: require("../../assets/weather/day-clear.png"),
    },
    {
      id: 3,
      marketId: 3,
      question: "Will there be snowfall in Berlin next month?",
      direction: "Yes",
      amount: 50.0,
      expectedPayout: 95.0,
      resolved: false,
      resolvedDirection: null,
      actualPayout: null,
      weatherBg: require("../../assets/weather/night-cloudy.png"),
    },
    {
      id: 4,
      marketId: 4,
      question: "Will wind speed exceed 50 km/h in Amsterdam?",
      direction: "No",
      amount: 30.0,
      expectedPayout: 57.0,
      resolved: true,
      resolvedDirection: "Yes",
      actualPayout: 0.0,
      weatherBg: require("../../assets/weather/night-clear.png"),
    },
  ]);

  const handleCardPress = (marketId: number) => {
    navigation.navigate("MarketDetail", { id: marketId.toString() });
  };

  const getStatusColor = (trade: any) => {
    if (trade.resolved) {
      return (trade.actualPayout || 0) > 0 ? "#10b981" : "#ef4444";
    }
    return "#3b82f6";
  };

  const getStatusText = (trade: any) => {
    if (trade.resolved) {
      return (trade.actualPayout || 0) > 0 ? "WON" : "LOST";
    }
    return "ACTIVE";
  };

  const getStatusIcon = (trade: any) => {
    if (trade.resolved) {
      return (trade.actualPayout || 0) > 0 ? "trophy" : "close-circle";
    }
    return "clock-outline";
  };

  return (
    <DefaultBg>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text className="text-white text-2xl font-better-semi-bold mb-4">My Trades</Text>
          <Text style={styles.subtitle}>Track your prediction market activity</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderColor: 'rgba(255, 255, 255, 0.6)' }]}>
            <Text style={styles.statNumber}>{trades.length}</Text>
            <Text style={styles.statLabel}>Total Bets</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(139, 92, 246, 0.6)' }]}>
            <Text style={styles.statNumber}>
              ${trades.reduce((sum, trade) => sum + trade.amount, 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Wagered</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(16, 185, 129, 0.6)' }]}>
            <Text style={styles.statNumber}>
              ${trades
                .filter(trade => trade.resolved && (trade.actualPayout || 0) > 0)
                .reduce((sum, trade) => sum + (trade.actualPayout || 0), 0)
                .toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Won</Text>
          </View>
        </View>

        {/* Trades Section */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {trades.map((trade, idx) => (
            <TouchableOpacity
              key={trade.id}
              onPress={() => handleCardPress(trade.marketId)}
              activeOpacity={0.9}
              style={styles.cardTouchable}
            >
              <ImageBackground
                source={trade.weatherBg}
                style={styles.cardBackground}
                imageStyle={styles.cardBackgroundImage}
              >
                {/* Tint Overlay */}
                <View style={styles.tintOverlay}>
                  {/* Top Row: Status Badge and Bet Direction */}
                  <View style={styles.topRow}>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(trade)}20` }]}>
                      <MaterialCommunityIcons
                        name={getStatusIcon(trade) as any}
                        size={12}
                        color={getStatusColor(trade)}
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(trade) }]}>
                        {getStatusText(trade)}
                      </Text>
                    </View>

                    <View style={[
                      styles.directionBadge, 
                      trade.direction === "Yes" ? styles.yesBadge : styles.noBadge
                    ]}>
                      <Text style={[
                        styles.directionText, 
                        trade.direction === "Yes" ? styles.yesText : styles.noText
                      ]}>
                        {trade.direction}
                      </Text>
                    </View>
                  </View>

                  {/* Market Question */}
                  <Text style={styles.questionText} numberOfLines={2}>
                    {trade.question}
                  </Text>

                  {/* Resolved Direction (if applicable) */}
                  {trade.resolved && trade.resolvedDirection && (
                    <View style={styles.resolvedContainer}>
                      <Text style={styles.resolvedLabel}>Resolved:</Text>
                      <View style={[
                        styles.resolvedBadge,
                        trade.resolvedDirection === "Yes" ? styles.yesBadge : styles.noBadge
                      ]}>
                        <Text style={[
                          styles.resolvedText,
                          trade.resolvedDirection === "Yes" ? styles.yesText : styles.noText
                        ]}>
                          {trade.resolvedDirection}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Amount and Payout */}
                  <View style={styles.amountContainer}>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Bet Amount</Text>
                      <Text style={styles.amountValue}>${trade.amount.toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.payoutSection}>
                      <Text style={styles.payoutLabel}>
                        {trade.resolved ? "Payout" : "Expected Payout"}
                      </Text>
                      <Text style={[
                        styles.payoutValue,
                        trade.resolved && (trade.actualPayout || 0) === 0 && styles.lostPayout
                      ]}>
                        ${trade.resolved ? (trade.actualPayout || 0).toFixed(2) : trade.expectedPayout.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    color: theme.colors.onSurface,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  statNumber: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  cardTouchable: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardBackground: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  cardBackgroundImage: {
    borderRadius: 20,
  },
  tintOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 20,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 4,
  },
  questionText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 20,
    marginBottom: 12,
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  yesBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  noBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  directionText: {
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  yesText: {
    color: '#059669',
  },
  noText: {
    color: '#dc2626',
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resolvedLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginRight: 6,
  },
  resolvedBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  resolvedText: {
    fontWeight: '600',
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  amountValue: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  payoutSection: {
    alignItems: 'flex-end',
  },
  payoutLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  payoutValue: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  lostPayout: {
    color: '#dc2626',
  },
});
