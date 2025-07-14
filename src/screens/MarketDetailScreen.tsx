import { View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useShortx } from "../solana/useContract";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { formatMarketDuration } from "../components/market/format-market-duration";
import { WinningDirection } from "shortx-sdk";
import { useAuthorization } from "../utils/useAuthorization";
import axios from "axios";
import { getMint, formatDate } from "../utils/helpers";
import { PublicKey } from "@solana/web3.js";
import { useCreateAndSendTx } from "../utils/useCreateAndSendTx";
import { DynamicTextInput } from "../components/ui/dynamicTextInput";
import { toast } from "sonner-native";
import { useAPI } from "../utils/useAPI";

const icons = {
  rain: "🌧️",
  sun: "☀️",
};

const REEL_HEIGHT = 100;
const REEL_ITEMS = ["rain", "sun", "rain", "sun", "rain"]; // looped pattern

const DUMMY_API_RESPONSE = ["rain", "sun", "rain"];

const SlotMachineScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { createAndSendTx } = useCreateAndSendTx();
  // @ts-ignore
  const { id } = route.params || {};
  const {
    openPosition,
    getMarketById,
    selectedMarket,
    loadingMarket,
    error: shortxError,
  } = useShortx();

  const [betAmount, setBetAmount] = useState("");

  useEffect(() => {
    async function fetchMarket() {
      await getMarketById(id);
    }
    if (id) fetchMarket();
  }, [id]);

  const reelAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  console.log("this is selectedAccount", selectedAccount?.publicKey);

  const handleBet = async (bet: string) => {
    if (!selectedAccount || !selectedAccount.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    const loadingToast = toast.loading("Placing trade...");
    try {
      const metadata = {
        question: selectedMarket?.question,
        collection: false,
        startTime: selectedMarket?.marketStart,
        endTime: selectedMarket?.marketEnd,
        amount: parseFloat(betAmount),
        direction: bet === "yes" ? WinningDirection.YES : WinningDirection.NO,
      };
      console.log("this is metadata",process.env.EXPO_PUBLIC_BACKEND_URL);
      const response = await axios.post(
        "http://192.168.1.20:8001/nft/create",
        metadata,
        {
          headers: {
            "wallet-address": selectedAccount.publicKey.toBase58(),
          },
        }
      );
      console.log("this is response", response);
      const metadataUri = response.data.metadataUrl;
      if (!metadataUri || !selectedMarket) {
        toast.error("Error fetching metadata", { id: loadingToast });
        return;
      }
      const buyIxs = await openPosition({
        marketId: parseInt(selectedMarket.marketId),
        direction: bet === "yes" ? { yes: {} } : { no: {} },
        amount: parseFloat(betAmount),
        mint: getMint("USDC", "devnet"),
        token: getMint("USDC", "devnet").toBase58(),
        payer: selectedAccount.publicKey,
        feeVaultAccount: new PublicKey(
          process.env.EXPO_PUBLIC_FEE_VAULT || "DrBmuCCXHoug2K9dS2DCoBBwzj3Utoo9FcXbDcjgPRQx"
        ),
        usdcMintAddress: new PublicKey(
          process.env.EXPO_PUBLIC_USDC_MINT || ""
        ),
        metadataUri: metadataUri,
      });
      if (typeof buyIxs === "string" || !buyIxs) return;
      const signature = await createAndSendTx(buyIxs.ixs, true, undefined, {
        addressLookupTableAccounts: buyIxs.addressLookupTableAccounts,
      });
      console.log("signature", signature);
      toast.success("Trade placed", { id: loadingToast });
      setBetAmount("");
    } catch (error) {
      console.log("this is error", error);
      console.log("this is shortx error", shortxError);
      
      // More verbose error logging
      if (error instanceof Error) {
        console.log("Error name:", error.name);
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
      }
      
      if (shortxError) {
        toast.error(shortxError.message, { id: loadingToast });
      } else {
        toast.error("Error placing trade", { id: loadingToast });
      }
      setBetAmount("");
    }
  };

  useEffect(() => {
    startSlotMachine();
  }, []);

  const startSlotMachine = () => {
    DUMMY_API_RESPONSE.forEach((result, index) => {
      // Spin each reel with a delay
      setTimeout(() => {
        animateReelToIcon(reelAnimations[index], result);
      }, index * 500);
    });
  };

  const animateReelToIcon = (animatedValue: Animated.Value, result: string) => {
    const indexInLoop = REEL_ITEMS.findIndex((item) => item === result);
    const totalSpins = 3;
    const finalPosition =
      (REEL_ITEMS.length * totalSpins + indexInLoop) * REEL_HEIGHT;

    Animated.timing(animatedValue, {
      toValue: finalPosition,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  const renderReel = (animatedValue: Animated.Value, key: number) => (
    <View className="flex items-center" key={key}>
      {/* Header label */}
      <Text className="text-white text-sm font-better-regular mb-2">
        Model {key + 1}
      </Text>

      {/* Reel container */}
      <View className="w-[100px] h-[100px] overflow-hidden mx-[5px] border border-white/70 bg-white/60 rounded-lg">
        <Animated.View
          style={{
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, REEL_HEIGHT * REEL_ITEMS.length * 5],
                  outputRange: [0, -REEL_HEIGHT * REEL_ITEMS.length * 5],
                }),
              },
            ],
          }}
        >
          {Array(5)
            .fill(null)
            .map((_, loopIndex) =>
              REEL_ITEMS.map((icon, iconIndex) => (
                <View
                  key={`${loopIndex}-${iconIndex}`}
                  className="h-[100px] justify-center items-center"
                >
                  <Text className="text-[48px] text-center">
                    {icons[icon as keyof typeof icons]}
                  </Text>
                </View>
              ))
            )}
        </Animated.View>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <ScrollView className="pt-5">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center justify-center mb-6 py-3 rounded-full border border-white/70 w-fit px-4 max-w-[100px]"
        >
          <Text className="text-white text-lg font-bold">Back</Text>
        </TouchableOpacity>

        {loadingMarket && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg">Loading...</Text>
          </View>
        )}

        {shortxError && (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-red-500 text-lg font-better-bold mb-2">
              Error
            </Text>
            <Text className="text-white text-center">
              {shortxError.message}
            </Text>
          </View>
        )}

        {!loadingMarket && !shortxError && !selectedMarket && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg">No market found.</Text>
          </View>
        )}

        {!loadingMarket && !shortxError && selectedMarket && (
          <>
            {/* Market Question, Start/End Time, and Volume */}
            <View className="bg-white/70 rounded-2xl p-4 mb-8 shadow-lg border border-white">
              <View className="mb-4 flex-1">
                <Text className="text-sm font-better-regular self-end text-gray-700">
                  {formatDate(selectedMarket.marketStart)}
                </Text>
              </View>

              <Text className="font-better-regular text-black/70 text-xl mb-4">
                {selectedMarket.question}
              </Text>

              <View className="mb-4 flex-col gap-2">
                <Text className="text-gray-700 text-sm font-better-light">
                  Resolution Time:{" "}
                  <Text className="text-gray-900 font-better-regular">
                    {formatMarketDuration(
                      selectedMarket.marketStart,
                      selectedMarket.marketEnd
                    )}
                  </Text>
                </Text>

                <Text className="text-gray-700 text-sm font-better-light">
                  Betting Ends:{" "}
                  <Text className="text-gray-900 font-better-regular">
                    {formatDate(selectedMarket.marketEnd)}
                  </Text>
                </Text>
                <Text className="text-gray-700 text-sm font-better-light">
                  Volume:{" "}
                  <Text className="text-gray-900 font-better-regular">
                    $
                    {(
                      parseFloat(selectedMarket.volume || "0") /
                      10 ** 6
                    ).toFixed(1)}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Slot Machine */}
            <View className="flex-1 justify-center items-center border border-white/70 rounded-[10px] p-2.5">
              <View className="flex-row justify-center items-center gap-2 overflow-hidden rounded-[10px] w-full p-[10px]">
                {reelAnimations.map((anim, i) => renderReel(anim, i))}
              </View>
            </View>

            {/* Aggregated outcome*/}
            <View className="flex-1 justify-center items-center border bg-accent-light rounded-[10px] p-2.5 mt-4">
              <Text className=" text-lg font-better-regular">
                Aggregated Chance: 50%
              </Text>
            </View>

            {/* Dynamic Input for amount */}
            <DynamicTextInput
              value={betAmount}
              onChangeText={setBetAmount}
              placeholder="0"
            />

            {/*Buttons for YES and NO bets */}
            <View className="flex-row justify-center items-center gap-2 overflow-hidden rounded-[10px] w-full mt-5">
              <TouchableOpacity
                onPress={async () => {
                  await handleBet("yes");
                }}
                className="flex-1 justify-center items-center border border-black bg-emerald-400/70 rounded-[10px] p-2.5"
              >
                <Text className="text-lg font-better-regular">YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await handleBet("no");
                }}
                className="flex-1 justify-center items-center border border-black bg-pink-400/70 rounded-[10px] p-2.5"
              >
                <Text className="text-lg font-better-regular">NO</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

export default SlotMachineScreen;
