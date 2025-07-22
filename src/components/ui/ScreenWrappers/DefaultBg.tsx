// src/components/ui/ScreenWrapper.tsx
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherBackgroundSkia } from "../WeatherBackgroundSkia";
import theme from "../../../theme";
import { useWeather } from "./WeatherBg";

export function DefaultBg({ children }: { children: React.ReactNode }) {
  const { weatherType, isLoading } = useWeather();
  const insets = useSafeAreaInsets();
  // Use a dark gradient background as the default/fallback
  const backgroundType = (!weatherType || isLoading) ? "dark_gradient" : weatherType;
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000000', 

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
        paddingHorizontal: 0,
      }}>
        {children}
      </View>
    </View>
  );
}
