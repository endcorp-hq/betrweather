import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { useAPI } from "../utils/useAPI";
import { useLocation } from "../utils/useLocation";
import { getDistance } from "../utils/math"
import weatherModelAverage from "../utils/weatherModelAverage";
import { DailyForecast, HourlyForecast, MMForecastResponse, WeatherAPIResponse, HourlyAPIResponse, DailyAPIResponse, LocalStationsAPIResponse, Station, WeatherCondition, MMForecastHourly } from "../types/weather";

const WEATHER_XM_RADIUS = 10000;

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

  const { latitude, longitude, detailedLocation, isLoading: loadingLocation, error: errorLocation } =
    useLocation();

  // Only create URLs and fetch data if we have valid coordinates
  const hasValidLocation = latitude && longitude && !loadingLocation && !errorLocation;

  // Step 1: Get local stations within 5km radius
  const LOCAL_STATIONS_URL = hasValidLocation
    ? `https://pro.weatherxm.com/api/v1/stations/near?lat=${latitude}&lon=${longitude}&radius=${WEATHER_XM_RADIUS}`
    : null;

  const { data: localStationsData, isLoading: loadingLocalStations } = useAPI<LocalStationsAPIResponse>(
    LOCAL_STATIONS_URL || "", {
      headers: {
        "X-API-Key": process.env.EXPO_PUBLIC_XM_API_KEY || "",
        "Accept": "application/json",
        "Host": "pro.weatherxm.com",
      },
    }
  );

  // Find nearest good station
  const nearestGoodStation = useMemo(() => {
    if (!localStationsData?.stations || !latitude || !longitude) return null;

    const goodStations = localStationsData.stations.filter(station => station.lastDayQod === 0);
    if (!goodStations.length) return null;


    return goodStations.reduce((nearest, station) => {
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
  }, [localStationsData, latitude, longitude]);

  // Step 2: Fetch WeatherXM forecast if we have a good station
  const MM_FORECAST_URL = nearestGoodStation?.station?.cellId
    ? `https://pro.weatherxm.com/api/v1/cells/${nearestGoodStation.station.cellId}/mm/forecast`
    : null;

  const { data: mmForecastData, isLoading: loadingMMForecast, error: errorMMForecast } = useAPI<MMForecastResponse>(
    MM_FORECAST_URL || "", {
      headers: {
        "X-Api-Key": process.env.EXPO_PUBLIC_XM_API_KEY || "",
        "Accept": "application/json",
        "Host": "pro.weatherxm.com",
      },
    },
    { enabled: !!MM_FORECAST_URL }
  );


  //compute avergaes between all models
  const results = weatherModelAverage(mmForecastData);

  // Step 3: Only fetch Base API data if no local station forecast available
  const shouldUseBaseAPI = hasValidLocation && !nearestGoodStation && !loadingLocalStations;

  const WEATHER_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/currentConditions:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const HOURLY_FORECAST_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/forecast/hours:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`
    : null;

  const DAILY_FORECAST_URL = shouldUseBaseAPI
    ? `https://weather.googleapis.com/v1/forecast/days:lookup?key=${process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&days=10&pageSize=10`
    : null;

  const { data: baseWeather, isLoading: loadingbaseWeather, error: errorbaseWeather } = useAPI<WeatherAPIResponse>(
    WEATHER_URL || "", {}, { enabled: !!WEATHER_URL }
  );

  const { data: baseHourly, isLoading: loadingbaseHourly } = useAPI<HourlyAPIResponse>(
    HOURLY_FORECAST_URL || "", {}, { enabled: !!HOURLY_FORECAST_URL }
  );

  const { data: baseDaily, isLoading: loadingBaseDaily } = useAPI<DailyAPIResponse>(
    DAILY_FORECAST_URL || "", {}, { enabled: !!DAILY_FORECAST_URL }
  );

  // Determine which data source to use
  const isUsingLocalStation = !!mmForecastData;
  const weather = isUsingLocalStation ? null : baseWeather;
  const hourlyData = isUsingLocalStation ? null : baseHourly;
  const dailyData = isUsingLocalStation ? null : baseDaily;

  // Show loading state while getting location or fetching data
  if (loadingLocation || loadingLocalStations || loadingMMForecast || loadingbaseWeather || loadingbaseHourly || loadingBaseDaily) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#78a646" />
          <Text className="mt-4 text-gray-700">Loading weather...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Show error if any API failed
  if (errorLocation || errorMMForecast || errorbaseWeather) {
    const errorMessage = errorLocation || errorMMForecast?.message || errorbaseWeather?.message;
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-red-500 text-lg font-better-bold mb-2">Error</Text>
          <Text className="text-gray-700 text-center">{errorMessage}</Text>
          <TouchableOpacity 
            className="mt-4 bg-accent-green px-6 py-3 rounded-full"
            onPress={() => {
              // You might want to add a retry function to your useLocation hook
              // or reload the component
            }}
          >
            <Text className="text-white font-better-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Fallbacks for missing data
  const city = detailedLocation?.[0]?.subregion || "Your City";
  
  // Helper function to get weather icon for Base API
  const getbaseWeatherIcon = (weatherCondition?: WeatherCondition) => {
    if (!weatherCondition?.iconBaseUri) return "☀️";
    return weatherCondition.iconBaseUri;
  };

  // Helper function to get weather icon for WeatherXM API
  const getWeatherXMIcon = (iconType?: string) => {
    if (!iconType) return "☀️";
    switch (iconType) {
      case "rain": return "🌧️";
      case "cloudy": return "☁️";
      case "partly_cloudy": return "⛅";
      case "snow": return "❄️";
      case "fog": return "🌫️";
      case "thunderstorm": return "⛈️";
      default: return "☀️";
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
      ? `${weather.wind.speed?.value ?? ""} km/h · From ${weather.wind.direction?.cardinal ?? ""}`
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

  // If your API provides wind/humidity icons, use them; otherwise fallback
  // (Base Weather API does not provide wind/humidity icons, so fallback)
  const windIcon = undefined; // or a local asset if you have one
  const humidityIcon = undefined; // or a local asset if you have one

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="bg-transparent"
      >
        {/* Search Bar */}
        <View className="pt-4">
          <TextInput
            className="bg-white/50 rounded-full px-5 py-3 text-white font-better-regular"
            placeholder="Search location"
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>

                 {/* Data Source Indicator */}
         <View className="mt-4 bg-white/30 rounded-lg p-2">
           <Text className="text-white text-sm font-better-regular text-center">
             {isUsingLocalStation ? "🌤️ Local Station Forecast" : "☁️ Google Forecast"}
             {nearestGoodStation?.distance && ` (${nearestGoodStation.distance.toFixed(1)}km away)`}
           </Text>
         </View>

        {/* Weather Info (add icon here if you want) */}
        <View className="mt-6 bg-white/50 rounded-xl p-4 flex flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-black text-[18px] font-better-regular">
              {city}
            </Text>
            <Text className="text-black text-[72px] font-better-light">
              {temp}°
            </Text>
            <Text className="text-black text-base font-better-regular mt-1">
              High: {high}° - Low: {low}°
            </Text>
          </View>
          <View className="flex flex-col items-end justify-center">
            {isUsingLocalStation ? (
              <Text className="text-4xl mb-2">
                {getWeatherXMIcon(String(mmForecastData?.[0]?.hourly?.[0]?.icon ?? ""))}
              </Text>
            ) : weatherIcon ? (
              <Image
                source={{ uri: weatherIcon }}
                style={{ width: 48, height: 48, marginBottom: 4 }}
                resizeMode="contain"
              />
            ) : (
              <Text className="text-4xl mb-2">☀️</Text>
            )}
            <Text className="text-black text-lg font-better-regular">
              {description}
            </Text>
            <Text className="text-black text-sm font-better-regular">
              Feels like {feelsLike}°
            </Text>
          </View>
        </View>

                 {/* Hourly Forecast - Base API */}
         {!isUsingLocalStation && (
           <View className="mt-6 bg-white/50 rounded-xl p-4">
             <Text className="text-black text-lg font-better-regular mb-2">
               Hourly Forecast
             </Text>
             <ScrollView
               horizontal
               showsHorizontalScrollIndicator={false}
               className="py-2"
               contentContainerStyle={{ paddingHorizontal: 4 }}
             >
               {hourly.map((h: HourlyForecast, idx) => (
                 <View
                   key={idx}
                   className="flex items-center justify-center mx-2 rounded-full px-4 py-2"
                   style={{ minWidth: 80, minHeight: 120 }}
                 >
                   <Text className="text-black font-better-light text-xs mb-2">
                     {h.displayDateTime?.hours !== undefined
                       ? `${h.displayDateTime.hours}:00`
                       : "--:--"}
                   </Text>
                   {h.weatherCondition?.iconBaseUri ? (
                     <Image
                       source={{ uri: `${h.weatherCondition.iconBaseUri}.png` }}
                       style={{ width: 36, height: 36, marginVertical: 4 }}
                       resizeMode="contain"
                     />
                   ) : (
                     <Text className="text-black font-better-light text-2xl my-2">
                       ☀️
                     </Text>
                   )}
                   <Text className="text-black font-better-light text-xs mb-2 text-center">
                     {h.weatherCondition?.description?.text ?? "Clear"}
                   </Text>
                   <Text className="text-black font-better-light text-lg">
                     {h.temperature?.degrees !== undefined
                       ? `${h.temperature.degrees}°`
                       : "--"}
                   </Text>
                 </View>
               ))}
             </ScrollView>
           </View>
         )}

                 {/* WeatherXM Hourly Forecast */}
         {isUsingLocalStation && mmForecastData && results && (
           <View className="mt-6 bg-white/50 rounded-xl p-4">
             <Text className="text-black text-lg font-better-regular mb-2">
               Hourly Forecast
             </Text>
             <ScrollView
               horizontal
               showsHorizontalScrollIndicator={false}
               className="py-2"
               contentContainerStyle={{ paddingHorizontal: 4 }}
             >
               {results?.hourlyAverages?.slice(0, 10).map((h, idx) => (
                 <View
                   key={idx}
                   className="flex items-center justify-center mx-2 rounded-full px-4 py-2"
                   style={{ minWidth: 80, minHeight: 120 }}
                 >
                   <Text className="text-black font-better-light text-xs mb-2">
                     {typeof h.timestamp === "string" ? new Date(h.timestamp).getHours() + ":00" : "--:--"}
                   </Text>
                   <Text className="text-black font-better-light text-2xl my-2">
                     {getWeatherXMIcon(String(h.icon ?? ""))}
                   </Text>
                   <Text className="text-black font-better-light text-xs mb-2 text-center">
                     {typeof h.precipitation_probability === "number" && h.precipitation_probability > 0
                       ? `${h.precipitation_probability}% rain`
                       : "Clear"}
                   </Text>
                   <Text className="text-black font-better-light text-lg">
                     {typeof h.temperature === "number" ? h.temperature.toFixed(1) : "--"}°
                   </Text>
                 </View>
               ))}
             </ScrollView>
           </View>
         )}

                 {/* 10 Day Forecast - Base API */}
         {!isUsingLocalStation && (
           <View className="mt-6 bg-white/50 rounded-xl p-4">
             <Text className="text-black text-lg font-better-regular mb-2">
               10 Day Forecast
             </Text>
             {daily.slice(0, 10).map((d: DailyForecast, idx) => (
               <TouchableOpacity
                 key={idx}
                 className="flex-row items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                 onPress={() => setSelectedDay(d)}
               >
                 <Text className="text-black font-better-regular text-base w-24">
                   {formatDate(d.displayDate)}
                 </Text>
                 {d.daytimeForecast?.weatherCondition?.iconBaseUri ? (
                   <Image
                     source={{
                       uri: `${d.daytimeForecast.weatherCondition.iconBaseUri}.png`,
                     }}
                     style={{ width: 36, height: 36 }}
                     resizeMode="contain"
                   />
                 ) : (
                   <Text className="text-2xl w-10 text-center">☀️</Text>
                 )}
                 <Text className="text-black font-better-regular text-base w-20 text-center">
                   {d.maxTemperature?.degrees !== undefined
                     ? `${d.maxTemperature.degrees}°`
                     : "--"}{" "}
                   /{" "}
                   {d.minTemperature?.degrees !== undefined
                     ? `${d.minTemperature.degrees}°`
                     : "--"}
                 </Text>
               </TouchableOpacity>
             ))}
           </View>
         )}

                 {/* WeatherXM Daily Forecast */}
         {isUsingLocalStation && mmForecastData && (
           <View className="mt-6 bg-white/50 rounded-xl p-4">
             <Text className="text-black text-lg font-better-regular mb-2">
               7 Day Forecast
             </Text>
             {mmForecastData.slice(0, 7).map((d, idx) => {
               const dailyData = d?.daily;
               
               return (
                 <View
                   key={idx}
                   className="flex-row items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                 >
                   <Text className="text-black font-better-regular text-base w-24">
                     {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                   </Text>
                   <Text className="text-2xl w-10 text-center">
                     {getWeatherXMIcon(dailyData?.icon)}
                   </Text>
                   <Text className="text-black font-better-regular text-base w-20 text-center">
                     {dailyData?.temperature_max ?? "--"}° / {dailyData?.temperature_min ?? "--"}°
                   </Text>
                 </View>
               );
             })}
           </View>
         )}

        {/* Current Conditions */}
        <Text className="text-black text-lg font-better-regular mt-8 mb-2">
          Current conditions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {/* Wind */}
          <View className="w-[49%] h-[120px] flex flex-col justify-between bg-white/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center mb-1">
              {windIcon ? (
                <Image
                  source={{ uri: windIcon }}
                  style={{ width: 20, height: 20, marginRight: 6 }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-lg mr-2">{fallbackIcons.wind}</Text>
              )}
              <Text className="text-gray-500 text-xs font-better-light">
                Wind
              </Text>
            </View>
            <Text className="text-gray-700 text-2xl font-better-bold">
              {Number(windSpeed).toFixed(1)} km/h
            </Text>
            <Text className="text-gray-500 text-xs font-better-light">
              {windDesc}
            </Text>
          </View>
          {/* Humidity */}
          <View className="w-[49%] h-[120px] flex flex-col justify-between bg-white/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center mb-1">
              {humidityIcon ? (
                <Image
                  source={{ uri: humidityIcon }}
                  style={{ width: 20, height: 20, marginRight: 6 }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-lg mr-2">{fallbackIcons.humidity}</Text>
              )}
              <Text className="text-gray-500 text-xs font-better-light">
                Humidity
              </Text>
            </View>
            <Text className="text-gray-700 text-2xl font-better-bold">
              {Number(humidity).toFixed(1)}%
            </Text>
            <Text className="text-gray-500 text-xs font-better-light">
              Dew point {dewPoint}°
            </Text>
          </View>
          {/* UV Index */}
          <View className="w-[49%] h-[120px] flex flex-col justify-between bg-white/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center mb-1">
              <Text className="text-lg mr-2">{fallbackIcons.uv}</Text>
              <Text className="text-gray-500 text-xs font-better-light">
                UV Index
              </Text>
            </View>
            <Text className="text-gray-700 text-2xl font-better-bold">
              {uv}
            </Text>
          </View>
          {/* Pressure */}
          <View className="w-[49%] h-[120px] flex flex-col justify-between bg-white/50 rounded-xl p-4 mb-2">
            <View className="flex-row items-center mb-1">
              <Text className="text-lg mr-2">{fallbackIcons.pressure}</Text>
              <Text className="text-gray-500 text-xs font-better-light">
                Pressure
              </Text>
            </View>
            <Text className="text-gray-700 text-2xl font-better-bold">
              {Number(pressure).toFixed(1)}
            </Text>
            <Text className="text-gray-500 text-xs font-better-light">
              mBar
            </Text>
          </View>
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
          <View className="bg-white rounded-xl p-6 w-11/12 max-w-xl">
            <Text className="text-black text-lg font-bold mb-4">
              {selectedDay ? formatDate(selectedDay.displayDate) : ""}
            </Text>
            {selectedDay?.daytimeForecast?.weatherCondition?.iconBaseUri && (
              <Image
                source={{
                  uri: `${selectedDay.daytimeForecast.weatherCondition.iconBaseUri}.png`,
                }}
                style={{
                  width: 48,
                  height: 48,
                  alignSelf: "center",
                  marginBottom: 8,
                }}
                resizeMode="contain"
              />
            )}
            <Text className="mb-2">
              Day:{" "}
              {selectedDay?.daytimeForecast?.weatherCondition?.description
                ?.text ?? "--"}
            </Text>
            <Text className="mb-2">
              Night:{" "}
              {selectedDay?.nighttimeForecast?.weatherCondition?.description
                ?.text ?? "--"}
            </Text>
            <Text className="mb-2">
              Max Temp:{" "}
              {selectedDay?.maxTemperature?.degrees !== undefined
                ? `${selectedDay.maxTemperature.degrees}°`
                : "--"}
            </Text>
            <Text className="mb-2">
              Min Temp:{" "}
              {selectedDay?.minTemperature?.degrees !== undefined
                ? `${selectedDay.minTemperature.degrees}°`
                : "--"}
            </Text>
            <Text className="mb-2">
              Sunrise: {selectedDay?.sunEvents?.sunriseTime ?? "--"}
            </Text>
            <Text className="mb-2">
              Sunset: {selectedDay?.sunEvents?.sunsetTime ?? "--"}
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-200 rounded px-4 py-2"
              onPress={() => setSelectedDay(null)}
            >
              <Text className="text-blue-900 font-bold text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
