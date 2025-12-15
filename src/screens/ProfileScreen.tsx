import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  TextInput,
  Keyboard,
} from "react-native";
import { DefaultBg, BottomSheetModal } from "../components/ui";
import type { BottomSheetButton } from "../components/ui";
import { useUser } from "../hooks/useUser";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import * as Clipboard from "expo-clipboard";
import { useMobileWallet } from "@/hooks";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LeaderboardEntry, useLeaderboard } from "../hooks/useLeaderboard";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { USDC_ICON } from "../components/ui/svg/usdc";
import { usePositionsContext } from "../contexts/PositionsProvider";
import { isPositionClaimable } from "../utils/positionUtils";
import { useNavigation } from "@react-navigation/native";
import { usePrivy } from "@privy-io/expo";
import { apiClient } from "../utils/apiClient";
import { useToast } from "@/contexts";
import { clearAuthCache } from "../utils/authCache";

/**
 * Get wallet address from Privy user
 */
function getPrivyWalletAddress(privyUser: any): string | null {
  const walletAccount = privyUser?.linked_accounts?.find(
    (account: any) =>
      account.type === "wallet" || account.walletClientType === "privy"
  );
  if (walletAccount?.address) {
    return walletAccount.address;
  }
  if (privyUser?.wallet?.address) {
    return privyUser.wallet.address;
  }
  return null;
}

