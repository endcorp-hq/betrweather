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
    const [fontSize, setFontSize] = useState(96);
    const [inputWidth, setInputWidth] = useState(20);
    const inputRef = useRef<TextInput>(null);
  
    const calculateFontSize = (text: string) => {
      const baseSize = 96;
      const minSize = 24;
      const maxLength = 10;
  
      if (text.length <= 1) return baseSize;
      if (text.length >= maxLength) return minSize;
  
      const decreasePerChar = (baseSize - minSize) / (maxLength - 1);
      return Math.max(minSize, baseSize - (text.length - 1) * decreasePerChar);
    };

    const calculateWidth = (text: string, size: number) => {
      if (text === "") {
        // When empty, use placeholder width or minimum width
        const placeholderWidth = placeholder.length * (size * 0.6);
        return Math.max(placeholderWidth + 20, 100); // Minimum 100px for placeholder visibility
      }
      
      const charWidth = size * 0.6;
      const totalWidth = text.length * charWidth;
      
      return Math.max(20, totalWidth + 20);
    };
  
    useEffect(() => {
      const newFontSize = calculateFontSize(value);
      const newWidth = calculateWidth(value, newFontSize);
      
      setFontSize(newFontSize);
      setInputWidth(newWidth);
    }, [value, placeholder]);
  
    const handleTextChange = (text: string) => {
      const regex = /^\d*\.?\d*$/;
      if (text === "" || regex.test(text)) {
        onChangeText(text);
      }
    };
  
    return (
      <View className="flex-1 justify-center font-better-bold items-center border border-white/70 bg-white/70 rounded-[10px] p-2.5 mt-4 h-[150px] relative">
        <View className="absolute top-2 right-2 z-10 flex-row gap-1 items-center">
          <Text className="text-gray-600 text-xs font-better-regular">
            <USDC_ICON width={16} height={16} />
          </Text>
          <Text className="text-gray-600 text-xs font-better-bold">USDC</Text>
        </View>
  
        <View className="flex-1 justify-center items-center">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#6b707d"
            style={{
              fontSize: fontSize,
              textAlign: "center",
              textAlignVertical: "center",
              width: inputWidth,
              height: "100%",
              includeFontPadding: false,
            }}
            keyboardType="decimal-pad"
            multiline={false}
            maxLength={15}
          />
        </View>
      </View>
    );
  };