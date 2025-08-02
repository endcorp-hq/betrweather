import { useAPI } from "../hooks/useAPI";
import {
  WeatherAPIResponse,
  HourlyAPIResponse,
  DailyAPIResponse,
  WXMV1ForecastDailyResponse,
  WXMV1ForecastHourlyResponse,
} from "../types/weather";
import { getH3Index } from "../utils/h3";

export type WeatherType = 
  | "sunny_day" | "sunny_night"
  | "cloudy_day" | "cloudy_night" 
  | "rainy_day" | "rainy_night"
  | "stormy_day" | "stormy_night"
  | "snowy_day" | "snowy_night"
  | "foggy_day" | "foggy_night"
  | "windy_day" | "windy_night"
  | "partly_cloudy_day" | "partly_cloudy_night"
  | null;

// Helper function to determine if it's day or night based on timestamp
export const isDayTime = (timestamp: string | Date): boolean => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const hour = date.getHours();
  
  // Consider day time from 6 AM to 6 PM (6:00 - 18:00)
  return hour >= 6 && hour < 18;
};

// Helper function to get time of day suffix
export const getTimeOfDaySuffix = (timestamp: string | Date): "_day" | "_night" => {
  return isDayTime(timestamp) ? "_day" : "_night";
};

// 🚩 DATA SOURCE FLAG - Modify this to test different sources
// "wxmv1" = Force WXMV1 only, "google" = Force Google only, null = Default (WXMV1 with Google fallback)
const FORCE_DATA_SOURCE: "wxmv1" | "google" | null = null;

function mapApiToWeatherType(apiData: any): WeatherType {
  if (!apiData) return null;
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
  
  // Get current time for day/night determination
  const now = new Date();
  const timeSuffix = getTimeOfDaySuffix(now);
  
  let baseWeatherType: string | null = null;
  if (all.includes("cloud")) baseWeatherType = "cloudy";
  else if (all.includes("rain")) baseWeatherType = "rainy";
  else if (all.includes("storm")) baseWeatherType = "stormy";
  else if (all.includes("snow")) baseWeatherType = "snowy";
  else if (all.includes("fog")) baseWeatherType = "foggy";
  else if (all.includes("wind")) baseWeatherType = "windy";
  else if (all.includes("partly")) baseWeatherType = "partly_cloudy";
  else if (all.includes("sun") || all.includes("clear")) baseWeatherType = "sunny";
  else baseWeatherType = null;
  
  return baseWeatherType ? `${baseWeatherType}${timeSuffix}` as WeatherType : null;
}

function mapWXMV1ToWeatherType(wxmv1Data: any): WeatherType {
  if (!wxmv1Data) return null;
  
  // WXMV1 data structure is different - it has icon field directly
  const icon = wxmv1Data.icon ? String(wxmv1Data.icon).toLowerCase() : "";
  
  // Use timestamp from wxmv1Data if available, otherwise use current time
  const timestamp = wxmv1Data.timestamp ? wxmv1Data.timestamp : new Date();
  const timeSuffix = getTimeOfDaySuffix(timestamp);
  
  let baseWeatherType: string | null = null;
  if (icon.includes("cloud")) baseWeatherType = "cloudy";
  else if (icon.includes("rain")) baseWeatherType = "rainy";
  else if (icon.includes("storm")) baseWeatherType = "stormy";
  else if (icon.includes("snow")) baseWeatherType = "snowy";
  else if (icon.includes("fog")) baseWeatherType = "foggy";
  else if (icon.includes("wind")) baseWeatherType = "windy";
  else if (icon.includes("partly")) baseWeatherType = "partly_cloudy";
  else if (icon.includes("overcast")) baseWeatherType = "cloudy";
  else if (icon.includes("sun") || icon.includes("clear")) baseWeatherType = "sunny";
  else baseWeatherType = null;
  
  return baseWeatherType ? `${baseWeatherType}${timeSuffix}` as WeatherType : null;
}

