import React from "react";
import { View, Text, Image } from "react-native";

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

  return (
    <View
      style={{
        width: 80,
        height: 120,
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
      }}
    >
      {/* Time */}
      <Text className="text-gray-300 text-sm font-better-light text-center mb-2">
        {time}
      </Text>

      {/* Weather Icon */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: 20,
          marginBottom: 4,
        }}
      >
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-5 h-5"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-base">{icon || "☀️"}</Text>
        )}
      </View>

      {/* Precipitation */}
      {precipitation && (
        <Text className="text-gray-300 text-xs text-center font-better-light mb-2">
          {precipitation}
      </Text>
      )}

      {/* Temperature */}
      <Text className="text-white text-lg font-better-medium text-center">
        {temperature}°
      </Text>
    </View>
  );
}
