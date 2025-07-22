import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { WeatherBg } from "../components/ui/ScreenWrappers/WeatherBg";
import { WeatherSourceIndicator } from "../components/ui/WeatherSourceIndicator";
import { SearchButton } from "../components/ui/SearchButton";
import { RefractiveBgCard } from "../components/ui/RefractiveBgCard";
import { HourlyForecastItem } from "../components/ui/HourlyForecastItem";
import { DailyForecastItem } from "../components/ui/DailyForecastItem";
import { useAPI } from "../utils/useAPI";
import { useLocation } from "../utils/useLocation";
import { getDistance } from "../utils/math";
import weatherModelAverage from "../utils/weatherModelAverage";
import {
  DailyForecast,
  HourlyForecast,
  MMForecastResponse,
  WeatherAPIResponse,
  HourlyAPIResponse,
  DailyAPIResponse,
  LocalStationsAPIResponse,
  Station,
  WeatherCondition,
} from "../types/weather";
import MaterialCard from "../components/ui/MaterialCard";
import GlassyCard from "../components/ui/GlassyCard";
import theme from "../theme";
import { useAuthorization } from "../utils/useAuthorization";
import { LogoLoader } from "../components/ui/LoadingSpinner";

const WEATHER_XM_RADIUS = 500;

// Fallback icons (emoji or local asset)
const fallbackIcons = {
  wind: "💨",
  humidity: "💧",
  uv: "🌞",
  pressure: "🌡️",
};