export default function ProfileScreen() {
  const { user, updateUserData } = useUser();
  const { selectedAccount } = useAuthorization();
  const { positions } = usePositionsContext();
  const navigation = useNavigation<any>();
  const [selectedSegment, setSelectedSegment] = useState<
    "personal" | "leaderboard"
  >("personal");
  const { logout: logoutWithPrivy, user: privyUser } = usePrivy();
  const { toast } = useToast();

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Logout confirmation state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const claimablePositions = useMemo(
    () => positions.filter((position) => isPositionClaimable(position)),
    [positions]
  );
  const claimableCount = claimablePositions.length;
  const hasClaimable = claimableCount > 0;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear auth cache before logging out
      await clearAuthCache();
      await logoutWithPrivy();
      setShowLogoutModal(false);
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Logout Failed", "An error occurred while logging out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGoToPortfolio = () => {
    navigation.navigate("ClaimPositions");
  };

  const copyPrivyWalletAddress = async () => {
    const walletAddress = privyUser ? getPrivyWalletAddress(privyUser) : null;
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      toast.success("Copied", "Wallet address copied to clipboard");
    } else {
      toast.error("Error", "Wallet address not found");
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleEditName = () => {
    setNameInput(user?.name || "");
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameInput("");
  };

  const handleSaveName = async () => {
    const trimmedName = nameInput.trim();

    if (!trimmedName || trimmedName.length < 3) {
      toast.error("Invalid Name", "Name must be at least 3 characters");
      return;
    }

    if (trimmedName === user?.name) {
      setIsEditingName(false);
      return;
    }

    const walletAddress = privyUser ? getPrivyWalletAddress(privyUser) : null;
    if (!walletAddress) {
      toast.error("Error", "Wallet address not found");
      return;
    }

    setIsUpdatingName(true);
    try {
      const response = await apiClient.request(
        `/users/profile?walletAddress=${walletAddress}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: trimmedName,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to update name";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const updatedUser = result.data || result.user || result;

      // Optimistic update - update UI immediately without refetching
      await updateUserData(updatedUser);

      // Close modal and show success
      setIsEditingName(false);
      setNameInput("");
      Keyboard.dismiss();
      toast.success("Success", "Name updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update name";
      console.error("Error updating name:", error);
      toast.error("Update Failed", message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <DefaultBg>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="flex-row items-center justify-between mb-8">
          {/* User Info */}
          <View className="flex-row items-center flex-1">
            {/* User Icon */}
            <View className="w-12 h-12 bg-[#8b5cf6] rounded-full items-center justify-center mr-3 border border-[#e6e8ea]">
              <Text className="text-white text-xl font-better-semi-bold">
                {user?.name?.charAt(0)?.toUpperCase() || ""}
              </Text>
            </View>

            {/* Name and Email */}
            <View className="flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text
                  className={`text-lg font-better-semi-bold ${
                    user?.name ? "text-black" : "text-gray-400"
                  }`}
                >
                  {user?.name || "Agent 47"}
                </Text>
                <TouchableOpacity
                  onPress={handleEditName}
                  className="ml-2"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color="rgba(0, 0, 0, 0.7)"
                  />
                </TouchableOpacity>
              </View>
              {user?.email && (
                <Text className="text-gray-400 text-sm font-better-regular">
                  {user.email}
                </Text>
              )}
            </View>
          </View>
        </View>

        {hasClaimable ? (
          <TouchableOpacity
            onPress={handleGoToPortfolio}
            activeOpacity={0.85}
            className="flex-row items-center bg-yellow-400 border border-yellow-500/40 rounded-2xl px-4 py-4 mt-4 mb-6"
          >
            <View className="w-10 h-10 bg-yellow-500/70 rounded-full items-center justify-center mr-3 mt-1">
              <MaterialCommunityIcons
                name="bell-alert"
                size={22}
                color="#facc15"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-better-semi-bold">
                Bets Unclaimed!
              </Text>
              <Text className="text-white text-sm font-better-regular mt-1">
                {`You have ${claimableCount} ${
                  claimableCount === 1 ? "bet" : "bets"
                } ready to claim. Tap to open your portfolio.`}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#facc15"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleGoToPortfolio}
            activeOpacity={0.85}
            className="flex-row items-center rounded-2xl px-4 py-4 mt-4 mb-6"
            style={{ backgroundColor: "#f3f5f7" }}
          >
            <View className="w-10 h-10 bg-black/10 rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="wallet-outline"
                size={22}
                color="#000000"
              />
            </View>
            <View className="flex-1">
              <Text className="text-black text-base font-better-semi-bold">
                Check your positions
              </Text>
              <Text className="text-gray-600 text-sm font-better-regular mt-1">
                Open your portfolio to review claims and active bets.
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        )}

        <View
          style={{
            height: 1,
            backgroundColor: "#e4e5e6",
            marginVertical: 12,
            width: "100%",
            alignSelf: "center",
          }}
        />

        {/* Wallet Details Section */}
        {privyUser && getPrivyWalletAddress(privyUser) && (
          <View className="bg-white/10 rounded-2xl px-4 py-4 mb-6 border border-white/10">
            {/* Wallet Address Row */}
            <View className="mb-4">
              <Text className="text-gray-400 text-base font-better-regular mb-2">
                Wallet
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-black text-base font-better-medium font-mono">
                  {truncateAddress(getPrivyWalletAddress(privyUser) || "")}
                </Text>
                <TouchableOpacity
                  onPress={copyPrivyWalletAddress}
                  className="p-2"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={18}
                    color="rgba(0, 0, 0, 0.7)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Coin Balances */}
            <View className="mt-2">
              {/* Endcoin Row */}
              <View className="flex-row items-center justify-between mb-3 mx-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 bg-purple-500/20 rounded-full items-center justify-center mr-3">
                    <Text className="text-purple-500 text-xs font-better-bold">
                      E
                    </Text>
                  </View>
                  <Text className="text-black text-sm font-better-medium">
                    Endcoin
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-black text-sm font-better-semi-bold mr-3">
                    1,234.56
                  </Text>
                  
                </View>
              </View>

              {/* Gaiacoin Row */}
              <View className="flex-row items-center justify-between mx-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 bg-green-500/20 rounded-full items-center justify-center mr-3">
                    <Text className="text-green-500 text-xs font-better-bold">
                      G
                    </Text>
                  </View>
                  <Text className="text-black text-sm font-better-medium">
                    Gaiacoin
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-black text-sm font-better-semi-bold mr-3">
                    567.89
                  </Text>
                 
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Streak Badge */}
        {/* <View className="mb-6">
          <View className="flex-row items-center bg-green-500/20 px-3 py-2 rounded-full border border-green-500/40 self-start">
            <MaterialCommunityIcons name="fire" size={18} color="#34d399" />
            <Text className="text-green-400 text-[15px] font-better-semi-bold ml-1 mt-1">
              {user?.streak || 0}
            </Text>
          </View>
        </View> */}

        <View
          style={{
            height: 1,
            backgroundColor: "#e4e5e6",
            marginVertical: 12,
            width: "100%",
            alignSelf: "center",
            marginBottom: 24,
          }}
        />

        {/* Segment Buttons */}
        <View className="flex-row bg-white/10 rounded-lg p-1 mb-6 ">
          <TouchableOpacity
            onPress={() => setSelectedSegment("personal")}
            className={`flex-1 py-3 rounded-md ${
              selectedSegment === "personal" ? "" : "bg-transparent"
            }`}
            style={
              selectedSegment === "personal"
                ? {
                    backgroundColor: "#8b5cf6",
                  }
                : {}
            }
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
              selectedSegment === "leaderboard" ? "" : "bg-transparent"
            }`}
            style={
              selectedSegment === "leaderboard"
                ? {
                    backgroundColor: "#8b5cf6",
                  }
                : {}
            }
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
        <View>
          {selectedSegment === "personal" ? (
            <PersonalStatsView user={user} />
          ) : (
            <LeaderboardView />
          )}
        </View>

        {/* Settings Section - Only show on personal tab */}
        {selectedSegment === "personal" && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: "#e4e5e6",
                marginVertical: 24,
                width: "100%",
                alignSelf: "center",
              }}
            />

            <View className="mb-6">
              <Text className="text-gray-400 text-base font-better-regular mb-4">
                Settings
              </Text>

              {/* Export Private Keys Button */}
              <TouchableOpacity
                onPress={() => {
                  // TODO: Implement export private keys functionality
                  console.log("Export private keys");
                }}
                className="flex-row items-center justify-between bg-white/10 rounded-xl px-2 py-2 mb-3 border border-white/10"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="key-variant"
                    size={20}
                    color="rgba(0, 0, 0, 0.7)"
                  />
                  <Text className="text-black text-base font-better-medium ml-3">
                    Export Private Keys
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="rgba(255, 255, 255, 0.5)"
                />
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center justify-between bg-white/10 rounded-xl px-2 py-4 border border-white/10"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="logout"
                    size={20}
                    color="rgba(0, 0, 0, 0.7)"
                  />
                  <Text className="text-black text-base font-better-medium ml-3">
                    Logout
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="rgba(255, 255, 255, 0.5)"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Name Bottom Sheet Modal */}
      <BottomSheetModal
        visible={isEditingName}
        onClose={handleCancelEdit}
        title="Edit Name"
        buttons={[
          {
            label: "Cancel",
            onPress: handleCancelEdit,
            variant: "secondary",
            disabled: isUpdatingName,
          },
          {
            label: "Save",
            onPress: handleSaveName,
            variant: "primary",
            disabled:
              isUpdatingName ||
              !nameInput.trim() ||
              nameInput.trim().length < 3,
            loading: isUpdatingName,
          },
        ]}
      >
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Enter your name"
          placeholderTextColor="rgba(0, 0, 0, 0.4)"
          className="bg-gray-100 rounded-xl px-4 py-4 text-black text-base font-better-regular border border-gray-200"
          style={{ color: "#000000" }}
          autoFocus
          editable={!isUpdatingName}
          maxLength={50}
        />
      </BottomSheetModal>

      {/* Logout Confirmation Bottom Sheet Modal */}
      <BottomSheetModal
        visible={showLogoutModal}
        onClose={handleCancelLogout}
        title="Logout"
        description="Are you sure you want to logout? You'll need to sign in again to access your account."
        buttons={[
          {
            label: "Cancel",
            onPress: handleCancelLogout,
            variant: "secondary",
            disabled: isLoggingOut,
          },
          {
            label: "Logout",
            onPress: handleConfirmLogout,
            variant: "danger",
            disabled: isLoggingOut,
            loading: isLoggingOut,
          },
        ]}
      />
    </DefaultBg>
  );
}

