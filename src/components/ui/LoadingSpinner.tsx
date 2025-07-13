import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    fadeAnimation.start();

    return () => fadeAnimation.stop();
  }, [fadeAnim]);

  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-white text-3xl font-better-bold mb-8">
        betterWeather
      </Text>
      
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text className="text-white text-lg font-better-regular text-center">
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