export function HomeScreen() {
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null);

  const {
    latitude,
    longitude,
    detailedLocation,
    isLoading: loadingLocation,
    error: errorLocation,
  } = useLocation();

  const { selectedAccount } = useAuthorization();

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

  //compute avergaes between all models
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

  // Show loading state while getting location or fetching data
  if (
    loadingLocation ||
    loadingLocalStations ||
    loadingMMForecast ||
    loadingbaseWeather ||
    loadingbaseHourly ||
    loadingBaseDaily
  ) {
    return (
      <WeatherBg>
        <View className="flex-1 justify-center items-center p-6">
          <LogoLoader message="Loading weather data" />
        </View>
      </WeatherBg>
    );
  }

  // Show error if any API failed
  if (errorLocation || errorMMForecast || errorbaseWeather) {
    const errorMessage =
      errorLocation || errorMMForecast?.message || errorbaseWeather?.message;
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-red-500 text-xl font-better-bold mb-4">
          Error
        </Text>
        <Text className="text-white text-base text-center">{errorMessage}</Text>
        <TouchableOpacity
          className="mt-6 bg-purple-600 px-8 py-4 rounded-full"
          onPress={() => {
            // You might want to add a retry function to your useLocation hook
            // or reload the component
          }}
        >
          <Text className="text-white font-better-bold text-base">
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallbacks for missing data
  const city = detailedLocation?.[0]?.subregion || "Your City";

  // Helper function to get weather icon for WeatherXM API
  const getWeatherXMIcon = (iconType?: string) => {
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

  // Use WeatherXM data averages if available, otherwise fall back to base data
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

  // Hourly forecast: show next 10 hours
  const hourly: HourlyForecast[] = isUsingLocalStation
    ? [] // WeatherXM hourly data structure is different, handle separately
    : hourlyData?.forecastHours?.slice(0, 10) ?? [];

  // Daily forecast: show all days
  const daily: DailyForecast[] = isUsingLocalStation
    ? [] // WeatherXM daily data structure is different, handle separately
    : dailyData?.forecastDays ?? [];

  // Helper to format date - Updated to show "Monday, July 10" format
  const formatDate = (displayDate?: {
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

  const weatherIcon = weather?.weatherCondition?.iconBaseUri
    ? `${weather.weatherCondition.iconBaseUri}.png`
    : undefined;

  // const glassyItemStyle = {
  //   display: "flex",
  //   flexDirection: "column",
  //   padding: 8,
  //   minWidth: 64,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   marginHorizontal: 2,
  // } as const;

  return (
    <WeatherBg>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="bg-transparent"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <WeatherSourceIndicator
            isUsingLocalStation={isUsingLocalStation}
            distance={nearestGoodStation?.distance}
          />
          <SearchButton />
        </View>

        {/* Main Weather Display - Large Glassy Card */}
        <View
          className="items-center justify-center"
          style={{ minHeight: 300, marginTop: 20 }}
        >
          <RefractiveBgCard
            style={{
              width: 320,
              height: 300,
              borderRadius: 24,
            }}
            borderRadius={24}
          >
            {/* Location */}
            <Text className="text-white text-lg font-better-medium mb-2 text-center">
              {city}
            </Text>

            {/* Main Temperature */}
            <Text
              textBreakStrategy={"simple"}
              className="text-white text-[80px] font-better-light text-center mb-[-10px]"
            >
              {temp}°
            </Text>

            {/* Weather Description */}
            <Text className="text-white text-xl font-better-medium mb-4 text-center">
              {description}
            </Text>

            {/* High/Low Temps and Feels Like with Icon */}
            <View className="flex-row justify-between items-center w-full">
              <View className="flex-1">
                {/* High/Low Temps */}
                <Text className="text-white text-lg font-better-light mb-1">
                  High:{" "}
                  <Text className="text-white text-lg font-better-medium">
                    {high}°
                  </Text>{" "}
                  - Low:{" "}
                  <Text className="text-white text-lg font-better-medium">
                    {low}°
                  </Text>
                </Text>

                {/* Feels Like */}
                <Text className="text-white text-base font-better-light">
                  Feels like{" "}
                  <Text className="text-white text-lg font-better-medium">
                    {feelsLike}°
                  </Text>
                </Text>
              </View>

              {/* Weather Icon */}
              <View className="ml-4">
                {isUsingLocalStation ? (
                  <Text className="text-5xl">
                    {getWeatherXMIcon(
                      String(mmForecastData?.[0]?.hourly?.[0]?.icon ?? "")
                    )}
                  </Text>
                ) : weatherIcon ? (
                  <Image
                    source={{ uri: weatherIcon }}
                    className="w-16 h-16"
                    resizeMode="center"
                  />
                ) : (
                  <Text className="text-5xl">☀️</Text>
                )}
              </View>
            </View>
          </RefractiveBgCard>
        </View>

        {/* Hourly Forecast */}
        <GlassyCard style={{ marginTop: 24, marginBottom: 16 }}>
          <Text className="text-white text-xl font-better-semi-bold my-2">
            Hourly Forecast
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className=""
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {isUsingLocalStation && mmForecastData && results
              ? results?.hourlyAverages
                  ?.slice(0, 10)
                  .map((h, idx) => (
                    <HourlyForecastItem
                      key={idx}
                      time={
                        typeof h.timestamp === "string"
                          ? new Date(h.timestamp).getHours() + ":00"
                          : "--:--"
                      }
                      temperature={
                        typeof h.temperature === "number"
                          ? h.temperature.toFixed(1)
                          : "--"
                      }
                      description={
                        typeof h.precipitation_probability === "number" &&
                        h.precipitation_probability > 0
                          ? `${h.precipitation_probability}% rain`
                          : "Clear"
                      }
                      icon={getWeatherXMIcon(String(h.icon ?? ""))}
                    />
                  ))
              : hourly.map((h: HourlyForecast, idx) => (
                  <HourlyForecastItem
                    key={idx}
                    time={
                      h.displayDateTime?.hours !== undefined
                        ? `${h.displayDateTime.hours}:00`
                        : "--:--"
                    }
                    temperature={
                      h.temperature?.degrees !== undefined
                        ? h.temperature.degrees.toString()
                        : "--"
                    }
                    description={
                      h.weatherCondition?.description?.text ?? "Clear"
                    }
                    iconUri={
                      h.weatherCondition?.iconBaseUri
                        ? `${h.weatherCondition.iconBaseUri}.png`
                        : undefined
                    }
                    icon={h.weatherCondition?.iconBaseUri ? undefined : "☀️"}
                  />
                ))}
          </ScrollView>
        </GlassyCard>

        {/* Daily Forecast */}
        <GlassyCard style={{ marginTop: 16, marginBottom: 16 }}>
          <Text className="text-white text-xl font-better-semi-bold my-2">
            {isUsingLocalStation ? "7 Day Forecast" : "10 Day Forecast"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {isUsingLocalStation && mmForecastData
              ? mmForecastData.slice(0, 7).map((d, idx) => {
                  const dailyData = d?.daily;
                  const date = new Date(d.date);
                  const weekday = date.toLocaleDateString("en-US", {
                    weekday: "long",
                  });
                  const monthDay = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <DailyForecastItem
                      key={idx}
                      day={`${weekday}, ${monthDay}`}
                      highTemp={dailyData?.temperature_max?.toString() ?? "--"}
                      lowTemp={dailyData?.temperature_min?.toString() ?? "--"}
                      description="Daily Forecast"
                      icon={getWeatherXMIcon(dailyData?.icon)}
                    />
                  );
                })
              : daily
                  .slice(0, 10)
                  .map((d: DailyForecast, idx) => (
                    <DailyForecastItem
                      key={idx}
                      day={formatDate(d.displayDate)}
                      highTemp={d.maxTemperature?.degrees?.toString() ?? "--"}
                      lowTemp={d.minTemperature?.degrees?.toString() ?? "--"}
                      description={
                        d.daytimeForecast?.weatherCondition?.description
                          ?.text ?? "Clear"
                      }
                      iconUri={
                        d.daytimeForecast?.weatherCondition?.iconBaseUri
                          ? `${d.daytimeForecast.weatherCondition.iconBaseUri}.png`
                          : undefined
                      }
                      icon={
                        d.daytimeForecast?.weatherCondition?.iconBaseUri
                          ? undefined
                          : "☀️"
                      }
                    />
                  ))}
          </ScrollView>
        </GlassyCard>

        {/* Current Conditions */}
        <Text className="text-white text-xl font-better-semi-bold my-2">
          Current conditions
        </Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          {/* Wind */}
          <GlassyCard
            style={{
              width: "48%",
              minHeight: 120,
              marginBottom: 16,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <View className="flex-row items-center mb-1">
              <Text className="text-xl mr-1">{fallbackIcons.wind}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Wind
              </Text>
            </View>
            <Text className="text-white text-3xl font-better-bold">
              {Number(windSpeed).toFixed(1)} km/h
            </Text>
            <Text className="text-gray-300 text-xs font-better-regular">
              {windDesc}
            </Text>
          </GlassyCard>
          {/* Humidity */}
          <GlassyCard
            style={{
              width: "48%",
              minHeight: 120,
              marginBottom: 16,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <View className="flex-row items-center mb-1">
              <Text className="text-xl mr-1">{fallbackIcons.humidity}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Humidity
              </Text>
            </View>
            <Text className="text-white text-3xl font-better-bold">
              {Number(humidity).toFixed(1)}%
            </Text>
            <Text className="text-gray-300 text-xs font-better-regular">
              Dew point {dewPoint}°
            </Text>
          </GlassyCard>
          {/* UV Index */}
          <GlassyCard
            style={{
              width: "48%",
              minHeight: 120,
              marginBottom: 16,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <View className="flex-row items-center mb-1">
              <Text className="text-xl mr-1">{fallbackIcons.uv}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                UV Index
              </Text>
            </View>
            <Text className="text-white text-3xl font-better-bold">{uv}</Text>
          </GlassyCard>
          {/* Pressure */}
          <GlassyCard
            style={{
              width: "48%",
              minHeight: 120,
              marginBottom: 16,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <View className="flex-row items-center mb-1">
              <Text className="text-xl mr-1">{fallbackIcons.pressure}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Pressure
              </Text>
            </View>
            <Text className="text-white text-3xl font-better-bold">
              {Number(pressure).toFixed(1)}
            </Text>
            <Text className="text-gray-300 text-xs font-better-regular">
              mBar
            </Text>
          </GlassyCard>
        </View>
      </ScrollView>
      {/* Modal for selected day */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-gray-800 rounded-2xl p-6 w-[90%] max-w-sm">
            <Text className="text-white text-xl font-better-bold mb-6 text-center">
              {selectedDay ? formatDate(selectedDay.displayDate) : ""}
            </Text>
            {selectedDay?.daytimeForecast?.weatherCondition?.iconBaseUri && (
              <Image
                source={{
                  uri: `${selectedDay.daytimeForecast.weatherCondition.iconBaseUri}.png`,
                }}
                className="w-12 h-12 self-center mb-4"
                resizeMode="contain"
              />
            )}
            <Text className="text-white text-base mb-1">
              Day:{" "}
              {selectedDay?.daytimeForecast?.weatherCondition?.description
                ?.text ?? "--"}
            </Text>
            <Text className="text-white text-base mb-1">
              Night:{" "}
              {selectedDay?.nighttimeForecast?.weatherCondition?.description
                ?.text ?? "--"}
            </Text>
            <Text className="text-white text-base mb-1">
              Max Temp:{" "}
              {selectedDay?.maxTemperature?.degrees !== undefined
                ? `${selectedDay.maxTemperature.degrees}°`
                : "--"}
            </Text>
            <Text className="text-white text-base mb-1">
              Min Temp:{" "}
              {selectedDay?.minTemperature?.degrees !== undefined
                ? `${selectedDay.minTemperature.degrees}°`
                : "--"}
            </Text>
            <Text className="text-white text-base mb-1">
              Sunrise: {selectedDay?.sunEvents?.sunriseTime ?? "--"}
            </Text>
            <Text className="text-white text-base mb-1">
              Sunset: {selectedDay?.sunEvents?.sunsetTime ?? "--"}
            </Text>
            <TouchableOpacity
              className="mt-6 bg-purple-100 rounded-lg py-4 px-6 self-center"
              onPress={() => setSelectedDay(null)}
            >
              <Text className="text-purple-600 font-better-bold text-base text-center">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </WeatherBg>
  );
}
