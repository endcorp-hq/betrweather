import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native";
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
      className="mt-10 rounded-xl flex flex-col justify-between border border-white bg-white/60 px-3 pt-3 pb-2 h-[198px]"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      {/* Question */}
      <Text className="text-black font-better-regular text-xl mb-4">
        {formatted.question}
      </Text>

      {!isLive && (
        <View className="mb-4">
          <Text className="text-black font-better-regular text-sm">
            {formatMarketDuration(formatted.marketStart, formatted.marketEnd)}
          </Text>
          <Text className="text-gray-600 font-better-light text-xs mt-1">
            {formatDate(formatted.marketStart)}
          </Text>
        </View>
      )}

      {/* Probability */}
      <View>
        <View className="flex-row items-center mb-1">
          <Text className="text-black font-better-medium text-base">
            {probabilityPercent}%
          </Text>
        </View>
        <View className="w-full h-2 bg-sky-blue border rounded mb-4 overflow-hidden">
          <View
            className="h-2 bg-accent-light rounded"
            style={{ width: `${probabilityPercent}%` }}
          />
        </View>
      </View>

      {/* Bottom row: Volume and State */}
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-[#7a7a8c] text-xs font-better-light">
          ${parseFloat(formatted.volume || "0").toFixed(1)} Vol.
        </Text>
        <Text className="text-[#7a7a8c] text-xs font-better-light">
          {isLive 
            ? getTimeLeft(formatted.marketEnd) // Live market: show when market ends
            : getBettingTimeLeft(formatted.marketStart) // Future market: show when betting ends
          }
        </Text>
      </View>
    </Pressable>
  );
}
