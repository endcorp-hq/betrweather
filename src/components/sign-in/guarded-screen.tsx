import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import { useAuthorization } from "../../hooks/solana/useAuthorization";
import { DefaultBg } from "../ui";
import { LoginButton } from "./sign-in-ui";
import { useChainToggle } from "../../hooks/useChainToggle";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import React from "react";
import { useState, useEffect } from "react";
import { tokenManager } from "../../utils/tokenManager";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";

// Chain Toggle Component
function ChainToggle({
  selectedChain,
  onToggle,
}: {
  selectedChain: Chain;
  onToggle: () => void;
}) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const progress = React.useRef(new Animated.Value(selectedChain.includes("mainnet") ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: selectedChain.includes("mainnet") ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedChain]);

  const translateX = React.useMemo(() => {
    const half = containerWidth / 2;
    return progress.interpolate({ inputRange: [0, 1], outputRange: [0, half] });
  }, [progress, containerWidth]);

  return (
    <View className="mb-12 mt-6">
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row bg-white/10 rounded-full p-1 w-48 mx-auto"
      >
        <View
          className="flex-1 relative rounded-full border border-primary"
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Sliding background (Animated) */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 9999,
              transform: [{ translateX }],
            }}
          />

          {/* Labels */}
          <View className="flex-row">
          <View className="flex-1 py-2 px-1">
              <Text
                className={`text-center text-base font-better-medium ${
                  selectedChain.includes("mainnet")
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                Mainnet
              </Text>
            </View>
            <View className="flex-1 py-2 px-1">
              <Text
                className={`text-center text-base font-better-medium ${
                  selectedChain === "solana:devnet"
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                Devnet
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Info text */}
      <Text className="text-gray-400 font-better-medium text-base text-center mt-4 px-4">
        {selectedChain.includes("mainnet")
          ? "Mainnet requires Seeker or Superteam NFT"
          : "Open access on Devnet"}
      </Text>
    </View>
  );
}

// GuardedScreen: renders children if wallet connected, else shows centered connect button
export default function GuardedScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedAccount, clearAuthorization } = useAuthorization();
  const { jwtTokens } = useBackendAuth();
  const { selectedChain, toggleChain } = useChainToggle();
  const effectiveSelectedChain: Chain = ENABLE_NETWORK_TOGGLE ? selectedChain : 'solana:mainnet-beta';
  const [hasValidAuth, setHasValidAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!selectedAccount || !jwtTokens) {
        setHasValidAuth(false);
        return;
      }
      console.log("jwtTokens", !!jwtTokens.refreshToken, jwtTokens.refreshTokenExpiresAt);
      const refreshTokenValid = tokenManager.isRefreshTokenValid(jwtTokens);
      if (!refreshTokenValid) {
        console.log("Refresh token invalid, logging out user");
        await clearAuthorization();
        setHasValidAuth(false);
        return;
      }
      
      const accessTokenValid =
        jwtTokens.accessToken &&
        Date.now() < new Date(jwtTokens.expiresAt).getTime();

      // If access token is invalid but refresh token is valid, try to refresh
      if (!accessTokenValid && refreshTokenValid) {
        console.log("Access token invalid, attempting refresh");
        const refreshSuccess = await tokenManager.refreshTokens();
        setHasValidAuth(refreshSuccess);
      } else {
        setHasValidAuth(!!accessTokenValid);
      }
    };

    checkAuth();
  }, [selectedAccount, jwtTokens, clearAuthorization]);

  if (hasValidAuth) {
    return <DefaultBg>{children}</DefaultBg>;
  }

  // Show login screen
  return (
    <DefaultBg>
      <View className="flex-1 justify-center items-center">

        <View className="items-center ">
          <Image
            source={require("../../../assets/logo/betrCloud.png")}
            style={{ width: 132, height: 132 }}
            resizeMode="contain"
          />
          <Text className="text-white text-2xl font-better-bold mb-4">
            BetrWeather
          </Text>
          {ENABLE_NETWORK_TOGGLE ? (
            <ChainToggle selectedChain={selectedChain} onToggle={toggleChain} />
          ) : null}
          <View className="flex-row gap-4 mt-20">
            <LoginButton selectedChain={effectiveSelectedChain} />
            <SignupButton selectedChain={effectiveSelectedChain} />
          </View>
        </View>
        <View className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mx-4 mt-4">
          <Text className="text-white text-base font-better-regular text-center">
            BetrWeather predictions are currently in beta with a limited number of markets.
          </Text>
          <Text className="text-white text-base font-better-regular text-center mt-2">
            If this is your first time using the app, please click sign up to create an account. You must have a seeker or Superteam NFT to gain access. 
          </Text>
        </View>
      </View>
    </DefaultBg>
  );
}

// Signup Button Component (uses the drawer)
function SignupButton({ selectedChain }: { selectedChain: Chain }) {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setIsDrawerVisible(true)}
        activeOpacity={0.8}
        className="relative overflow-hidden w-[120px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
      >
        <Text className="font-better-medium text-white text-base text-nowrap">
          Signup
        </Text>
      </TouchableOpacity>

      <SignupDrawer
        isVisible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        selectedChain={selectedChain}
      />
    </>
  );
}

// Import the LoginDrawer component
import { SignupDrawer } from "./sign-in-ui";
import { useBackendAuth } from "src/hooks/useBackendAuth";
