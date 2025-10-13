import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import { useAuthorization } from "../../hooks/solana/useAuthorization";
import { DefaultBg } from "../ui";
import { ConnectButton } from "./sign-in-ui";
import { useChainToggle } from "../../hooks/useChainToggle";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import React from "react";

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
  const { selectedAccount } = useAuthorization();
  const { selectedChain, toggleChain } = useChainToggle();

  if (selectedAccount) return <DefaultBg>{children}</DefaultBg>;

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

          <ChainToggle selectedChain={selectedChain} onToggle={toggleChain} />

          <View style={{ flexDirection: "row", gap: 16 }}>
            <ConnectButton selectedChain={selectedChain} />
          </View>
        </View>
      </View>
    </DefaultBg>
  );
}