export const useSearchWeather = (latitude: number | null, longitude: number | null) => {
  // Only fetch data if we have valid coordinates
  const hasValidLocation = latitude && longitude;

  let userH3Index: string | null = null;
  if (hasValidLocation) {
    userH3Index = getH3Index(latitude, longitude);
  }

  // Get current date and format it as yyyy-mm-dd
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const sixDaysFromNow = new Date(today);
  sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // yyyy-mm-dd format
  };

  const todayFormatted = formatDate(today);
  const tomorrowFormatted = formatDate(tomorrow);
  const sixDaysFormatted = formatDate(sixDaysFromNow);

  // Get hourly forecast from wxmv1 (today to tomorrow)
  const {
    data: wxmv1HourlyForecastData,
    isLoading: loadingWxmv1Forecast,
    error: errorWxmv1Forecast,
  } = useAPI<WXMV1ForecastHourlyResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/wxm/forecast/wxmv1` || "",
    {
      method: "POST",
      body: JSON.stringify({
        "cellId": userH3Index,
        "from": todayFormatted,
        "to": tomorrowFormatted,
        "include": "hourly"
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    { enabled: !!hasValidLocation && !!userH3Index, staleTime: 300000, gcTime: 600000 }
  );

  // Get daily forecast from wxmv1 (today to 6 days in future)
  const {
    data: wxmv1DailyForecastData,
    isLoading: loadingWxmv1DailyForecast,
    error: errorWxmv1DailyForecast,
  } = useAPI<WXMV1ForecastDailyResponse>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/wxm/forecast/wxmv1` || "",
    {
      method: "POST",
      body: JSON.stringify({
        "cellId": userH3Index,
        "from": todayFormatted,
        "to": sixDaysFormatted,
        "include": "daily"
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    { enabled: !!hasValidLocation && !!userH3Index, staleTime: 300000, gcTime: 600000 }
  );



  // Only use Google API if backend did not return forecast data
  const shouldUseBaseAPI =
    !!latitude &&
    !!longitude &&
    (FORCE_DATA_SOURCE === "google" || 
     (!wxmv1HourlyForecastData || !wxmv1DailyForecastData || errorWxmv1Forecast || errorWxmv1DailyForecast));

  const {
    data: baseWeatherResponse,
    isLoading: loadingbaseWeather,
    error: errorbaseWeather,
  } = useAPI<{ data: WeatherAPIResponse; message: string }>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/current-conditions` || "",
    {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    { enabled: !!shouldUseBaseAPI, staleTime: 300000, gcTime: 600000 }
  );

  const { data: baseHourlyResponse, isLoading: loadingbaseHourly } =
    useAPI<{ data: HourlyAPIResponse; message: string }>(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/hourly-forecast` || "",
      {
        method: "POST",
        body: JSON.stringify({
          latitude,
          longitude,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
      { enabled: !!shouldUseBaseAPI, staleTime: 300000, gcTime: 600000 }
    );

  const { data: baseDailyResponse, isLoading: loadingBaseDaily } =
    useAPI<{ data: DailyAPIResponse; message: string }>(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/daily-forecast` || "",
      {
        method: "POST",
        body: JSON.stringify({
          latitude,
          longitude,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
      { enabled: !!shouldUseBaseAPI, staleTime: 300000, gcTime: 600000 }
    );

  // Extract data from the wrapped response
  const baseWeather = baseWeatherResponse?.data;
  const baseHourly = baseHourlyResponse?.data;
  const baseDaily = baseDailyResponse?.data;

  // Determine which data source to use
  const isUsingLocalStation = FORCE_DATA_SOURCE === "wxmv1" 
    ? true 
    : FORCE_DATA_SOURCE === "google" 
    ? false 
    : !!wxmv1HourlyForecastData?.forecast;
    
  const weather = isUsingLocalStation ? null : baseWeather;
  const hourlyData = isUsingLocalStation ? null : baseHourly;
  const dailyData = isUsingLocalStation ? null : baseDaily;


  // Determine weather type from the data source being used
  const weatherType = isUsingLocalStation 
    ? mapWXMV1ToWeatherType(wxmv1HourlyForecastData?.forecast[0]?.hourly?.[0]) 
    : mapApiToWeatherType(weather);



  // Loading states
  const isLoading = 
    loadingWxmv1Forecast ||
    loadingWxmv1DailyForecast ||
    loadingbaseWeather ||
    loadingbaseHourly ||
    loadingBaseDaily;

  // Error states - Only show error if both WXMV1 and Google APIs fail
  const hasError = (errorWxmv1Forecast && errorWxmv1DailyForecast && errorbaseWeather);
  const errorMessage = 
    (errorWxmv1Forecast && errorWxmv1DailyForecast && errorbaseWeather ? 
      "Unable to fetch weather data from any source" : 
      null);

  return {
    // Data
    wxmv1HourlyForecastData,
    wxmv1DailyForecastData,
    weather,
    hourlyData,
    dailyData,
    
    // States
    isUsingLocalStation,
    isLoading,
    hasError,
    errorMessage,
    
    // Location
    latitude,
    longitude,
    hasValidLocation,

    // Weather Type for background
    weatherType,
  };
}; 