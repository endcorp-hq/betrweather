import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { NftMetadata, useNftMetadata } from "../solana/useNft";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";

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
      <View>
        {/* Trades */}
        <Text className="text-white text-xl font-better-bold mb-5 mt-10">
          User Trades
        </Text>
        <ScrollView className="pb-10">
          {trades.map((trade, idx) => (
            <TouchableOpacity
              key={idx}
              className="bg-white rounded-lg px-3 pt-3 pb-2 mb-4 shadow flex flex-col gap-y-6"
              onPress={() => handleCardPress(trade.marketId)}
              activeOpacity={0.85}
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="flex-1 font-better-regular text-lg text-black mr-2">
                  {trade.question}
                </Text>
                <View
                  className={`rounded-sm px-2 py-1 ${
                    trade.direction === "Yes" ? "bg-emerald-200" : "bg-red-200"
                  }`}
                >
                  <Text
                    className={`font-better-regular ${
                      trade.direction === "Yes"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {trade.direction}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <View>
                  <Text className="text-gray-500 font-better-light text-xs">
                    Bet Amount
                  </Text>
                  <Text className="font-better-semi-bold text-black">
                    ${trade.amount.toFixed(2)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-500 font-better-light text-xs">
                    Expected Payout
                  </Text>
                  <Text className="font-better-semi-bold text-green-700">
                    ${trade.expectedPayout.toFixed(2)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}
