
import {
  HourlyForecast,
  HourlyAPIResponse,
  DailyAPIResponse,
  WXMV1HourlyData,
  WXMV1ForecastHourlyResponse,
  WXMV1ForecastDailyResponse,
  WXMV1ForecastDay,
} from "../types/weather";
import { WeatherType, getTimeOfDaySuffix } from "../hooks/useWeatherData";

// Fallback icons (emoji or local asset)
export const fallbackIcons = {
  wind: "💨",
  humidity: "💧",
  uv: "🌞",
  pressure: "🌡️",
};

// Helper function to map WXMV1 icon strings to WeatherType with day/night
export const mapWXMV1IconToWeatherType = (iconString: string, timestamp?: string | Date): WeatherType => {
  const icon = iconString.toLowerCase();
  
  // Use provided timestamp or current time for day/night determination
  const timeSuffix = getTimeOfDaySuffix(timestamp || new Date());
  
  let baseWeatherType: string | null = null;
  if (icon.includes('clear') || icon.includes('sunny')) baseWeatherType = "sunny";
  else if (icon.includes('partly-cloudy')) baseWeatherType = "partly_cloudy";
  else if (icon.includes('cloudy') || icon.includes('overcast')) baseWeatherType = "cloudy";
  else if (icon.includes('rain') || icon.includes('drizzle') || icon.includes('sleet') ||  icon.includes('shower')) baseWeatherType = "rainy";
  else if (icon.includes('storm') || icon.includes('thunder') || icon.includes('lightning')) baseWeatherType = "stormy";
  else if (icon.includes('snow') || icon.includes('blizzard')) baseWeatherType = "snowy";
  else if (icon.includes('fog') || icon.includes('mist') || icon.includes('haze')) baseWeatherType = "foggy";
  else if (icon.includes('wind') || icon.includes('breeze') || icon.includes('gust')) baseWeatherType = "windy";
  else if (icon.includes('hail') || icon.includes('ice')) baseWeatherType = "stormy"; // Hail/ice storms
  else if (icon.includes('dust') || icon.includes('sand')) baseWeatherType = "windy"; // Dust/sand storms
  else if (icon.includes('smoke') || icon.includes('ash')) baseWeatherType = "foggy"; // Smoke/ash conditions
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
      return "🌤️";
    
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


function calculateDewPoint(temperatureC: number, relativeHumidity: number): number {
  // Magnus coefficients for water vapor over liquid
  const a = 17.62;
  const b = 243.12;

  // Protect against invalid humidity
  if (relativeHumidity <= 0 || relativeHumidity > 100) {
    throw new Error("Relative humidity must be between 0 and 100 percent.");
  }

  // Magnus formula
  const gamma = (a * temperatureC) / (b + temperatureC) + Math.log(relativeHumidity / 100);
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


// Process weather data and return formatted values
export const processWeatherData = (
  isUsingLocalStation: boolean,
  weather: any,
  hourlyData: any,
  dailyData: any,
  stationWeather?: any // Updated parameter name
) => {
  // If we have station data, use it as the primary source
  if (stationWeather?.observation) {
    const observation = stationWeather.observation;
    const todayTemps = dailyData;
    let description = observation.icon ? observation.icon === "extreme-day" ? "sunny" : observation.icon.split("-").join(" ").replace(/(day|night)\s*/i, "") : "Local Station report";
    
    return {
      temp: Math.round(observation.temperature).toString(),
      description: description,
      high: todayTemps ? `${Math.round(todayTemps.temperature_max)}°` : "--",
      low: todayTemps ? `${Math.round(todayTemps.temperature_min)}°` : "--",
      feelsLike: Math.round(observation.temperature).toString(), // Station doesn't have feels like, use actual temp
      windSpeed: observation.wind_speed ? Math.round(observation.wind_speed).toString() : "--",
      windDesc: observation.wind_speed ? `${Math.round(observation.wind_speed)} mph` : "--",
      humidity: observation.humidity ? Math.round(observation.humidity).toString() : "--",
      dewPoint: observation.dew_point ? Math.round(observation.dew_point).toString() : "--",
      uv: observation.uv_index ? Math.round(observation.uv_index).toString() : "--",
      pressure: observation.pressure ? Math.round(observation.pressure).toString() : "--",
    };
  }

  // Fallback to existing logic for hourly/daily data
  if (isUsingLocalStation && hourlyData) {
    const todayTemps = dailyData;
    
    return {
      temp: hourlyData.temperature ? `${Math.round(hourlyData.temperature)}°` : "--",
      description: hourlyData.icon === "extreme-day" ? "sunny" : hourlyData.icon.split("-").join(" ").replace(/(day|night)\s*/i, ""),
      high: todayTemps ? `${Math.round(todayTemps.temperature_max)}°` : "--",
      low: todayTemps ? `${Math.round(todayTemps.temperature_min)}°` : "--",
      feelsLike: hourlyData.feels_like ? `${Math.round(hourlyData.feels_like)}°` : "--",
      windSpeed: hourlyData.wind_speed ? `${Math.round(hourlyData.wind_speed)} mph` : "--",
      windDesc: "", // You might want to calculate this based on wind speed
      humidity: hourlyData.humidity ? `${Math.round(hourlyData.humidity)}%` : "--",
      dewPoint: calculateDewPoint(hourlyData.temperature, hourlyData.humidity) ? `${Math.round(calculateDewPoint(hourlyData.temperature, hourlyData.humidity))}°` : "--",
      uv: hourlyData.uv_index !== null && hourlyData.uv_index !== undefined ? `${Math.round(hourlyData.uv_index)}` : "--",
      pressure: hourlyData.pressure ? `${Math.round(hourlyData.pressure)} mb` : "--",
    };
  } else if (weather) {
    const temp = weather?.temperature?.degrees ?? "--";
    const description = weather?.weatherCondition?.description?.text ?? "--";
    const feelsLike = weather?.feelsLikeTemperature?.degrees ?? "--";
    const high = weather?.currentConditionsHistory?.maxTemperature?.degrees ?? "--";
    const low = weather?.currentConditionsHistory?.minTemperature?.degrees ?? "--";
    const windSpeed = weather?.wind?.speed?.value ?? "--";
    const windDesc = weather?.wind
      ? `${weather.wind.speed?.value ?? ""} km/h · From ${
          weather.wind.direction?.cardinal ?? ""
        }`
      : "--";
    const humidity = weather?.relativeHumidity ?? "--";
    const dewPoint = weather?.dewPoint?.degrees ?? "--";
    const uv = weather?.uvIndex ?? "--";
    const pressure = weather?.airPressure?.meanSeaLevelMillibars ?? "--";

    const result = {
      temp: temp !== "--" ? `${Math.round(temp)}°` : "--",
      description,
      feelsLike: feelsLike !== "--" ? `${Math.round(feelsLike)}°` : "--",
      high: high !== "--" ? `${Math.round(high)}°` : "--",
      low: low !== "--" ? `${Math.round(low)}°` : "--",
      windSpeed: windSpeed !== "--" ? `${Math.round(windSpeed)} km/h` : "--",
      windDesc,
      humidity: humidity !== "--" ? `${Math.round(humidity)}%` : "--",
      dewPoint: dewPoint !== "--" ? `${Math.round(dewPoint)}°` : "--",
      uv: uv !== "--" && uv !== null && uv !== undefined ? `${Math.round(uv)}` : "--",
      pressure: pressure !== "--" ? `${Math.round(pressure)} mb` : "--",
    };

    return result;
  }

  return {
    temp: "--",
    description: "--",
    high: "--",
    low: "--",
    feelsLike: "--",
    windSpeed: "--",
    windDesc: "--",
    humidity: "--",
    dewPoint: "--",
    uv: "--",
    pressure: "--",
  };
};

// Process hourly forecast data
export const processHourlyForecast = (
  isUsingLocalStation: boolean,
  hourlyData: HourlyAPIResponse | null,
  wxmv1HourlyData: WXMV1ForecastHourlyResponse | null,
  timeZoneId?: string
): HourlyForecast[] => {

  if (isUsingLocalStation && wxmv1HourlyData) {
    
    // Collect all available hours from today and tomorrow
    let allHours: WXMV1HourlyData[] = [];
    
    // Add hours from today
    if (wxmv1HourlyData.forecast[0]?.hourly) {
      allHours.push(...wxmv1HourlyData.forecast[0].hourly);
    }
    
    // Add hours from tomorrow if needed
    if (wxmv1HourlyData.forecast[1]?.hourly) {
      allHours.push(...wxmv1HourlyData.forecast[1].hourly);
    }
    
    // Find the current hour in the data
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
          formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
            timeZone: timeZoneId
          });
        } else {
          // Fallback to UTC time in 12-hour format
          formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true
          });
        }
      }

      return {
        time: formattedTime,
        temperature: typeof h.temperature === "number"
          ? { degrees: h.temperature }
          : { degrees: undefined },
        description: typeof h.precipitation_probability === "number" &&
          h.precipitation_probability > 0
            ? `${h.precipitation_probability}% rain`
            : "Clear",
        icon: getWeatherXMIcon(mapWXMV1IconToWeatherType(h.icon ?? "", h.timestamp)),
      };
    });
  } else {
    return hourlyData?.forecastHours?.slice(0, 10).map((h: any) => {
      // Format time in 12-hour format with AM/PM for Google API data
      let formattedTime = "--:--";
      if (h.displayDateTime?.hours !== undefined) {
        const hour = h.displayDateTime.hours;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        formattedTime = `${displayHour} ${ampm}`;
      }

      return {
        time: formattedTime,
        temperature: h.temperature?.degrees !== undefined
          ? { degrees: h.temperature.degrees }
          : { degrees: undefined },
        description: h.weatherCondition?.description?.text ?? "Clear",
        iconUri: h.weatherCondition?.iconBaseUri
          ? `${h.weatherCondition.iconBaseUri}.png`
          : undefined,
        icon: h.weatherCondition?.iconBaseUri ? undefined : "☀️",
      };
    }) || [];
  }
};

