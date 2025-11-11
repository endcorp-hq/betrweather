import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, Image, Linking } from "react-native";
import { DefaultBg } from "../components/ui";
import { useUser } from "../hooks/useUser";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import * as Clipboard from "expo-clipboard";
import { useMobileWallet } from "@/hooks";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LeaderboardEntry, useLeaderboard } from "../hooks/useLeaderboard";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { USDC_ICON } from "../components/ui/svg/usdc";

export default function ProfileScreen() {
  const { user } = useUser();
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const [selectedSegment, setSelectedSegment] = useState<
    "personal" | "leaderboard"
  >("personal");

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: disconnect },
    ]);
  };

  const copyWalletAddress = () => {
    if (selectedAccount?.publicKey) {
      Clipboard.setStringAsync(selectedAccount.publicKey.toBase58());
      Alert.alert("Copied", "Wallet address copied to clipboard");
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleTwitterPress = () => {
    Linking.openURL("https://x.com/betrweather");
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:betrweather@endcorp.co");
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://betrweather.xyz/");
  };

  return (
    <DefaultBg>
      <View className="flex-1 px-6 pt-12">
        {/* Header Section */}
        <View className="flex-row items-center justify-between mb-8">
          {/* User Info */}
          <View className="flex-row items-center flex-1">
            {/* User Icon */}
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-3">
              <Text className="text-white text-xl font-better-semi-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>

            {/* Name and Email */}
            <View className="flex-1">
              <Text className="text-white text-lg font-better-semi-bold">
                {user?.name || "User"}
              </Text>
              {user?.email && (
                <Text className="text-gray-300 text-sm font-better-regular">
                  {user.email}
                </Text>
              )}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500/20 px-4 py-2 rounded-lg border border-red-500/30"
          >
            <Text className="text-red-400 font-better-medium">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Address Section */}
        <TouchableOpacity
          onPress={copyWalletAddress}
          className="flex-row items-center mb-4"
        >
          {/* Wallet Icon */}
          <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons name="wallet" size={16} color="white" />
          </View>

          {/* Wallet Address */}
          <Text className="text-white text-base font-better-medium">
            {truncateAddress(selectedAccount?.publicKey?.toBase58() || "")}
          </Text>
        </TouchableOpacity>

        {/* Streak Badge */}
        <View className="mb-6">
          <View className="flex-row items-center bg-green-500/20 px-3 py-2 rounded-full border border-green-500/40 self-start">
            <MaterialCommunityIcons name="fire" size={18} color="#34d399" />
            <Text className="text-green-400 text-[15px] font-better-semi-bold ml-1 mt-1">
              {user?.streak || 0}
            </Text>
          </View>
        </View>

        {/* Social Links Section */}
        <View className="mb-8">
          <View className="flex-row justify-evenly w-full">
            {/* X (Twitter) */}
            <TouchableOpacity
              onPress={handleTwitterPress}
              className="items-center justify-center bg-white rounded-full w-12 h-12"
              activeOpacity={0.7}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-black text-xl font-better-bold">
                𝕏
              </Text>
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              onPress={handleEmailPress}
              className="items-center justify-center bg-white rounded-full w-12 h-12"
              activeOpacity={0.7}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons name="gmail" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Website */}
            <TouchableOpacity
              onPress={handleWebsitePress}
              className="items-center justify-center bg-white rounded-full w-12 h-12"
              activeOpacity={0.7}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons name="web" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segment Buttons */}
        <View className="flex-row bg-white/10 rounded-lg p-1 mb-6">
          <TouchableOpacity
            onPress={() => setSelectedSegment("personal")}
            className={`flex-1 py-3 rounded-md ${
              selectedSegment === "personal" ? "" : "bg-transparent"
            }`}
            style={selectedSegment === "personal" ? {
              backgroundColor: '#8b5cf6',
            } : {}}
          >
            <Text
              className={`text-center font-better-medium ${
                selectedSegment === "personal" ? "text-white" : "text-gray-400"
              }`}
            >
              Personal Stats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedSegment("leaderboard")}
            className={`flex-1 py-3 rounded-md ${
              selectedSegment === "leaderboard"
                ? ""
                : "bg-transparent"
            }`}
            style={selectedSegment === "leaderboard" ? {
              backgroundColor: '#8b5cf6',
            } : {}}
          >
            <Text
              className={`text-center font-better-medium ${
                selectedSegment === "leaderboard"
                  ? "text-white"
                  : "text-gray-400"
              }`}
            >
              Leaderboard
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View className="flex-1">
          {selectedSegment === "personal" ? (
            <PersonalStatsView user={user} />
          ) : (
            <LeaderboardView />
          )}
        </View>
      </View>
    </DefaultBg>
  );
}

const formatNumber = (value: number | string | undefined, decimals: number): string => {
  if (!value && value !== 0) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Convert to fixed decimal string
  const fixed = typeof num === "number" ? num.toFixed(decimals) : num;
  
  // Remove trailing zeros and decimal point if whole number
  const formatted = fixed.replace(/\.?0+$/, '');
  
  return formatted;
};



