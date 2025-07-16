import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { NftMetadata, useNftMetadata } from "../solana/useNft";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import GlassyCard from '../components/ui/GlassyCard';
import theme from '../theme';

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

  // Example trades (replace with nftMetadata if needed)
  const [trades, setTrades] = useState([
    {
      marketId: 1,
      question: "Will BTC reach $100k in 2024?",
      direction: "Yes",
      amount: 2.0,
      expectedPayout: 2.0,
    },
    {
      marketId: 1,
      question: "Will BTC reach $100k in 2024?",
      direction: "No",
      amount: 1.0,
      expectedPayout: 1.0,
    },
    {
      marketId: 1,
      question: "Will BTC reach $100k in 2024?",
      direction: "No",
      amount: 2.0,
      expectedPayout: 2.0,
    },
    {
      marketId: 1,
      question: "Will BTC reach $100k in 2024?",
      direction: "Yes",
      amount: 3.0,
      expectedPayout: 3.0,
    },
  ]);

  const handleCardPress = (marketId: number) => {
    navigation.navigate("MarketDetail", { id: marketId.toString() });
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Trades */}
        <Text style={styles.title}>User Trades</Text>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {trades.map((trade, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleCardPress(trade.marketId)}
              activeOpacity={0.92}
              style={styles.cardTouchable}
            >
              <GlassyCard style={styles.glassyCard} intensity={36} shimmer={false}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.questionText}>{trade.question}</Text>
                  <View style={[styles.directionBadge, trade.direction === "Yes" ? styles.yesBadge : styles.noBadge]}>
                    <Text style={[styles.directionText, trade.direction === "Yes" ? styles.yesText : styles.noText]}>
                      {trade.direction}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.label}>Bet Amount</Text>
                    <Text style={styles.amount}>${trade.amount.toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Expected Payout</Text>
                    <Text style={styles.payout}>${trade.expectedPayout.toFixed(2)}</Text>
                  </View>
                </View>
              </GlassyCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 0,
  },
  title: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
    marginLeft: 16,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 32,
  },
  cardTouchable: {
    marginBottom: 16,
  },
  glassyCard: {
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questionText: {
    flex: 1,
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  yesBadge: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  noBadge: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  directionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  yesText: {
    color: '#22c55e',
  },
  noText: {
    color: '#ef4444',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  label: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  amount: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  payout: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
});
