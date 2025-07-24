import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated } from "react-native";
import { RefractiveBgCard } from "./RefractiveBgCard";
import AutoScrolling from "react-native-auto-scrolling";

interface HourlyForecastItemProps {
  time: string;
  temperature: string;
  description: string;
  icon?: string;
  iconUri?: string;
  precipitation?: string;
}

export function HourlyForecastItem({
  time,
  temperature,
  description,
  icon,
  iconUri,
  precipitation,
}: HourlyForecastItemProps) {
  // Calculate if text needs scrolling based on description length
  const needsScrolling = description.length > 8;

  return (
    <RefractiveBgCard
      style={{
        width: 110,
        height: 180,
        borderRadius: 16,
        padding: 6,
      }}
      borderRadius={16}
    >
      {/* Time */}
      <Text className="text-gray-300 text-sm font-better-light text-center mb-4">
        {time}
      </Text>

      {/* Weather Icon */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: 30,
          marginBottom: 2,
        }}
      >
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-8 h-8 mb-4"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-lg">{icon || "☀️"}</Text>
        )}
      </View>

      {/* Precipitation */}
      {precipitation && (
        <Text className="text-gray-300 text-xs text-center font-better-light mb-2">
          {precipitation}
        </Text>
      )}

      {/* Auto-scrolling Description with enhanced styling */}
      <View className="mb-2">
        {needsScrolling ? (
          <AutoScrolling
            duration={6000}
            delay={2000}
            endPaddingWidth={20}
            style={{
              height: 16,
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Text 
              className="text-gray-300 text-xs font-better-light"
              style={{
                textAlign: 'center',
                lineHeight: 16,
              }}
            >
              {description}
            </Text>
          </AutoScrolling>
        ) : (
          <Text 
            className="text-gray-300 text-xs font-better-light w-full text-center"
            style={{
              lineHeight: 16,
            }}
          >
            {description}
          </Text>
        )}
      </View>

      {/* Temperature */}
      <Text className="text-white text-lg font-better-medium text-center">
        {temperature}°
      </Text>
    </RefractiveBgCard>
  );
}
