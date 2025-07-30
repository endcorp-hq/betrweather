import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import { RefractiveBgCard } from "../ui/RefractiveBgCard";
import {
  getWeatherXMIcon,
  mapWXMV1IconToWeatherType,
} from "../../utils/weatherDataProcessor";
import {
  calculateLocalTimeForCoordinates,
  getLocalTimeForTimezone,
} from "../../utils/timezoneUtils";

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
  searchedLocation?: {
    name: string;
    lat: number;
    lon: number;
  } | null;
  currentLocationCoords?: {
    lat: number;
    lon: number;
  } | null;
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
  searchedLocation,
  currentLocationCoords,
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Get time for current or searched location
  useEffect(() => {
    const fetchTime = async () => {
      try {
        let timezoneInfo = null;

        if (searchedLocation) {
          // Get timezone for searched location
          timezoneInfo = await calculateLocalTimeForCoordinates(
            searchedLocation.lat,
            searchedLocation.lon
          );
        } else if (currentLocationCoords) {
          // Get timezone for current location
          timezoneInfo = await calculateLocalTimeForCoordinates(
            currentLocationCoords.lat,
            currentLocationCoords.lon
          );
        } else {
          // Fallback to device timezone
          const deviceTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
          const { time, date } = getLocalTimeForTimezone(deviceTimezone);
          setCurrentTime(time);
          setCurrentDate(date);
          return;
        }

        if (timezoneInfo) {
          setCurrentTime(timezoneInfo.time);
          setCurrentDate(timezoneInfo.date);
        } else {
          // Fallback to device timezone
          const deviceTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
          const { time, date } = getLocalTimeForTimezone(deviceTimezone);
          setCurrentTime(time);
          setCurrentDate(date);
        }
      } catch (error) {
        console.error("Error fetching time:", error);
        // Fallback to device timezone
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { time, date } = getLocalTimeForTimezone(deviceTimezone);
        setCurrentTime(time);
        setCurrentDate(date);
      }
    };

    fetchTime();

    // Update time every minute
    const interval = setInterval(() => {
      fetchTime();
    }, 60000);

    return () => clearInterval(interval);
  }, [searchedLocation, currentLocationCoords]);

  return (
    <View
      className="items-center justify-center"
      style={{ minHeight: 300, marginTop: 20 }}
    >
      <RefractiveBgCard
        style={{
          width: 320,
          height: 340,
          borderRadius: 24,
        }}
        borderRadius={24}
      >
        {/* Location */}
        <Text className="text-white text-lg font-better-medium mb-2 text-center">
          {city}
        </Text>

        <View className="w-full flex justify-center items-center">
          <Text style={{ color: "white", fontFamily: "Poppins-Regular", fontSize: 16 }}>
            {currentTime}
          </Text>
          <Text style={{ color: "white", fontFamily: "Poppins-Regular", fontSize: 14, opacity: 0.8 }}>
            {currentDate}
          </Text>
        </View>

        {/* Main Temperature */}
        <Text
          textBreakStrategy={"simple"}
          className="text-white text-[80px] font-better-light text-center mb-[-10px]"
        >
          {temp}
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
                {high}
              </Text>{" "}
              - Low:{" "}
              <Text className="text-white text-lg font-better-medium">
                {low}
              </Text>
            </Text>

            {/* Feels Like */}
            <Text className="text-white text-base font-better-light">
              Feels like{" "}
              <Text className="text-white text-lg font-better-medium">
                {feelsLike}
              </Text>
            </Text>
          </View>

          {/* Weather Icon */}
          <View className="ml-4">
            {isUsingLocalStation ? (
              <Text className="text-4xl">
                {getWeatherXMIcon(
                  mapWXMV1IconToWeatherType(
                    mmForecastData?.icon ?? "",
                    mmForecastData?.timestamp
                  )
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
