import { getDistance } from "./math";
import weatherModelAverage from "./weatherModelAverage";
import {
  DailyForecast,
  HourlyForecast,
  MMForecastResponse,
  WeatherAPIResponse,
  HourlyAPIResponse,
  DailyAPIResponse,
  LocalStationsAPIResponse,
  Station,
} from "../types/weather";

const WEATHER_XM_RADIUS = 500;

// Fallback icons (emoji or local asset)
export const fallbackIcons = {
  wind: "💨",
  humidity: "💧",
  uv: "🌞",
  pressure: "🌡️",
};

// Helper function to get weather icon for WeatherXM API
export const getWeatherXMIcon = (iconType?: string) => {
  if (!iconType) return "☀️";
  switch (iconType) {
    case "rain":
      return "🌧️";
    case "cloudy":
      return "☁️";
    case "partly_cloudy":
      return "⛅";
    case "snow":
      return "❄️";
    case "fog":
      return "🌫️";
    case "thunderstorm":
      return "⛈️";
    default:
      return "☀️";
  }
};

// Helper to format date - Updated to show "Monday, July 10" format
export const formatDate = (displayDate?: {
  year?: number;
  month?: number;
  day?: number;
}) => {
  if (!displayDate) return "";

  const year = displayDate.year ?? new Date().getFullYear();
  const month = displayDate.month ?? 1;
  const day = displayDate.day ?? 1;

  // Create a Date object
  const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor

  // Get day of week
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayOfWeek = daysOfWeek[date.getDay()];

  // Get month name
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = months[date.getMonth()];

  return `${dayOfWeek}, ${monthName} ${day}`;
};

// Find nearest good station
export const findNearestGoodStation = (
  localStationsData: LocalStationsAPIResponse | null,
  latitude: number | null,
  longitude: number | null
) => {
  if (!localStationsData?.stations || !latitude || !longitude) return null;

  const goodStations = localStationsData.stations.filter(
    (station) => station.lastDayQod === 0
  );
  if (!goodStations.length) return null;

  const result = goodStations.reduce((nearest, station) => {
    const distance = getDistance(
      latitude,
      longitude,
      station.location.lat,
      station.location.lon
    );
    if (!nearest || distance < nearest.distance) {
      return { station, distance };
    }
    return nearest;
  }, null as { station: Station; distance: number } | null);
  
  console.log("[LOGIC] Nearest good station:", result);
  return result;
};

// Process weather data and return formatted values
export const processWeatherData = (
  isUsingLocalStation: boolean,
  mmForecastData: MMForecastResponse | null,
  weather: WeatherAPIResponse | null,
  results: any
) => {
  const temp = isUsingLocalStation
    ? results?.temperature?.toFixed(1) ?? "--"
    : weather?.temperature?.degrees ?? "--";

  const description = isUsingLocalStation
    ? "Local Station Data"
    : weather?.weatherCondition?.description?.text ?? "--";

  const feelsLike = isUsingLocalStation
    ? results?.feels_like?.toFixed(1) ?? "--"
    : weather?.feelsLikeTemperature?.degrees ?? "--";

  const high = isUsingLocalStation
    ? results?.dailyAverages?.temperature_max?.toFixed(1) ?? "--"
    : weather?.currentConditionsHistory?.maxTemperature?.degrees ?? "--";

  const low = isUsingLocalStation
    ? results?.dailyAverages?.temperature_min?.toFixed(1) ?? "--"
    : weather?.currentConditionsHistory?.minTemperature?.degrees ?? "--";

  const windSpeed = isUsingLocalStation
    ? results?.wind_speed?.toFixed(1) ?? "--"
    : weather?.wind?.speed?.value ?? "--";

  const windDesc = isUsingLocalStation
    ? `${results?.wind_speed?.toFixed(1) ?? "--"} km/h`
    : weather?.wind
    ? `${weather.wind.speed?.value ?? ""} km/h · From ${
        weather.wind.direction?.cardinal ?? ""
      }`
    : "--";

  const humidity = isUsingLocalStation
    ? results?.humidity?.toFixed(1) ?? "--"
    : weather?.relativeHumidity ?? "--";

  const dewPoint = weather?.dewPoint?.degrees ?? "--";
  const uv = isUsingLocalStation
    ? results?.uv_index?.toFixed(1) ?? "--"
    : weather?.uvIndex ?? "--";

  const pressure = isUsingLocalStation
    ? results?.pressure?.toFixed(1) ?? "--"
    : weather?.airPressure?.meanSeaLevelMillibars ?? "--";

  return {
    temp,
    description,
    feelsLike,
    high,
    low,
    windSpeed,
    windDesc,
    humidity,
    dewPoint,
    uv,
    pressure,
  };
};

// Process hourly forecast data
export const processHourlyForecast = (
  isUsingLocalStation: boolean,
  mmForecastData: MMForecastResponse | null,
  hourlyData: HourlyAPIResponse | null,
  results: any
): HourlyForecast[] => {
  if (isUsingLocalStation && mmForecastData && results) {
    return results?.hourlyAverages?.slice(0, 10).map((h: any, idx: number) => ({
      time: typeof h.timestamp === "string"
        ? new Date(h.timestamp).getHours() + ":00"
        : "--:--",
      temperature: typeof h.temperature === "number"
        ? h.temperature.toFixed(1)
        : "--",
      description: typeof h.precipitation_probability === "number" &&
        h.precipitation_probability > 0
          ? `${h.precipitation_probability}% rain`
          : "Clear",
      icon: getWeatherXMIcon(String(h.icon ?? "")),
    })) || [];
  } else {
    return hourlyData?.forecastHours?.slice(0, 10).map((h: any) => ({
      time: h.displayDateTime?.hours !== undefined
        ? `${h.displayDateTime.hours}:00`
        : "--:--",
      temperature: h.temperature?.degrees !== undefined
        ? h.temperature.degrees.toString()
        : "--",
      description: h.weatherCondition?.description?.text ?? "Clear",
      iconUri: h.weatherCondition?.iconBaseUri
        ? `${h.weatherCondition.iconBaseUri}.png`
        : undefined,
      icon: h.weatherCondition?.iconBaseUri ? undefined : "☀️",
    })) || [];
  }
};

// Process daily forecast data
export const processDailyForecast = (
  isUsingLocalStation: boolean,
  mmForecastData: MMForecastResponse | null,
  dailyData: DailyAPIResponse | null
): DailyForecast[] => {
  if (isUsingLocalStation && mmForecastData) {
    return mmForecastData.slice(0, 7).map((d: any, idx: number) => {
      const dailyData = d?.daily;
      const date = new Date(d.date);
      const weekday = date.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const monthDay = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        day: `${weekday}, ${monthDay}`,
        highTemp: dailyData?.temperature_max?.toString() ?? "--",
        lowTemp: dailyData?.temperature_min?.toString() ?? "--",
        description: "Daily Forecast",
        icon: getWeatherXMIcon(dailyData?.icon),
      } as DailyForecast;
    });
  } else {
    return dailyData?.forecastDays?.map((d: any) => ({
      displayDate: d.displayDate,
      maxTemperature: d.maxTemperature,
      minTemperature: d.minTemperature,
      daytimeForecast: d.daytimeForecast,
      nighttimeForecast: d.nighttimeForecast,
      sunEvents: d.sunEvents,
    })) || [];
  }
}; 