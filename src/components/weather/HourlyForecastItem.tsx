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

function HourlyForecastItemInternal({
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
        width: 60,
        height: 100,
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
      }}
    >
      {/* Time */}
      <Text className="text-gray-300 text-sm font-better-light text-center mb-1">
        {time}
      </Text>

      {/* Weather Icon */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: 18,
          marginBottom: 3,
        }}
      >
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-4 h-4"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-sm">{icon || "☀️"}</Text>
        )}
      </View>

      {/* Precipitation */}
      {precipitation && (
        <Text className="text-gray-300 text-xs text-center font-better-light mb-1">
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

export const HourlyForecastItem = React.memo(HourlyForecastItemInternal);
