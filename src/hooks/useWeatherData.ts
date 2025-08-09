import { useAPI } from "./useAPI";

import { getH3Index } from "../utils/h3";
import {
  DailyForecastResponse,
  HourlyForecastResponse,
  WeatherXMWXMv1Response,
} from "src/types/wxm-types";
import {
  parseCurrentWeatherData,
  parseDailyForecastData,
  parseHourlyForecastData,
} from "src/utils/weatherUtils";

export type WeatherType =
  | "sunny_day"
  | "sunny_night"
  | "cloudy_day"
  | "cloudy_night"
  | "rainy_day"
  | "rainy_night"
  | "stormy_day"
  | "stormy_night"
  | "snowy_day"
  | "snowy_night"
  | "foggy_day"
  | "foggy_night"
  | "windy_day"
  | "windy_night"
  | "partly_cloudy_day"
  | "partly_cloudy_night"
  | null;

// Helper function to determine if it's day or night based on timestamp
export const isDayTime = (timestamp: string | Date, isLocalTime?: boolean): boolean => {
  if (isLocalTime) {
    const time = timestamp as string;
    const isDay = parseFloat(time.split(":")[0]) > 6 && parseFloat(time.split(":")[0]) < 18;
    return isDay;
  }
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const hour = date.getHours();
  // Consider day time from 6 AM to 6 PM (6:00 - 18:00)
  return hour >= 6 && hour < 18;
};

// Helper function to get time of day suffix
export const getTimeOfDaySuffix = (
  timestamp: string | Date,
  isLocalTime?: boolean
): "_day" | "_night" => {
  return isDayTime(timestamp, isLocalTime) ? "_day" : "_night";
};

export function useWeatherData(
  latitude: number,
  longitude: number,
  timeZoneId: string,
  refreshTrigger?: number
) {
  const hasValidLocation = latitude && longitude;
  let userH3Index: string | null = null;
  if (hasValidLocation) {
    userH3Index = getH3Index(latitude, longitude);
  }

  // Dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sixDaysFromNow = new Date(today);
  sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const todayFormatted = formatDate(today);
  const tomorrowFormatted = formatDate(tomorrow);
  const sixDaysFormatted = formatDate(sixDaysFromNow);

  // --- 1. Current Weather ---
  const {
    data: currentWeatherResp,
    isLoading: loadingCurrentWeather,
    error: errorCurrentWeather,
  } = useAPI<WeatherXMWXMv1Response>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/weather/current-conditions`,
    {
      method: "POST",
      body: JSON.stringify({
        h3Indices: userH3Index ? [userH3Index] : [],
        minQod: 0.9,
        from: todayFormatted,
        to: tomorrowFormatted,
        latitude,
        longitude,
      }),
      headers: { "Content-Type": "application/json" },
    },
    {
      enabled: !!hasValidLocation && !!userH3Index,
      refreshTrigger,
    }
  );

  // --- 2. Hourly Forecast ---
  const {
    data: hourlyForecastResp,
    isLoading: loadingHourlyForecast,
    error: errorHourlyForecast,
  } = useAPI<HourlyForecastResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/weather/hourly-forecast`,
    {
      method: "POST",
      body: JSON.stringify({
        cellId: userH3Index,
        from: todayFormatted,
        to: tomorrowFormatted,
        latitude,
        longitude,
      }),
      headers: { "Content-Type": "application/json" },
    },
    {
      enabled: !!hasValidLocation && !!userH3Index,
      refreshTrigger,
    }
  );

  // --- 3. Daily Forecast ---
  const {
    data: dailyForecastResp,
    isLoading: loadingDailyForecast,
    error: errorDailyForecast,
  } = useAPI<DailyForecastResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/weather/daily-forecast`,
    {
      method: "POST",
      body: JSON.stringify({
        cellId: userH3Index,
        from: todayFormatted,
        to: sixDaysFormatted,
        latitude,
        longitude,
      }),
      headers: { "Content-Type": "application/json" },
    },
    {
      enabled: !!hasValidLocation && !!userH3Index,
      refreshTrigger,
    }
  );

  // --- Unwrap and Fallback Logic ---
  // Current Weather
  const currentWeatherData = currentWeatherResp?.data?.data ?? null;
  const currentWeatherSource = currentWeatherResp?.data?.source ?? null;

  let parsedCurrentWeatherData = null;
  if (currentWeatherData && currentWeatherSource) {
    parsedCurrentWeatherData = parseCurrentWeatherData(
      currentWeatherData,
      currentWeatherSource as string,
      timeZoneId
    );
  }

  // Hourly Forecast
  const hourlyForecastData = hourlyForecastResp?.data?.data ?? null;
  const hourlyForecastSource = hourlyForecastResp?.data?.source ?? null;

  let parsedHourlyForecastData = null;
  if (hourlyForecastData && hourlyForecastSource) {
    parsedHourlyForecastData = parseHourlyForecastData(
      hourlyForecastData,
      hourlyForecastSource as string,
      timeZoneId
    );
  }

  // Daily Forecast
  const dailyForecastData = dailyForecastResp?.data?.data ?? null;
  const dailyForecastSource = dailyForecastResp?.data?.source ?? null;

  let parsedDailyForecastData = null;
  if (dailyForecastData && dailyForecastSource) {
    parsedDailyForecastData = parseDailyForecastData(
      dailyForecastData,
      dailyForecastSource as string
    );
  }

  const highTemp = parsedDailyForecastData?.[0]?.highTemp ?? null;
  const lowTemp = parsedDailyForecastData?.[0]?.lowTemp ?? null;

  if (parsedCurrentWeatherData) {
    parsedCurrentWeatherData = {
      ...parsedCurrentWeatherData,
      high: highTemp,
      low: lowTemp,
    };
  }

  // Loading and error states
  const isLoading =
    loadingCurrentWeather || loadingHourlyForecast || loadingDailyForecast;

  const hasError =
    errorCurrentWeather || errorHourlyForecast || errorDailyForecast;

  const errorMessage =
    errorCurrentWeather?.message ||
    errorHourlyForecast?.message ||
    errorDailyForecast?.message ||
    "Unable to fetch weather data from any source";

  return {
    // Data
    currentWeather: parsedCurrentWeatherData,
    currentWeatherSource,
    hourlyForecast: parsedHourlyForecastData,
    hourlyForecastSource,
    dailyForecast: parsedDailyForecastData,
    dailyForecastSource,

    // States
    isLoading,
    hasError,
    errorMessage,

    // Location
    latitude,
    longitude,
    hasValidLocation,
    userH3Index,
  };
}
