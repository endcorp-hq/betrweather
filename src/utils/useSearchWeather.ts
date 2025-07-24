import { useAPI } from "./useAPI";
import {
  WeatherAPIResponse,
  HourlyAPIResponse,
  DailyAPIResponse,
} from "../types/weather";

export const useSearchWeather = (latitude: number | null, longitude: number | null) => {
  // Only fetch data if we have valid coordinates
  const hasValidLocation = latitude && longitude;

  // Use only Google Weather API for search results
  const WEATHER_URL = hasValidLocation
    ? `https://weather.googleapis.com/v1/currentConditions:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const HOURLY_FORECAST_URL = hasValidLocation
    ? `https://weather.googleapis.com/v1/forecast/hours:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const DAILY_FORECAST_URL = hasValidLocation
    ? `https://weather.googleapis.com/v1/forecast/days:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&days=10&pageSize=10`
    : null;

  const {
    data: weather,
    isLoading: loadingWeather,
    error: errorWeather,
  } = useAPI<WeatherAPIResponse>(
    WEATHER_URL || "",
    {},
    { enabled: !!WEATHER_URL }
  );

  const { 
    data: hourlyData, 
    isLoading: loadingHourly 
  } = useAPI<HourlyAPIResponse>(
    HOURLY_FORECAST_URL || "",
    {},
    { enabled: !!HOURLY_FORECAST_URL }
  );

  const { 
    data: dailyData, 
    isLoading: loadingDaily 
  } = useAPI<DailyAPIResponse>(
    DAILY_FORECAST_URL || "",
    {},
    { enabled: !!DAILY_FORECAST_URL }
  );

  // Always use Google API for search results
  const isUsingGoogleAPI = true;
  const mmForecastData = null;
  const results = null;
  const nearestGoodStation = null;

  // Loading states
  const isLoading = 
    loadingWeather ||
    loadingHourly ||
    loadingDaily;

  // Error states
  const hasError = errorWeather;
  const errorMessage = errorWeather?.message;

  return {
    // Data - only Google API data
    mmForecastData: null, // Always null for search
    weather,
    hourlyData,
    dailyData,
    results: null, // Always null for search
    nearestGoodStation: null, // Always null for search
    
    // States
    isUsingLocalStation: false, // Always false for search
    isUsingGoogleAPI, // Always true for search
    isLoading,
    hasError,
    errorMessage,
    
    // Location
    latitude,
    longitude,
    hasValidLocation,
  };
}; 