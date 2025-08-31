import { WXMV1HourlyData, WXMV1ForecastDay, WeatherType, getTimeOfDaySuffix } from "../types/weather";
import {
  GoogleDailyForecastResponse,
  GoogleHourlyForecastResponse,
  WeatherXMWXMv1ForecastDay,
} from "src/types/wxm-types";
import { ClosestStationResponseDto } from "src/types/wxm-types";
import { CurrentConditionsResponse } from "src/types/wxm-types";

// Fallback icons (emoji or local asset)
export const fallbackIcons = {
  wind: "💨",
  humidity: "💧",
  uv: "🌞",
  pressure: "🌡️",
};

// Helper function to map WXMV1 icon strings to WeatherType with day/night
export const mapWXMV1IconToWeatherType = (
  iconString: string,
  timestamp?: string | Date,
  isLocalTime?: boolean
): WeatherType => {
  const icon = iconString.toLowerCase();

  // Use provided timestamp or current time for day/night determination
  const timeSuffix = getTimeOfDaySuffix(timestamp || new Date(), isLocalTime);
  let baseWeatherType: string | null = null;
  if (icon.includes("clear") || icon.includes("sunny"))
    baseWeatherType = "sunny";
  else if (icon.includes("partly-cloudy")) baseWeatherType = "partly_cloudy";
  else if (icon.includes("cloudy") || icon.includes("overcast"))
    baseWeatherType = "cloudy";
  else if (
    icon.includes("rain") ||
    icon.includes("drizzle") ||
    icon.includes("sleet") ||
    icon.includes("shower")
  )
    baseWeatherType = "rainy";
  else if (
    icon.includes("storm") ||
    icon.includes("thunder") ||
    icon.includes("lightning")
  )
    baseWeatherType = "stormy";
  else if (icon.includes("snow") || icon.includes("blizzard"))
    baseWeatherType = "snowy";
  else if (
    icon.includes("fog") ||
    icon.includes("mist") ||
    icon.includes("haze")
  )
    baseWeatherType = "foggy";
  else if (
    icon.includes("wind") ||
    icon.includes("breeze") ||
    icon.includes("gust")
  )
    baseWeatherType = "windy";
  else if (icon.includes("hail") || icon.includes("ice"))
    baseWeatherType = "stormy"; // Hail/ice storms
  else if (icon.includes("dust") || icon.includes("sand"))
    baseWeatherType = "windy"; // Dust/sand storms
  else if (icon.includes("smoke") || icon.includes("ash"))
    baseWeatherType = "foggy"; // Smoke/ash conditions
  else baseWeatherType = "sunny"; // Default fallback

  return `${baseWeatherType}${timeSuffix}` as WeatherType;
};

