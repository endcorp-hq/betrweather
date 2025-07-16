// src/components/ui/ScreenWrapper.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { WeatherBackgroundSkia } from "./WeatherBackgroundSkia";
import theme from "../../theme";
import { useAPI } from "../../utils/useAPI";
import { useLocation } from "../../utils/useLocation";

export type WeatherType = "sunny" | "cloudy" | "rainy" | "stormy" | "snowy" | "foggy" | "windy" | "partly_cloudy" | null;

interface WeatherContextValue {
  weatherType: WeatherType;
  isLoading: boolean;
  error: any;
}

const WeatherContext = createContext<WeatherContextValue | undefined>(undefined);

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    return {
      weatherType: null,
      isLoading: true,
      error: null,
    };
  }
  return ctx;
}

function mapApiToWeatherType(apiData: any): WeatherType {
  if (!apiData) return null;
  console.log('Weather API data:', apiData); // Debug log
  let iconCode = apiData.weatherCondition?.iconCode;
  let icon = apiData.weatherCondition?.icon;
  let iconBaseUri = apiData.weatherCondition?.iconBaseUri;
  let type = apiData.weatherCondition?.type;
  let desc = apiData.weatherCondition?.description?.text;
  iconCode = iconCode ? String(iconCode).toLowerCase() : "";
  icon = icon ? String(icon).toLowerCase() : "";
  iconBaseUri = iconBaseUri ? String(iconBaseUri).toLowerCase() : "";
  type = type ? String(type).toLowerCase() : "";
  desc = desc ? String(desc).toLowerCase() : "";
  const all = `${iconCode} ${icon} ${iconBaseUri} ${type} ${desc}`;
  let result: WeatherType = null;
  if (all.includes("cloud")) result = "cloudy";
  else if (all.includes("rain")) result = "rainy";
  else if (all.includes("storm")) result = "stormy";
  else if (all.includes("snow")) result = "snowy";
  else if (all.includes("fog")) result = "foggy";
  else if (all.includes("wind")) result = "windy";
  else if (all.includes("partly")) result = "partly_cloudy";
  else if (all.includes("sun") || all.includes("clear")) result = "sunny";
  else result = null;
  console.log('Mapped weatherType:', result); // Debug log
  return result;
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const { latitude, longitude, isLoading: loadingLocation, error: errorLocation } = useLocation();
  const [weatherType, setWeatherType] = useState<WeatherType>(null);
  const hasValidLocation = latitude && longitude && !loadingLocation && !errorLocation;
  const WEATHER_URL = hasValidLocation
    ? `https://weather.googleapis.com/v1/currentConditions:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;
  const { data, isLoading, error } = useAPI<any>(WEATHER_URL || "", {}, { enabled: !!WEATHER_URL });

  useEffect(() => {
    if (!data) return;
    setWeatherType(mapApiToWeatherType(data));
  }, [data]);

  return (
    <WeatherContext.Provider value={{ weatherType, isLoading: loadingLocation || isLoading, error: errorLocation || error }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const { weatherType, isLoading } = useWeather();
  // Use a dark gradient background as the default/fallback
  const backgroundType = (!weatherType || isLoading) ? "dark_gradient" : weatherType;
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: 10 }}>
      <WeatherBackgroundSkia theme={theme} condition={backgroundType} />
      {children}
    </View>
  );
}
