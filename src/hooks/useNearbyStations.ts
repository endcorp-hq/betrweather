import { useAPI } from "./useAPI";
import { getH3Neighbors } from "../utils/h3";

interface StationObservation {
  timestamp: string;
  temperature: number;
  dew_point: number;
  humidity: number;
  precipitation_rate: number;
  precipitation_accumulated: number;
  wind_speed: number;
  wind_gust: number;
  wind_direction: number;
  uv_index: number;
  pressure: number;
  solar_irradiance: number;
  icon: string;
  created_at: string;
  precipitation_accumulated_daily: number;
}

interface StationHealth {
  timestamp: string;
  data_quality: {
    score: number;
  };
  location_quality: {
    score: number;
    reason: string;
  };
}

interface StationLocation {
  lat: number;
  lon: number;
  elevation: number;
}

interface StationWeather {
  observation: StationObservation;
  health: StationHealth;
  location: StationLocation;
}

interface Station {
  id: string;
  name: string;
  lastDayQod: number;
  lat: number;
  lon: number;
  elevation: number;
  cellId: string;
  createdAt: string;
}

interface NearbyStationsResponse {
  data: {
    station: Station;
    distance: number;
    weather: StationWeather;
  };
  message: string;
}

export const useNearbyStations = (
  h3Index: string | null,
  refreshTrigger?: number
) => {
  // Get neighboring H3 cells (step 1)
  const neighborH3Indices = h3Index ? getH3Neighbors(h3Index, 1) : [];

  const {
    data: nearbyStationsData,
    isLoading,
    error,
  } = useAPI<NearbyStationsResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/wxm/stations/closest-by-h3`,
    {
      method: "POST",
      body: JSON.stringify({
        h3Indices: neighborH3Indices,
        minQod: 0.9,
        includeWeather: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      enabled: !!h3Index && neighborH3Indices.length > 0,
      staleTime: 300000, // 5 minutes cache
      gcTime: 600000, // 10 minutes garbage collection
      refreshTrigger,
    }
  );


  // Extract the station and weather data from the response
  const station = nearbyStationsData?.data?.station;
  const weather = nearbyStationsData?.data?.weather;
  const distance = nearbyStationsData?.data?.distance;

  return {
    station,
    weather,
    distance,
    isLoading,
    error,
    hasStations: !!(station && weather),
    message: nearbyStationsData?.message,
  };
}; 