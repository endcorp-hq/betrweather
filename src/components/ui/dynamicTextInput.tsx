import { TextInput, View, Text } from "react-native";
import { USDC_ICON } from "./svg/usdc";
import { useState, useEffect, useRef } from "react";

export const DynamicTextInput = ({
    value,
    onChangeText,
    placeholder,
  }: {
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
      if (text === "" || regex.test(text)) {
        onChangeText(text);
      }
    };
  
    return (
      <View className="flex-1 justify-center font-better-regular items-center border border-white/70 bg-white/70 rounded-[10px] p-2.5 mt-4 h-[150px] relative">
        {/* USDC label in top right */}
        <View className="absolute top-2 right-2 z-10 flex-row gap-1 items-center">
          <Text className="text-gray-600 text-xs font-better-regular">
            <USDC_ICON width={16} height={16} />
          </Text>
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
            textAlign: "center",
            textAlignVertical: "center",
          }}
          cursorColor="transparent"
          keyboardType="decimal-pad" // Changed to decimal-pad for better UX
          multiline={false}
          maxLength={15} // Prevent extremely long inputs
        />
      </View>
    );
  };