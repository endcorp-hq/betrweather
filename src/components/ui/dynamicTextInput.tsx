import { TextInput, View, Text, StyleProp, ViewStyle } from "react-native";
import { USDC_ICON } from "./svg/usdc";
import { useState, useEffect, useRef } from "react";
import theme from '../../theme';

export const DynamicTextInput = ({
    value,
    onChangeText,
    placeholder,
    style,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    style?: StyleProp<ViewStyle>;
  }) => {
    const [fontSize, setFontSize] = useState(40);
    const [inputWidth, setInputWidth] = useState(120);
    const inputRef = useRef<TextInput>(null);
  
    const calculateFontSize = (text: string) => {
      const baseSize = 40;
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
        return Math.max(placeholderWidth + 20, 120); // Minimum 120px for placeholder visibility
      }
      const charWidth = size * 0.6;
      const totalWidth = text.length * charWidth;
      return Math.max(60, totalWidth + 20);
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
      <View
        style={[
          {
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1.5,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            minHeight: 90,
            width: '100%',
         
          },
          style
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={{
            fontSize: fontSize,
            textAlign: "center",
            textAlignVertical: "center",
            width: inputWidth,
            height: 48,
            color: "#000",
            fontWeight: '700',
            fontFamily: 'Poppins-SemiBold',
            backgroundColor: 'transparent',
            marginBottom: 0,
          }}
          keyboardType="decimal-pad"
          multiline={false}
          maxLength={15}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <USDC_ICON width={20} height={20} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16, fontWeight: '600', marginLeft: 6, fontFamily: 'Poppins-SemiBold' }}>USDC</Text>
        </View>
      </View>
    );
  };