// Helper function to get weather icon for WeatherType with day/night variants
export const getWeatherXMIcon = (weatherType?: WeatherType): string => {
  if (!weatherType) return "☀️";

  // Map WeatherType values to appropriate emoji icons with day/night variants
  switch (weatherType) {
    // Day variants
    case "sunny_day":
      return "☀️";
    case "cloudy_day":
      return "☁️";
    case "rainy_day":
      return "🌧️";
    case "stormy_day":
      return "⛈️";
    case "snowy_day":
      return "❄️";
    case "foggy_day":
      return "🌫️";
    case "windy_day":
      return "💨";
    case "partly_cloudy_day":
      return "⛅";

    // Night variants
    case "sunny_night":
      return "🌙";
    case "cloudy_night":
      return "☁️";
    case "rainy_night":
      return "🌧️";
    case "stormy_night":
      return "⛈️";
    case "snowy_night":
      return "❄️";
    case "foggy_night":
      return "🌫️";
    case "windy_night":
      return "💨";
    case "partly_cloudy_night":
      return "🌥️";

    default:
      return "☀️"; // Default fallback
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

function calculateDewPoint(
  temperatureC: number,
  relativeHumidity: number
): number {
  // Magnus coefficients for water vapor over liquid
  const a = 17.62;
  const b = 243.12;

  // Protect against invalid humidity
  if (relativeHumidity <= 0 || relativeHumidity > 100) {
    throw new Error("Relative humidity must be between 0 and 100 percent.");
  }

  // Magnus formula
  const gamma =
    (a * temperatureC) / (b + temperatureC) + Math.log(relativeHumidity / 100);
  const dewPoint = (b * gamma) / (a - gamma);

  return dewPoint;
}

// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Helper function to format date string
function formatDateFromString(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Function to get the appropriate background video based on weather and time
export default function getBackgroundVideo(
  weatherType: any,
  isDay: boolean
): any {
  // Extract base weather type from day/night variant (e.g., "sunny_day" -> "sunny")
  const baseWeatherType = weatherType?.includes("_")
    ? weatherType.split("_")[0]
    : weatherType;

  if (baseWeatherType === "sunny" || baseWeatherType === null) {
    return isDay
      ? require("../../assets/weatherBg/clear-day.mp4")
      : require("../../assets/weatherBg/clear-night.mp4");
  } else if (
    baseWeatherType === "cloudy" ||
    baseWeatherType === "partly_cloudy" ||
    baseWeatherType === "overcast"
  ) {
    return isDay
      ? require("../../assets/weatherBg/cloudy-day.mp4")
      : require("../../assets/weatherBg/cloudy-night.mp4");
  } else if (baseWeatherType === "rainy") {
    return isDay
      ? require("../../assets/weatherBg/rainy-cloudy-day.mp4")
      : require("../../assets/weatherBg/rainy-cloudy-night.mp4");
  }
  // For other weather types, use cloudy backgrounds as fallback
  return isDay
    ? require("../../assets/weatherBg/cloudy-day.mp4")
    : require("../../assets/weatherBg/cloudy-night.mp4");
}

const getWindDirection = (degrees: number) => {
  const directions = ['North', 'North-Northeast', 'Northeast', 'East-Northeast', 'East', 'East-Southeast', 'Southeast', 'South-Southeast', 'South', 'South-Southwest', 'Southwest', 'West-Southwest', 'West', 'West-Northwest', 'Northwest', 'North-Northwest'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
}

export const parseCurrentWeatherData = (
  currentWeatherData:
    | WeatherXMWXMv1ForecastDay[]
    | ClosestStationResponseDto
    | CurrentConditionsResponse
    | null,
  currentWeatherSource: string,
  timeZoneId: string
) => {
  // Helper function for safe toFixed
  const safeFixed = (value: any, decimals: number = 1): string => {
    return (typeof value === "number" && !isNaN(value) ? value : 0).toFixed(
      decimals
    );
  };

  if (currentWeatherSource === "wxm station") {
    let data = currentWeatherData as ClosestStationResponseDto;
    let result = {
      temp: Math.round(data.weather?.observation.temperature || 0).toString() + "°",
      description: data.weather?.observation.icon
        ?.replace(/extreme-day/g, "sunny")
        .replace(/extreme-night/g, "cloudy")
        .replace(/-day|-night/g, ""),
      icon: getWeatherXMIcon(
        mapWXMV1IconToWeatherType(
          data.weather?.observation.icon ?? "",
          data.weather?.observation.timestamp
        )
      ),
      feelsLike: safeFixed(data.weather?.observation.feels_like) + "°",
      dewPoint: safeFixed(data.weather?.observation.dew_point) + "°", 
      humidity: safeFixed(data.weather?.observation.humidity) + "%",
      precipitationRate: safeFixed(
        data.weather?.observation.precipitation_rate
      ) + 'mm/h',
      windSpeed: safeFixed(data.weather?.observation.wind_speed) + " m/s",
      windDirection: getWindDirection(data.weather?.observation.wind_direction || 0),
      uvIndex: data.weather?.observation.uv_index ?? 0,
      pressure: safeFixed(data.weather?.observation.pressure) + " hPa",
      station: data?.station,
      high: null,
      low: null,
    };
    return result;
  } else if (currentWeatherSource === "wxm forecast") {
    let data = currentWeatherData as WeatherXMWXMv1ForecastDay[];
    const relevantData = data.filter(
      (item) => item.date === new Date().toISOString().split("T")[0]
    );

    const date = new Date();
    const utcHour = date.getUTCHours();

    const hourMatch = relevantData[0]?.hourly?.find((item) => {
      const itemDate = new Date(item.timestamp);
      const itemUtcHour = itemDate.getUTCHours();

      return itemUtcHour === utcHour;
    });

    const dewPoint =
      hourMatch?.temperature && hourMatch?.humidity
        ? calculateDewPoint(hourMatch.temperature, hourMatch.humidity)
        : 0;

    let result = {
      temp: Math.round(hourMatch?.temperature || 0).toString() + "°",
      icon: getWeatherXMIcon(
        mapWXMV1IconToWeatherType(hourMatch?.icon ?? "", hourMatch?.timestamp)
      ),
      description: hourMatch?.icon
        ?.replace(/-day|-night/g, "")
        .replace("extreme", "sunny"),
      feelsLike: safeFixed(hourMatch?.feels_like) + "°",
      humidity: safeFixed(hourMatch?.humidity) + "%",
      precipitationRate: safeFixed(hourMatch?.precipitation) + "mm/h",
      windSpeed: safeFixed(hourMatch?.wind_speed) + " m/s",
      windDirection: getWindDirection(hourMatch?.wind_direction || 0),
      uvIndex: hourMatch?.uv_index ?? 0,
      pressure: safeFixed(hourMatch?.pressure) + " hPa",
      dewPoint: safeFixed(dewPoint) + "°",
      high: null,
      low: null,
      station: null
    };

    return result;
  } else {
    let data = currentWeatherData as CurrentConditionsResponse;
    let result = {
      temp: Math.round(data?.temperature?.degrees || 0).toString(),
      icon: data?.weatherCondition?.iconBaseUri,
      description: data?.weatherCondition?.description?.text,
      feelsLike: safeFixed(data?.feelsLikeTemperature?.degrees),
      dewPoint: safeFixed(data?.dewPoint?.degrees),
      humidity: safeFixed(data?.relativeHumidity),
      precipitationRate: data?.precipitation?.probability?.percent ?? 0,
      windSpeed: safeFixed(data?.wind?.speed?.value),
      windDirection: data?.wind?.direction?.cardinal ?? "",
      uvIndex: data?.uvIndex ?? 0,
      pressure: safeFixed(data?.airPressure?.meanSeaLevelMillibars),
      high: null,
      low: null,
      station: null
    };
    return result;
  }
};

export const parseHourlyForecastData = (
  hourlyForecastData:
    | WeatherXMWXMv1ForecastDay[]
    | GoogleHourlyForecastResponse,
  hourlyForecastSource: string,
  timeZoneId: string
) => {
  if (hourlyForecastSource === "wxm forecast" && timeZoneId) {
    let data = hourlyForecastData as WeatherXMWXMv1ForecastDay[];
    let allHours: WXMV1HourlyData[] = [];
    let todayHours = data[0].hourly;
    let tomorrowHours = data[1].hourly;

    if (todayHours) {
      allHours.push(...todayHours);
    }
    if (tomorrowHours) {
      allHours.push(...tomorrowHours);
    }

    const currentUTC = new Date();
    const currentHour = currentUTC.getUTCHours();

    // Find the index of the current hour in the data
    let startIndex = 0;
    for (let i = 0; i < allHours.length; i++) {
      const dataTime = new Date(allHours[i].timestamp);
      if (dataTime.getUTCHours() === currentHour) {
        startIndex = i;
        break;
      }
    }

    // Take 10 hours starting from the current hour
    const futureHours = allHours.slice(startIndex, startIndex + 10);

    return futureHours.map((h: WXMV1HourlyData) => {
      // Format time in 12-hour format with AM/PM
      let formattedTime = "--:--";
      if (typeof h.timestamp === "string") {
        const date = new Date(h.timestamp);
        if (timeZoneId) {
          formattedTime = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
            timeZone: timeZoneId,
          });
        } else {
          // Fallback to UTC time in 12-hour format
          formattedTime = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
          });
        }
      }

      const localTime = new Date(h.timestamp).toLocaleTimeString("en-US", {timeZone: timeZoneId, hour12: false});
      return {
        time: formattedTime,
        temperature:
          typeof h.temperature === "number"
            ? { degrees: h.temperature }
            : { degrees: undefined },
        description:
          typeof h.precipitation_probability === "number" &&
          h.precipitation_probability > 0
            ? `${h.precipitation_probability}% rain`
            : "Clear",
        icon: getWeatherXMIcon(
          mapWXMV1IconToWeatherType(h.icon ?? "", localTime, true)
        ),
      };
    });
  } else if (hourlyForecastSource === "google forecast" && timeZoneId) {
    let data = hourlyForecastData as GoogleHourlyForecastResponse;
    return (
      data.forecastHours?.slice(0, 10).map((h: any) => {
        // Format time in 12-hour format with AM/PM for Google API data
        let formattedTime = "--:--";
        if (h.displayDateTime?.hours !== undefined) {
          const hour = h.displayDateTime.hours;
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          formattedTime = `${displayHour} ${ampm}`;
        }

        return {
          time: formattedTime,
          temperature:
            h.temperature?.degrees !== undefined
              ? { degrees: h.temperature.degrees }
              : { degrees: undefined },
          description: h.weatherCondition?.description?.text ?? "Clear",
          iconUri: h.weatherCondition?.iconBaseUri
            ? `${h.weatherCondition.iconBaseUri}.png`
            : undefined,
          icon: h.weatherCondition?.iconBaseUri ? undefined : "☀️",
        };
      }) || []
    );
  }
};

