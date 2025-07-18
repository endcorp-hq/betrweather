import { View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useShortx } from "../solana/useContract";
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
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

const MarketDetailScreen = () => {
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
  const [showResolutionInfo, setShowResolutionInfo] = useState(false);

  useEffect(() => {
    async function fetchMarket() {
      await getMarketById(id);
    }
    if (id) fetchMarket();
  }, [id]);

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
        "http://192.168.1.16:8001/nft/create",
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

  // Helper function to determine market status
  const getMarketStatus = () => {
    if (!selectedMarket) return null;
    
    const now = Date.now();
    const marketStart = Number(selectedMarket.marketStart) * 1000;
    const marketEnd = Number(selectedMarket.marketEnd) * 1000;
    
    // If market has winning direction, it's resolved
    if (selectedMarket.winningDirection !== null && selectedMarket.winningDirection !== undefined) {
      return "resolved";
    }
    
    // If betting period has ended but market is still active
    if (now >= marketStart && now < marketEnd) {
      return "betting_ended";
    }
    
    // If market has ended but not resolved
    if (now >= marketEnd) {
      return "market_ended";
    }
    
    // Betting period is active
    return "betting";
  };

  const marketStatus = getMarketStatus();

  return (
    <ScreenWrapper>
      <ScrollView className="pt-5">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center justify-center mb-6 py-3 rounded-full border border-white/70 w-fit px-4 max-w-[100px]"
        >
          <Text className="text-white text-lg font-better-bold">Back</Text>
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
            <View className="bg-white/70 rounded-2xl p-4 mb-6 shadow-lg border border-white">
              <View className="mb-4 flex-1">
                <Text className="text-sm font-better-regular self-end text-black/70">
                  {formatDate(selectedMarket.marketStart)}
                </Text>
              </View>

              <Text className="font-better-regular text-black/70 text-xl mb-4">
                {selectedMarket.question}
              </Text>

              <View className="mb-4 flex-col gap-2">
                <Text className="text-black/70 text-sm font-better-light">
                  Resolution Time:{" "}
                  <Text className="text-black font-better-regular">
                    {formatMarketDuration(
                      selectedMarket.marketStart,
                      selectedMarket.marketEnd
                    )}
                  </Text>
                </Text>

                <Text className="text-black/70 text-sm font-better-light">
                  Betting Ends:{" "}
                  <Text className="text-black font-better-regular">
                    {formatDate(selectedMarket.marketEnd)}
                  </Text>
                </Text>
                <Text className="text-black/70 text-sm font-better-light">
                  Volume:{" "}
                  <Text className="text-black font-better-regular">
                    $
                    {(
                      parseFloat(selectedMarket.volume || "0") /
                      10 ** 6
                    ).toFixed(1)}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Resolution Mechanism Dropdown - Now First */}
            <View className="bg-white/70 rounded-2xl p-4 mb-6 shadow-lg border border-white">
              <TouchableOpacity
                onPress={() => setShowResolutionInfo(!showResolutionInfo)}
                className="flex-row justify-between items-center"
              >
                <Text className="text-sm text-gray-500 font-better-semi-bold">
                  Resolution Mechanism
                </Text>
                <Text className="text-2xl">
                  {showResolutionInfo ? "▼" : "▶"}
                </Text>
              </TouchableOpacity>
              
              {showResolutionInfo && (
                <View className="mt-4">
                  <Text className="font-better-regular text-black/70 text-xl mb-8">
                    Our resolution engine uses WeatherXM's network of weather stations to determine market outcomes:
                  </Text>
                  
                  <View className="flex flex-col gap-y-5">
                    <Text className="text-lg text-black/80 font-better-light">
                      <Text className="font-better-semi-bold">1.</Text> We define geographic bounds for each market area
                    </Text>
                    <Text className="text-lg text-black/80 font-better-light">
                      <Text className="font-better-semi-bold">2.</Text> Daily discovery of WeatherXM stations within these bounds
                    </Text>
                    <Text className="text-lg text-black/80 font-better-light">
                      <Text className="font-better-semi-bold">3.</Text> Filter for high-quality stations (QoD &gt; 0.8)
                    </Text>
                    <Text className="text-lg text-black/80 font-better-light">
                      <Text className="font-better-semi-bold">4.</Text> Select the best station per grid cell (highest QoD, then elevation)
                    </Text>
                    <Text className="text-lg text-black/80 font-better-light">
                      <Text className="font-better-semi-bold">5.</Text> Every 10 minutes, check active markets and resolve based on precipitation data
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Market Status Display - Now Second */}
            <View className="bg-white/70 rounded-2xl p-4 mb-6 shadow-lg border border-white">
              <Text className="text-sm font-better-semi-bold mb-4 text-gray-500">
                Market Status
              </Text>
              
              {marketStatus === "resolved" && (
                <View className="items-center">
                  <Text className={`text-lg font-better-regular text-center mb-4 text-white ${selectedMarket.winningDirection === WinningDirection.YES ? "bg-emerald-400/70" : "bg-pink-600/70"} rounded-[10px] p-2.5 w-fit`}>
                    Market resolved to {selectedMarket.winningDirection === WinningDirection.YES ? "YES" : "NO"}
                  </Text>
                  
                  {/* Resolution Info Box */}
                  <View className=" rounded-lg p-4 w-full border border-gray-200">
                    <Text className="text-lg font-better-semibold text-black mb-3">
                      Resolution Details
                    </Text>
                    <View className="space-y-2">
                      <Text className="text-sm text-black/80 font-better-light">
                        Cell ID: <Text className="font-better-regular text-black">LON-001</Text>
                      </Text>
                      <Text className="text-sm text-black/80 font-better-light">
                        Station ID: <Text className="font-better-regular text-black">WXM-12345</Text>
                      </Text>
                      <Text className="text-sm text-black/80 font-better-light">
                        Precipitation Rate: <Text className="font-better-regular text-black">0.0 mm/h</Text>
                      </Text>
                      <Text className="text-sm text-black/80 font-better-light">
                        Station Health: <Text className="font-better-regular text-black">Excellent (QoD: 0.95)</Text>
                      </Text>
                      {/* <Text className="text-sm text-black/80 font-better-light">
                        Location: <Text className="font-better-regular text-black">51.5074°N, -0.1278°W</Text>
                      </Text> */}
                    </View>
                  </View>
                </View>
              )}
              
              {marketStatus === "betting_ended" && (
                <Text className="text-lg font-better-regular text-center text-orange-600">
                  Betting ended, market in progress
                </Text>
              )}
              
              {marketStatus === "market_ended" && (
                <Text className="text-lg font-better-regular text-center text-red-600">
                  Market ended, resolution pending
                </Text>
              )}
              
              {marketStatus === "betting" && (
                <Text className="text-lg font-better-regular text-center text-green-600">
                  Betting period active
                </Text>
              )}
            </View>

            {/* Betting Interface - Only show during betting period */}
            {marketStatus === "betting" && (
              <>
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
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

export default MarketDetailScreen;
