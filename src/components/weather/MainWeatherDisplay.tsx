import React from "react";
import { View, Text, Image } from "react-native";
import { RefractiveBgCard } from "../ui/RefractiveBgCard";
import { getWeatherXMIcon } from "../../utils/weatherDataProcessor";

interface MainWeatherDisplayProps {
  city: string;
  temp: string;
  description: string;
  high: string;
  low: string;
  feelsLike: string;
  isUsingLocalStation: boolean;
  mmForecastData: any;
  weatherIcon?: string;
}

export const MainWeatherDisplay: React.FC<MainWeatherDisplayProps> = ({
  city,
  temp,
  description,
  high,
  low,
  feelsLike,
  isUsingLocalStation,
  mmForecastData,
  weatherIcon,
}) => {
  return (
    <View
      className="items-center justify-center"
      style={{ minHeight: 300, marginTop: 20 }}
    >
      <RefractiveBgCard
        style={{
          width: 320,
          height: 300,
          borderRadius: 24,
        }}
        borderRadius={24}
      >
        {/* Location */}
        <Text className="text-white text-lg font-better-medium mb-2 text-center">
          {city}
        </Text>

        {/* Main Temperature */}
        <Text
          textBreakStrategy={"simple"}
          className="text-white text-[80px] font-better-light text-center mb-[-10px]"
        >
          {temp}°
        </Text>

        {/* Weather Description */}
        <Text className="text-white text-xl font-better-medium mb-4 text-center">
          {description}
        </Text>

        {/* High/Low Temps and Feels Like with Icon */}
        <View className="flex-row justify-between items-center w-full">
          <View className="flex-1">
            {/* High/Low Temps */}
            <Text className="text-white text-lg font-better-light mb-1">
              High:{" "}
              <Text className="text-white text-lg font-better-medium">
                {high}°
              </Text>{" "}
              - Low:{" "}
              <Text className="text-white text-lg font-better-medium">
                {low}°
              </Text>
            </Text>

            {/* Feels Like */}
            <Text className="text-white text-base font-better-light">
              Feels like{" "}
              <Text className="text-white text-lg font-better-medium">
                {feelsLike}°
              </Text>
            </Text>
          </View>

          {/* Weather Icon */}
          <View className="ml-4">
            {isUsingLocalStation ? (
              <Text className="text-5xl">
                {getWeatherXMIcon(
                  String(mmForecastData?.[0]?.hourly?.[0]?.icon ?? "")
                )}
              </Text>
            ) : weatherIcon ? (
              <Image
                source={{ uri: weatherIcon }}
                className="w-16 h-16"
                resizeMode="center"
              />
            ) : (
              <Text className="text-5xl">☀️</Text>
            )}
          </View>
        </View>
      </RefractiveBgCard>
    </View>
  );
}; 