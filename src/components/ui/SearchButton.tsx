import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

export function SearchButton() {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // TODO: Add search functionality
    console.log('Search button pressed');
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30">
          <Text className="text-white text-xl">
            <MaterialCommunityIcon name="magnify" size={24} color="white" />
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
} 