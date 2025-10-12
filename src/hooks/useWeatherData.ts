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

export function useWeatherData(
  latitude: number,
  longitude: number,
  timeZoneId: string,
  refreshTrigger?: number
) {
  const hasValidLocation = latitude && longitude;
  let userH3Index: string | null = null;
  if (hasValidLocation) {
    userH3Index = getH3Index(latitude, longitude) ?? null;
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
      enabled: !!hasValidLocation,
      refreshTrigger,
    }
  );

  // --- 2. Hourly Forecast ---
  const hourlyBody: Record<string, unknown> = {
    from: todayFormatted,
    to: tomorrowFormatted,
    latitude,
    longitude,
  };
  if (userH3Index) hourlyBody.cellId = userH3Index;

  const {
    data: hourlyForecastResp,
    isLoading: loadingHourlyForecast,
    error: errorHourlyForecast,
  } = useAPI<HourlyForecastResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/weather/hourly-forecast`,
    {
      method: "POST",
      body: JSON.stringify(hourlyBody),
      headers: { "Content-Type": "application/json" },
    },
    {
      enabled: !!hasValidLocation,
      refreshTrigger,
    }
  );

  // --- 3. Daily Forecast ---
  const dailyBody: Record<string, unknown> = {
    from: todayFormatted,
    to: sixDaysFormatted,
    latitude,
    longitude,
  };
  if (userH3Index) dailyBody.cellId = userH3Index;

  const {
    data: dailyForecastResp,
    isLoading: loadingDailyForecast,
    error: errorDailyForecast,
  } = useAPI<DailyForecastResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/weather/daily-forecast`,
    {
      method: "POST",
      body: JSON.stringify(dailyBody),
      headers: { "Content-Type": "application/json" },
    },
    {
      enabled: !!hasValidLocation,
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
  const hourlyForecastSource = (hourlyForecastResp?.data?.source as string | null) ?? null;
  const resolvedHourlySource = hourlyForecastSource || 'google';

  let parsedHourlyForecastData = null;
  if (hourlyForecastData) {
    parsedHourlyForecastData = parseHourlyForecastData(
      hourlyForecastData,
      resolvedHourlySource,
      timeZoneId
    );
  }

  // Daily Forecast
  const dailyForecastData = dailyForecastResp?.data?.data ?? null;
  const dailyForecastSource = (dailyForecastResp?.data?.source as string | null) ?? null;
  const resolvedDailySource = dailyForecastSource || 'google';

  let parsedDailyForecastData = null;
  if (dailyForecastData) {
    parsedDailyForecastData = parseDailyForecastData(
      dailyForecastData,
      resolvedDailySource
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
