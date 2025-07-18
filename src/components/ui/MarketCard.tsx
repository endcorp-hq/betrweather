import React from "react";
import { Pressable, View, Image } from "react-native";
import { Text } from "react-native";
import { formatMarket } from "../../utils/formatMarket";
import { useNavigation } from "@react-navigation/native";
import { Market, MarketType, WinningDirection } from "shortx-sdk";
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

export function MarketCard({ market }: { market: Market }) {

  const navigation = useNavigation();

  // Determine if this is a live or future market
  const isLive = isLiveMarket(market);

  // Calculate probability from yesLiquidity and noLiquidity
  const yes = Number(market.yesLiquidity || 0);
  const no = Number(market.noLiquidity || 0);
  let probability = 0.5;
  if (yes + no > 0) {
    probability = yes / (yes + no);
  }
  const probabilityPercent = Math.round(probability * 100);

  // Check if market is resolved
  const isResolved = market.winningDirection !== WinningDirection.NONE;
  const resolvedDirection = isResolved ? (market.winningDirection === WinningDirection.YES ? "YES" : "NO") : null;

  const handlePress = () => {
    navigation.navigate("MarketDetail", { id: market.marketId });
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mb-10 rounded-xl flex flex-col justify-between border border-white bg-white/60 px-3 pt-3 pb-2 h-[198px]"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      {/* Question */}
      <Text className="text-black font-better-regular text-xl mb-2" numberOfLines={2}>
        {market.question}
      </Text>

      {!isLive && (
        <View className="mb-2">
          <Text className="text-black font-better-regular text-sm">
            {formatMarketDuration(market.marketStart, market.marketEnd)}
          </Text>
          <Text className="text-gray-600 font-better-light text-xs mt-1">
            {formatDate(market.marketStart)}
          </Text>
        </View>
      )}

      {/* Probability */}
      <View className="flex-1 justify-center">
        <View className="flex-row items-center mb-1">
          <Text className="text-black font-better-medium text-base">
            {probabilityPercent}%
          </Text>
        </View>
        <View className="w-full h-2 bg-sky-blue border rounded overflow-hidden">
          <View
            className="h-2 bg-accent-light rounded"
            style={{ width: `${probabilityPercent}%` }}
          />
        </View>
      </View>

      {/* Bottom row: Volume and State */}
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-[#7a7a8c] text-xs font-better-light">
          ${parseFloat(String(Number(market.volume) / 10 ** 6) || "0").toFixed(1)} Vol.
        </Text>
        
        {isResolved ? (
          <View className="flex-row items-center rounded-full px-2 py-1">
            <Text className="text-gray-700 text-xs font-better-light mr-1">
              Market Resolved to {resolvedDirection} by WeatherXM
            </Text>
            <Image 
              source={require('../../../assets/wxmlogo.png')}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <Text className="text-[#7a7a8c] text-xs font-better-light text-right flex-1 ml-2">
            {(() => {
              const now = Date.now();
              const marketStart = Number(market.marketStart) * 1000;
              const marketEnd = Number(market.marketEnd) * 1000;
              
              if (isLive) {
                return getTimeLeft(market.marketEnd);
              } else {
                if (now < marketStart) {
                  return getBettingTimeLeft(market.marketStart);
                } else if (now >= marketStart && now < marketEnd) {
                  return "betting ended, market in progress";
                } else {
                  return "market ended, resolution pending";
                }
              }
            })()}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
