import { useMemo } from "react";
import { useAPI } from "./useAPI";
import { useLocation } from "./useLocation";
import weatherModelAverage from "./weatherModelAverage";
import { findNearestGoodStation } from "./weatherDataProcessor";
import {
  MMForecastResponse,
  WeatherAPIResponse,
  HourlyAPIResponse,
  DailyAPIResponse,
  LocalStationsAPIResponse,
} from "../types/weather";

const WEATHER_XM_RADIUS = 500;

export const useWeatherData = () => {
  const {
    latitude,
    longitude,
    detailedLocation,
    isLoading: loadingLocation,
    error: errorLocation,
  } = useLocation();

  // Only create URLs and fetch data if we have valid coordinates
  const hasValidLocation =
    latitude && longitude && !loadingLocation && !errorLocation;

  // Step 1: Get local stations within 5km radius
  const LOCAL_STATIONS_URL = hasValidLocation
    ? `https://pro.weatherxm.com/api/v1/stations/near?lat=${latitude}&lon=${longitude}&radius=${WEATHER_XM_RADIUS}`
    : null;

  const { data: localStationsData, isLoading: loadingLocalStations } =
    useAPI<LocalStationsAPIResponse>(LOCAL_STATIONS_URL || "", {
      headers: {
        "X-API-Key": process.env.EXPO_PUBLIC_XM_API_KEY || "",
        Accept: "application/json",
        Host: "pro.weatherxm.com",
      },
    });

  // Find nearest good station
  const nearestGoodStation = useMemo(() => {
    return findNearestGoodStation(localStationsData || null, latitude, longitude);
  }, [localStationsData, latitude, longitude]);

  // Step 2: Fetch WeatherXM forecast if we have a good station
  const MM_FORECAST_URL = nearestGoodStation?.station?.cellId
    ? `https://pro.weatherxm.com/api/v1/cells/${nearestGoodStation.station.cellId}/mm/forecast`
    : null;

  if (MM_FORECAST_URL) {
    console.log("[API] Fetching WeatherXM forecast:", MM_FORECAST_URL);
  }

  const {
    data: mmForecastData,
    isLoading: loadingMMForecast,
    error: errorMMForecast,
  } = useAPI<MMForecastResponse>(
    MM_FORECAST_URL || "",
    {
      headers: {
        "X-Api-Key": process.env.EXPO_PUBLIC_XM_API_KEY || "",
        Accept: "application/json",
        Host: "pro.weatherxm.com",
      },
    },
    { enabled: !!MM_FORECAST_URL }
  );

  //compute averages between all models
  const results = weatherModelAverage(mmForecastData);

  // Step 3: Only fetch Base (Google Weather) API data if no local station forecast available
  const shouldUseBaseAPI =
    hasValidLocation && !nearestGoodStation && !loadingLocalStations;

  const WEATHER_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/currentConditions:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const HOURLY_FORECAST_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/forecast/hours:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const DAILY_FORECAST_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/forecast/days:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&days=10&pageSize=10`
    : null;

  const {
    data: baseWeather,
    isLoading: loadingbaseWeather,
    error: errorbaseWeather,
  } = useAPI<WeatherAPIResponse>(
    WEATHER_URL || "",
    {},
    { enabled: !!WEATHER_URL }
  );

  const { data: baseHourly, isLoading: loadingbaseHourly } =
    useAPI<HourlyAPIResponse>(
      HOURLY_FORECAST_URL || "",
      {},
      { enabled: !!HOURLY_FORECAST_URL }
    );

  const { data: baseDaily, isLoading: loadingBaseDaily } =
    useAPI<DailyAPIResponse>(
      DAILY_FORECAST_URL || "",
      {},
      { enabled: !!DAILY_FORECAST_URL }
    );

  // Determine which data source to use
  const isUsingLocalStation = !!mmForecastData;
  const weather = isUsingLocalStation ? null : baseWeather;
  const hourlyData = isUsingLocalStation ? null : baseHourly;
  const dailyData = isUsingLocalStation ? null : baseDaily;

  // Loading states
  const isLoading = 
    loadingLocation ||
    loadingLocalStations ||
    loadingMMForecast ||
    loadingbaseWeather ||
    loadingbaseHourly ||
    loadingBaseDaily;

  // Error states
  const hasError = errorLocation || errorMMForecast || errorbaseWeather;
  const errorMessage = errorLocation || errorMMForecast?.message || errorbaseWeather?.message;

  return {
    // Data
    mmForecastData,
    weather,
    hourlyData,
    dailyData,
    results,
    nearestGoodStation,
    detailedLocation,
    
    // States
    isUsingLocalStation,
    isLoading,
    hasError,
    errorMessage,
    
    // Location
    latitude,
    longitude,
    hasValidLocation,
  };
}; 