const formatNumber = (
  value: number | string | undefined,
  decimals: number
): string => {
  if (!value && value !== 0) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  // Convert to fixed decimal string
  const fixed = typeof num === "number" ? num.toFixed(decimals) : num;

  // Remove trailing zeros and decimal point if whole number
  const formatted = fixed.replace(/\.?0+$/, "");

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
        <View
          className="flex-1 rounded-2xl p-6 border border-white/5"
          style={{ backgroundColor: "#f3f5f7" }}
        >
          <View className="items-center">
            {/* Main Value */}
            <Text className="text-black text-[32px] font-better-bold mt-4 mb-2">
              {user.betsWon || 0}
            </Text>

            {/* Label */}
            <Text className="text-black text-base font-better-medium mb-1">
              Bets Won
            </Text>

            {/* Subtitle */}
            <Text className="text-gray-600 text-base font-better-regular">
              Total Bets:{" "}
              <Text className="text-black font-better-semi-bold">
                {user.totalBets || 0}
              </Text>
            </Text>
          </View>
        </View>

        {/* Win Rate Card */}
        <View
          className="flex-1 rounded-2xl p-6 border border-white/5"
          style={{ backgroundColor: "#f3f5f7" }}
        >
          <View className="items-center">
            {/* Main Value */}
            <Text className="text-black text-[32px] font-better-bold mt-4 mb-2">
              {formatNumber(user.winRate, 1)}%
            </Text>

            {/* Label */}
            <Text className="text-black text-base font-better-medium mb-1">
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
      <View
        className="rounded-2xl p-6 border border-white/5"
        style={{ backgroundColor: "#f3f5f7" }}
      >
        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons name="trophy" size={24} color="#fbbf24" />
          <Text className="text-black text-lg font-better-semi-bold ml-2">
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
              <Text className="text-gray-700 font-better-regular text-base">
                USDC
              </Text>
            </View>
            <Text className="text-black font-better-semi-bold text-lg">
              ${formatNumber((user.totalWonAmountUSDC || 0) / 1000000, 2)}
            </Text>
          </View>

          {/* BONK */}
          {/* <View className="flex-row justify-between items-center">
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
          </View> */}

          {/* SOL */}
          {/* <View className="flex-row justify-between items-center">
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
          </View> */}
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
        rank: index + 1,
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
    <View className="space-y-4">
      {/* Leaderboard List */}
      {sortedLeaderboardData.map((entry) => (
        <LeaderboardItem
          key={entry.wallet}
          entry={entry}
          isCurrentUser={user?.wallet === entry.wallet}
        />
      ))}
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