// Process daily forecast data
export const processDailyForecast = (
  isUsingLocalStation: boolean,
  wxmv1DailyData: WXMV1ForecastDailyResponse | null,
  dailyData: DailyAPIResponse | null
) => {

  if (isUsingLocalStation && wxmv1DailyData?.forecast) {
    // Convert the daily temperature data to the expected format
    const processedDaily = wxmv1DailyData.forecast
      .map((forecastDay: WXMV1ForecastDay) => {
        // Create a timestamp for the middle of the day (noon) for day/night determination
        const dayTimestamp = new Date(forecastDay.date);
        dayTimestamp.setHours(12, 0, 0, 0); // Set to noon
        
        return {
          day: formatDateFromString(forecastDay.date),
          highTemp: forecastDay?.daily?.temperature_max ? `${Math.round(forecastDay.daily.temperature_max)}°` : "--",
          lowTemp: forecastDay?.daily?.temperature_min ? `${Math.round(forecastDay.daily.temperature_min)}°` : "--",
          description: forecastDay.daily?.precipitation_type ?? "Clear",
          icon: getWeatherXMIcon(mapWXMV1IconToWeatherType(forecastDay.daily?.icon ?? "", dayTimestamp)),
        };
      })
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
    
    return processedDaily;
  }

  // Fallback to Google API data - Updated for new structure
  if (dailyData?.forecastDays) {
    
    return dailyData.forecastDays.map((day) => {
      // Extract data from the new Google API structure
      const displayDate = day.displayDate;
      const daytimeForecast = day.daytimeForecast;
      
      // Create a timestamp for the middle of the day for day/night determination
      const dayTimestamp = new Date(displayDate?.year || new Date().getFullYear(), 
                                   (displayDate?.month || 1) - 1, 
                                   displayDate?.day || 1);
      dayTimestamp.setHours(12, 0, 0, 0); // Set to noon
      
      return {
        day: formatDate(displayDate),
        highTemp: day.maxTemperature?.degrees ? `${Math.round(day.maxTemperature.degrees)}°` : "--",
        lowTemp: day.minTemperature?.degrees ? `${Math.round(day.minTemperature.degrees)}°` : "--",
        description: daytimeForecast?.weatherCondition?.description?.text || "Clear",
        icon: getWeatherXMIcon(mapWXMV1IconToWeatherType("clear", dayTimestamp)), // Default to clear weather for Google API
      };
    });
  }
  return [];
};

// Helper function to format date string
function formatDateFromString(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });
} 


// Function to get the appropriate background video based on weather and time
export default function getBackgroundVideo(weatherType: any, isDay: boolean): any {
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

