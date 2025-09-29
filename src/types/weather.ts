// --- Types for API responses ---
export type WeatherCondition = {
  iconBaseUri?: string;
  description?: { text?: string };
};

export type HourlyForecast = {
  displayDateTime?: { hours?: number };
  weatherCondition?: WeatherCondition;
  temperature?: { degrees?: number };
};

export type DaytimeNighttimeForecast = {
  weatherCondition?: WeatherCondition;
};

export type DailyForecast = {
  displayDate?: { year?: number; month?: number; day?: number };
  daytimeForecast?: DaytimeNighttimeForecast;
  nighttimeForecast?: DaytimeNighttimeForecast;
  maxTemperature?: { degrees?: number };
  minTemperature?: { degrees?: number };
  sunEvents?: { sunriseTime?: string; sunsetTime?: string };
};

export type Station = {
  cellId: string;
  createdAt: string;
  id: string;
  lastDayQod: number;
  elevation: number;
  lat: number;
  lon: number;
  name: string;
};

export type WeatherAPIResponse = {
  temperature?: { degrees?: number };
  weatherCondition?: WeatherCondition;
  feelsLikeTemperature?: { degrees?: number };
  currentConditionsHistory?: {
    maxTemperature?: { degrees?: number };
    minTemperature?: { degrees?: number };
  };
  wind?: {
    speed?: { value?: number };
    direction?: { cardinal?: string };
  };
  relativeHumidity?: number;
  dewPoint?: { degrees?: number };
  uvIndex?: number;
  airPressure?: { meanSeaLevelMillibars?: number };
};

// New WXMV1 API Types
export type WXMV1HourlyData = {
  precipitation: number;
  precipitation_probability: number;
  temperature: number;
  icon: string;
  wind_speed: number;
  wind_direction: number;
  humidity: number;
  pressure: number;
  uv_index: number;
  timestamp: string;
  feels_like: number;
};

export type WXMV1DailyData = {
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number;
  precipitation_intensity: number;
  humidity: number;
  uv_index: number;
  pressure: number;
  icon: string;
  precipitation_type: string;
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
};

export type WXMV1ForecastDay = {
  tz: string;
  date: string;
  daily?: WXMV1DailyData;
};

export type WXMV1ForecastDailyResponse = {
  forecast: WXMV1ForecastDay[];
  message: string;
};

export type WXMV1ForecastHourly = {
  tz: string;
  date: string;
  hourly?: WXMV1HourlyData[];
}

export type WXMV1ForecastHourlyResponse = {
  forecast: WXMV1ForecastHourly[];
  message: string;
};

// Legacy MM Types (keeping for backward compatibility)
export type MMForecastHourly = {
  timestamp: string;
  precipitation: number;
  precipitation_probability: number;
  temperature: number;
  icon: number;
  wind_speed: number;
  wind_direction: number;
  humidity: number;
  pressure: number;
  uv_index: number;
  feels_like: number;
};

export type MMForecastDaily = {
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number;
  precipitation_intensity: number;
  humidity: number;
  uv_index: number;
  pressure: number;
  icon: string;
  precipitation_type: string;
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
};

export type MMForecastResponse = {
  forecast: Array<{
    date: string;
    hourly: MMForecastHourly[];
    model: string;
    tz: string;
  }>;
  message: string;
};

export type HourlyAPIResponse = { forecastHours?: HourlyForecast[] };
export type DailyAPIResponse = { forecastDays?: DailyForecast[] };
export type LocalStationsAPIResponse = {
  data: {
    station: Station;
    distance: number;
  };
};

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
