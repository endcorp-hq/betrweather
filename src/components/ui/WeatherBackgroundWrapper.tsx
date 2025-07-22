import React from "react";
import { View, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherBackgroundSkia } from "./WeatherBackgroundSkia";
import theme from "../../theme";
import { useWeather } from "./ScreenWrappers/WeatherBg";

// Function to determine if it's day or night based on current time
function isDayTime(): boolean {
  const currentHour = new Date().getHours();
  // Consider day time from 6 AM to 8 PM
  return currentHour >= 6 && currentHour < 20;
}

// Function to get the appropriate background image based on weather and time
function getBackgroundImage(weatherType: any): any {
  const isDay = isDayTime();
  
  if (weatherType === "sunny" || weatherType === null) {
    return isDay ? require("../../../assets/weather/day-clear.png") : require("../../../assets/weather/night-clear.png");
  } else if (weatherType === "cloudy" || weatherType === "partly_cloudy") {
    return isDay ? require("../../../assets/weather/morning-cloudy.png") : require("../../../assets/weather/night-cloudy.png");
  }
  
  // For other weather types, use cloudy backgrounds as fallback
  return isDay ? require("../../../assets/weather/morning-cloudy.png") : require("../../../assets/weather/night-cloudy.png");
}

export function WeatherBackgroundWrapper({ children }: { children: React.ReactNode }) {
  const { weatherType, isLoading } = useWeather();
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