export const parseDailyForecastData = (
  dailyForecastData: WeatherXMWXMv1ForecastDay[] | GoogleDailyForecastResponse,
  dailyForecastSource: string
) => {
  if (dailyForecastSource === "wxm forecast") {
    let data = dailyForecastData as WeatherXMWXMv1ForecastDay[];
    const processedDaily = data
      .map((forecastDay: WXMV1ForecastDay) => {
        // Create a timestamp for the middle of the day (noon) for day/night determination
        const dayTimestamp = new Date(forecastDay.date);
        dayTimestamp.setHours(12, 0, 0, 0); // Set to noon

        return {
          day: formatDateFromString(forecastDay.date),
          highTemp: forecastDay?.daily?.temperature_max
            ? `${Math.round(forecastDay.daily.temperature_max)}°`
            : "--",
          lowTemp: forecastDay?.daily?.temperature_min
            ? `${Math.round(forecastDay.daily.temperature_min)}°`
            : "--",
          description: forecastDay.daily?.precipitation_type ?? "Clear",
          icon: getWeatherXMIcon(
            mapWXMV1IconToWeatherType(
              forecastDay.daily?.icon ?? "",
              dayTimestamp
            )
          ),
          precipitation: forecastDay.daily?.precipitation_probability ?? 0,
          humidity: forecastDay.daily?.humidity ?? 0,
          windSpeed: forecastDay.daily?.wind_speed ?? 0,
          windDirection: forecastDay.daily?.wind_direction ?? 0,
          pressure: forecastDay.daily?.pressure ?? 0,
          uvIndex: forecastDay.daily?.uv_index ?? 0,
          dewPoint: calculateDewPoint(
            forecastDay.daily?.temperature_max ?? 0,
            forecastDay.daily?.humidity ?? 0
          ),
        };
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.day).getTime() - new Date(b.day).getTime()
      );

    return processedDaily;
  } else if (dailyForecastSource === "google forecast") {
    let data = dailyForecastData as GoogleDailyForecastResponse;
    return data.forecastDays.map((day: any) => {
      // Extract data from the new Google API structure
      const displayDate = day.displayDate;
      const daytimeForecast = day.daytimeForecast;

      // Create a timestamp for the middle of the day for day/night determination
      const dayTimestamp = new Date(
        displayDate?.year || new Date().getFullYear(),
        (displayDate?.month || 1) - 1,
        displayDate?.day || 1
      );
      dayTimestamp.setHours(12, 0, 0, 0); // Set to noon

      return {
        day: formatDate(displayDate),
        highTemp: day.maxTemperature?.degrees
          ? `${Math.round(day.maxTemperature.degrees)}°`
          : "--",
        lowTemp: day.minTemperature?.degrees
          ? `${Math.round(day.minTemperature.degrees)}°`
          : "--",
        description:
          daytimeForecast?.weatherCondition?.description?.text || "Clear",
        icon: getWeatherXMIcon(
          mapWXMV1IconToWeatherType("clear", dayTimestamp)
        ), // Default to clear weather for Google API
      };
    });
  }
  return [];
};
