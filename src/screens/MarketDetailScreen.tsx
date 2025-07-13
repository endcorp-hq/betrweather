import { View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useShortx } from "../solana/useContract";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { formatMarketDuration } from "../components/market/format-market-duration";
import { Market } from "shortx-sdk";



// Helper to format date for display
function formatDate(ts: string | number | undefined) {
  if (!ts) return "N/A";
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
}



const icons = {
  rain: "🌧️",
  sun: "☀️",
};

const REEL_HEIGHT = 100;
const REEL_ITEMS = ["rain", "sun", "rain", "sun", "rain"]; // looped pattern

const DUMMY_API_RESPONSE = ["rain", "sun", "rain"];

const DynamicTextInput = ({ value, onChangeText, placeholder }: { 
  value: string; 
  onChangeText: (text: string) => void; 
  placeholder: string;
}) => {
  const [fontSize, setFontSize] = useState(96); // Start with large font size
  const inputRef = useRef<TextInput>(null);

  // Calculate font size based on text length
  const calculateFontSize = (text: string) => {
    const baseSize = 96;
    const minSize = 24;
    const maxLength = 10; // Maximum characters before font starts shrinking
    
    if (text.length <= 1) return baseSize;
    if (text.length >= maxLength) return minSize;
    
    // Linear decrease in font size
    const decreasePerChar = (baseSize - minSize) / (maxLength - 1);
    return Math.max(minSize, baseSize - (text.length - 1) * decreasePerChar);
  };

  useEffect(() => {
    const newFontSize = calculateFontSize(value);
    setFontSize(newFontSize);
  }, [value]);

  // Handle text input with validation
  const handleTextChange = (text: string) => {
    // Only allow numbers and one decimal point
    const regex = /^\d*\.?\d*$/;
    if (text === '' || regex.test(text)) {
      onChangeText(text);
    }
  };

  return (
    <View className="flex-1 justify-center font-better-regular items-center border border-white/70 bg-white/70 rounded-[10px] p-2.5 mt-4 h-[150px] relative">
      {/* USDC label in top right */}
      <View className="absolute top-2 right-2 z-10">
        <Text className="text-gray-600 text-xs font-better-regular">USDC</Text>
      </View>
      
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor="#6b707d"
        className="text-center w-full h-full"
        style={{
          fontSize: fontSize, // Adjust to match your font
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        cursorColor="transparent"
        keyboardType="decimal-pad" // Changed to decimal-pad for better UX
        multiline={false}
        maxLength={15} // Prevent extremely long inputs
      />
    </View>
  );
};

const SlotMachineScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { id } = route.params || {};
  const {
    getMarketById,
    selectedMarket,
    loadingMarket,
    error: errorMarket,
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
    <View className="w-[100px] h-[100px] overflow-hidden mx-[5px] border bg-accent-light/90 rounded-lg" key={key}>
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
        
        {errorMarket && (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-red-500 text-lg font-better-bold mb-2">Error</Text>
            <Text className="text-white text-center">{errorMarket.message}</Text>
          </View>
        )}
        
        {!loadingMarket && !errorMarket && !selectedMarket && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg">No market found.</Text>
          </View>
        )}
        
        {!loadingMarket && !errorMarket && selectedMarket && (
          <>
            {/* Market Question, Start/End Time, and Volume */}
            <View className="bg-white/70 rounded-2xl p-6 mb-8 shadow-lg">
              <View className="mb-4 flex-1">
                <Text className="text-sm font-better-regular self-end text-gray-700">
                  {formatDate(selectedMarket.marketStart)}
                </Text>
              </View>
              
              <Text className="font-better-regular text-black/70 text-2xl mb-4">
                {selectedMarket.question}
              </Text>
              
              <View className="mb-4 flex-col gap-2">
                <Text className="text-gray-700 text-sm font-better-light">
                  Resolution Time:{" "}
                  <Text className="text-gray-900 font-better-regular">
                    {formatMarketDuration(selectedMarket.marketStart, selectedMarket.marketEnd)}
                  </Text>
                </Text>
                
                <Text className="text-gray-700 text-sm font-better-light">
                  Betting Ends:{" "}
                  <Text className="text-gray-900 font-better-regular">
                    {formatDate(selectedMarket.marketEnd)}
                  </Text>
                </Text>
              </View>
              
              <Text className="text-gray-700 text-sm font-better-light">
                Volume:{" "}
                <Text className="text-gray-900 font-better-regular">
                  ${(parseFloat(selectedMarket.volume || "0")/10**6).toFixed(1)}
                </Text>
              </Text>
            </View>

            {/* Slot Machine */}
            <View className="flex-1 justify-center items-center border border-white/70 rounded-[10px] p-2.5">
              <View className="flex-row justify-center items-center gap-2 overflow-hidden rounded-[10px] w-full p-[10px]">
                {reelAnimations.map((anim, i) => renderReel(anim, i))}
              </View>
            </View>

            {/* Aggregated outcome*/}
            <View className="flex-1 justify-center items-center border bg-accent-light rounded-[10px] p-2.5 mt-4">
             <Text className=" text-lg font-better-regular">Aggregated Chance: 50%</Text>
            </View>

            {/* Dynamic Input for amount */}
            <DynamicTextInput
              value={betAmount}
              onChangeText={setBetAmount}
              placeholder="0"
            />

            {/*Buttons for YES and NO bets */}
            <View className="flex-row justify-center items-center gap-2 overflow-hidden rounded-[10px] w-full mt-5">
                <TouchableOpacity className="flex-1 justify-center items-center border border-black bg-emerald-400/70 rounded-[10px] p-2.5">
                  <Text className="text-lg font-better-regular">YES</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 justify-center items-center border border-black bg-pink-400/70 rounded-[10px] p-2.5">
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
