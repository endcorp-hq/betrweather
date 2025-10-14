import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { DefaultBg } from "../components/ui";
import { useUser } from "../hooks/useUser";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import * as Clipboard from "expo-clipboard";
import { useMobileWallet } from "@/hooks";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LeaderboardEntry, useLeaderboard } from "../hooks/useLeaderboard";
import { useUserStats } from "../hooks/useUserStats";

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
          className="flex-row items-center rounded-lg mb-8"
        >
          {/* Wallet Icon */}
          <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-3">
            <Text className="text-white text-sm">
              <MaterialCommunityIcons name="wallet" size={12} color="white" />
            </Text>
          </View>

          {/* Wallet Address */}
          <Text className="text-white text-base font-better-medium">
            {truncateAddress(selectedAccount?.publicKey?.toBase58() || "")}
          </Text>
        </TouchableOpacity>

        {/* Segment Buttons */}
        <View className="flex-row bg-white/10 rounded-lg p-1 mb-6">
          <TouchableOpacity
            onPress={() => setSelectedSegment("personal")}
            className={`flex-1 py-3 rounded-md ${
              selectedSegment === "personal" ? "bg-white/20" : "bg-transparent"
            }`}
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
                ? "bg-white/20"
                : "bg-transparent"
            }`}
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

// Personal Stats Component
function PersonalStatsView({ user }: { user: any }) {
  const { data: stats, isLoading, error } = useUserStats();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Loading stats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-400">Failed to load stats</Text>
      </View>
    );
  }

  const display = stats || user;

  return (
    <View className="space-y-4">
      {/* Main Stats */}
      <View className="bg-white/10 rounded-lg p-4">
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">
              Total Trades
            </Text>
            <Text className="text-white font-better-medium">
              {display?.totalBets || 0}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">Won</Text>
            <Text className="text-green-400 font-better-medium">
              {display?.betsWon || 0}
            </Text>
          </View>

          {/* <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">Lost</Text>
            <Text className="text-red-400 font-better-medium">{user.betsLost || 0}</Text>
          </View> */}
        </View>
      </View>

      {/* Win Rate and Streak */}
      <View className="bg-white/10 rounded-lg p-4">
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">Streak</Text>
            <Text className="text-white font-better-medium">
              {display?.streak || 0}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">Win Rate</Text>
            <Text className="text-white font-better-medium">
              {typeof display?.winRate === "number"
                ? `${display?.winRate.toFixed(2)}%`
                : display?.winRate || "0%"}
            </Text>
          </View>
        </View>
      </View>

      {/* Won Amounts */}
      <View className="bg-white/10 rounded-lg p-4">
        <Text className="text-white font-better-medium">Total Winnings</Text>
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">USDC</Text>
            <Text className="text-white font-better-medium">
              {display?.totalWonAmountUSDCFormatted || display?.totalWonAmountUSDC || 0}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">BONK</Text>
            <Text className="text-white font-better-medium">
              {display?.totalWonAmountBONKFormatted || display?.totalWonAmountBonk || 0}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-300 font-better-regular">SOL</Text>
            <Text className="text-white font-better-medium">
              {display?.totalWonAmountSOLFormatted || display?.totalWonAmountSol || 0}
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

  if (!leaderboardData?.length) {
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
      {/* Leaderboard Header */}
      {/* <View className="bg-white/10 rounded-lg p-4 mb-10">
        <Text className="text-white text-lg font-better-semi-bold mb-2">
          Top Players
        </Text>
        <Text className="text-gray-300 text-sm font-better-regular">
          {leaderboardData.length} total players
        </Text>
      </View> */}

      {/* Leaderboard List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {leaderboardData.map((entry) => (
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
    return `#${rank}`;
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
            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
              <Text className="text-white text-lg font-better-semi-bold">
                {entry.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>

            <View className="flex-1">
              <Text
                className={`text-white font-better-semi-bold ${
                  isCurrentUser ? "text-blue-300" : ""
                }`}
              >
                {entry.name || "Anonymous"}
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
