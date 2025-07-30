import React from "react";
import { View, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherBackgroundSkia } from "./WeatherBackgroundSkia";
import theme from "../../theme";
import { useWeatherData } from "../../utils/useWeatherData";

// Function to determine if it's day or night based on current time
function isDayTime(): boolean {
  const currentHour = new Date().getHours();
  // Consider day time from 6 AM to 8 PM
  return currentHour >= 6 && currentHour < 20;
}

// Function to get the appropriate background image based on weather and time
function getBackgroundImage(weatherType: any): any {
  // Extract base weather type from day/night variant (e.g., "sunny_day" -> "sunny")
  const baseWeatherType = weatherType?.includes('_') ? weatherType.split('_')[0] : weatherType;
  
  if (baseWeatherType === "sunny" || baseWeatherType === null) {
    return require("../../../assets/weather/day-clear.png");
  } else if (baseWeatherType === "cloudy" || baseWeatherType === "partly_cloudy") {
    return require("../../../assets/weather/morning-cloudy.png");
  }
  
  // For other weather types, use cloudy backgrounds as fallback
  return require("../../../assets/weather/morning-cloudy.png");
}

export function WeatherBackgroundWrapper({ children }: { children: React.ReactNode }) {
  const { weatherType, isLoading } = useWeatherData();
  const insets = useSafeAreaInsets();
  // Use a dark gradient background as the default/fallback
  const backgroundType = (!weatherType || isLoading) ? "dark_gradient" : weatherType;
  const backgroundImage = getBackgroundImage(weatherType);
  
  return (
    <ImageBackground 
      source={backgroundImage}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'transparent', 
        paddingHorizontal: 0,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }}>
        {/* Weather animations layer - between background and content */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}>
          <WeatherBackgroundSkia theme={theme} condition={backgroundType} />
        </View>
        
        {/* Content layer - above animations */}
        <View style={{
          flex: 1,
          zIndex: 2,
        }}>
          {children}
        </View>
      </View>
    </ImageBackground>
  );
} 