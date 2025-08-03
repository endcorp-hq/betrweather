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