// Personal Stats Component
function PersonalStatsView({ user }: { user: any }) {
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Loading user data...</Text>
      </View>
    );
  }

  return (
    <View className=" flex flex-col gap-y-4">
      {/* Grid Cards - Bets Won & Win Rate */}
      <View className="flex-row gap-4">
        {/* Bets Won Card */}
        <View className="flex-1 bg-white/10 rounded-2xl p-6 border border-white/5">
          <View className="items-center">
            
            
            {/* Main Value */}
            <Text className="text-white text-[32px] font-better-bold mt-4 mb-2">
              {user.betsWon || 0}
            </Text>
            
            {/* Label */}
            <Text className="text-white text-base font-better-medium mb-1">
              Bets Won
            </Text>
            
            {/* Subtitle */}
            <Text className="text-gray-400 text-base font-better-regular">
              Total Bets: <Text className="text-white font-better-semi-bold">{user.totalBets || 0}</Text>
            </Text>
          </View>
        </View>

        {/* Win Rate Card */}
        <View className="flex-1 bg-white/10 rounded-2xl p-6 border border-white/5">
          <View className="items-center">
           
            
            {/* Main Value */}
            <Text className="text-white text-[32px] font-better-bold mt-4 mb-2">
              {formatNumber(user.winRate, 1)}%
            </Text>
            
            {/* Label */}
            <Text className="text-white text-base font-better-medium mb-1">
              Win Rate
            </Text>
            
            {/* Subtitle */}
            {/* <Text className="text-gray-400 text-sm font-better-regular">
              Success rate
            </Text> */}
          </View>
        </View>
      </View>

      {/* Full Width Winnings Card */}
      <View className="bg-white/10 rounded-2xl p-6 border border-white/5">
        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons 
            name="trophy" 
            size={24} 
            color="#fbbf24" 
          />
          <Text className="text-white text-lg font-better-semi-bold ml-2">
            Total Winnings
          </Text>
        </View>
        
        <View className="space-y-3">
          {/* USDC */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <USDC_ICON width={20} height={20} />
              </View>
              <Text className="text-gray-300 font-better-regular text-base">USDC</Text>
            </View>
            <Text className="text-white font-better-semi-bold text-lg">
              ${formatNumber((user.totalWonAmountUSDC || 0) / 1000000, 4)}
            </Text>
          </View>
          
          {/* BONK */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full items-center justify-center mr-3">
                <Image
                  source={require("../../assets/bonk-logo.png")}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-gray-300 font-better-regular text-base">BONK</Text>
            </View>
            <Text className="text-white font-better-semi-bold text-lg">
              {formatNumber((user.totalWonAmountBonk || 0) / 1000000, 4)}
            </Text>
          </View>

          {/* SOL */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full items-center justify-center mr-3">
                <Image
                  source={require("../../assets/sol-logo.jpeg")}
                  style={{ width: 18, height: 18, borderRadius: 16 }}
                  resizeMode="cover"
                />
              </View>
              <Text className="text-gray-300 font-better-regular text-base">SOL</Text>
            </View>
            <Text className="text-white font-better-semi-bold text-lg">
              {formatNumber((user.totalWonAmountSol || 0) / LAMPORTS_PER_SOL, 6)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Leaderboard Component
function LeaderboardView() {
  const { data: leaderboardData, isLoading, error } = useLeaderboard();
  const { user } = useUser();

  // Sort by betsWon (descending) and reassign ranks
  const sortedLeaderboardData = React.useMemo(() => {
    if (!leaderboardData) return [];
    
    return [...leaderboardData]
      .sort((a, b) => b.betsWon - a.betsWon)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
  }, [leaderboardData]);
  
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 font-better-regular">
          Loading leaderboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-400 font-better-regular">
          Failed to load leaderboard
        </Text>
      </View>
    );
  }

  if (!sortedLeaderboardData?.length) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 font-better-regular">
          No leaderboard data available
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-4 flex-1">
      {/* Leaderboard List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {sortedLeaderboardData.map((entry) => (
          <LeaderboardItem
            key={entry.wallet}
            entry={entry}
            isCurrentUser={user?.wallet === entry.wallet}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Individual Leaderboard Item Component
function LeaderboardItem({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-white";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  // Add this helper function
  const truncateName = (name: string | undefined) => {
    const displayName = name || "Anonymous";
    return displayName.length > 15 
      ? displayName.substring(0, 15) + "..." 
      : displayName;
  };

  return (
    <View
      className={`bg-white/10 rounded-lg p-4 mb-3 ${
        isCurrentUser ? "bg-white/20 shadow-lg shadow-blue-400/50" : ""
      }`}
    >
      <View className="flex-row items-center justify-between">
        {/* Rank and User Info */}
        <View className="flex-row items-center flex-1">
          {/* Rank */}
          <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-3">
            <Text
              className={`text-sm font-better-semi-bold ${getRankColor(
                entry.rank
              )}`}
            >
              {getRankIcon(entry.rank)}
            </Text>
          </View>

          {/* User Avatar and Name */}
          <View className="flex-row items-center flex-1">
            <View className="flex-1">
              <Text
                className={`text-white font-better-semi-bold ${
                  isCurrentUser ? "text-blue-300" : ""
                }`}
              >
                {truncateName(entry.name)}
              </Text>
              <Text className="text-gray-400 text-xs font-better-regular">
                {entry.winRate.toFixed(1)}% win rate
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="items-end">
          <Text className="text-white font-better-medium">
            {entry.totalBets} bets
          </Text>
          <Text className="text-green-400 text-sm font-better-regular">
            {entry.betsWon} Won
          </Text>
        </View>
      </View>

      {/* Additional Stats Row */}
      <View className="flex-row justify-between mt-3 pt-3 border-t border-white/10">
        <View className="flex-row space-x-4">
          <View className="">
            <Text className="text-gray-400 text-xs font-better-regular">
              Curent Streak
            </Text>
            <Text className="text-yellow-400 font-better-medium">
              {entry.streak}
            </Text>
          </View>

          {/* <View className="items-center">
            <Text className="text-gray-400 text-xs font-better-regular">Lost</Text>
            <Text className="text-red-400 font-better-medium">{entry.betsLost}</Text>
          </View> */}
        </View>
      </View>
    </View>
  );
}
