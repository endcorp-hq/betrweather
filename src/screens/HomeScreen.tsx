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
  StyleSheet,
} from "react-native";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { useAPI } from "../utils/useAPI";
import { useLocation } from "../utils/useLocation";
import { getDistance } from "../utils/math"
import weatherModelAverage from "../utils/weatherModelAverage";
import { DailyForecast, HourlyForecast, MMForecastResponse, WeatherAPIResponse, HourlyAPIResponse, DailyAPIResponse, LocalStationsAPIResponse, Station, WeatherCondition, MMForecastHourly } from "../types/weather";
import MaterialCard from '../components/ui/MaterialCard';
import GlassyCard from '../components/ui/GlassyCard';
import theme from '../theme';
import { WeatherBackgroundSkia } from '../components/ui/WeatherBackgroundSkia';
import { useAuthorization } from "../utils/useAuthorization";
import { ConnectButton } from "../components/sign-in/sign-in-ui";

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

  const { latitude, longitude, detailedLocation, isLoading: loadingLocation, error: errorLocation } =
    useLocation();

  const { selectedAccount } = useAuthorization();

  // Only create URLs and fetch data if we have valid coordinates
  const hasValidLocation = latitude && longitude && !loadingLocation && !errorLocation;

  // Step 1: Get local stations within 5km radius
  const LOCAL_STATIONS_URL = hasValidLocation
    ? `https://pro.weatherxm.com/api/v1/stations/near?lat=${latitude}&lon=${longitude}&radius=${WEATHER_XM_RADIUS}`
    : null;

  if (LOCAL_STATIONS_URL) {
    console.log("[API] Fetching local stations:", LOCAL_STATIONS_URL);
  }

  const { data: localStationsData, isLoading: loadingLocalStations } = useAPI<LocalStationsAPIResponse>(
    LOCAL_STATIONS_URL || "", {
      headers: {
        "X-API-Key": process.env.EXPO_PUBLIC_XM_API_KEY || "",
        "Accept": "application/json",
        "Host": "pro.weatherxm.com",
      },
    }
  );

  React.useEffect(() => {
    if (localStationsData) {
      console.log("[API] Local stations response:", localStationsData);
    }
  }, [localStationsData]);

  // Find nearest good station
  const nearestGoodStation = useMemo(() => {
    if (!localStationsData?.stations || !latitude || !longitude) return null;

    const goodStations = localStationsData.stations.filter(station => station.lastDayQod === 0);
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

  React.useEffect(() => {
    if (mmForecastData) {
      console.log("[API] WeatherXM forecast response:", mmForecastData);
    }
    if (errorMMForecast) {
      console.log("[API] WeatherXM forecast error:", errorMMForecast);
    }
  }, [mmForecastData, errorMMForecast]);

  //compute avergaes between all models
  const results = weatherModelAverage(mmForecastData);
  React.useEffect(() => {
    if (results) {
      console.log("[LOGIC] Weather model averages:", results);
    }
  }, [results]);

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

  if (WEATHER_URL) {
    console.log("[API] Fetching Google Weather current conditions:", WEATHER_URL);
  }
  if (HOURLY_FORECAST_URL) {
    console.log("[API] Fetching Google Weather hourly forecast:", HOURLY_FORECAST_URL);
  }
  if (DAILY_FORECAST_URL) {
    console.log("[API] Fetching Google Weather daily forecast:", DAILY_FORECAST_URL);
  }

  const { data: baseWeather, isLoading: loadingbaseWeather, error: errorbaseWeather } = useAPI<WeatherAPIResponse>(
    WEATHER_URL || "", {}, { enabled: !!WEATHER_URL }
  );

  const { data: baseHourly, isLoading: loadingbaseHourly } = useAPI<HourlyAPIResponse>(
    HOURLY_FORECAST_URL || "", {}, { enabled: !!HOURLY_FORECAST_URL }
  );

  const { data: baseDaily, isLoading: loadingBaseDaily } = useAPI<DailyAPIResponse>(
    DAILY_FORECAST_URL || "", {}, { enabled: !!DAILY_FORECAST_URL }
  );

  React.useEffect(() => {
    if (baseWeather) {
      console.log("[API] Google Weather current conditions response:", baseWeather);
    }
    if (baseHourly) {
      console.log("[API] Google Weather hourly forecast response:", baseHourly);
    }
    if (baseDaily) {
      console.log("[API] Google Weather daily forecast response:", baseDaily);
    }
    if (errorbaseWeather) {
      console.log("[API] Google Weather error:", errorbaseWeather);
    }
  }, [baseWeather, baseHourly, baseDaily, errorbaseWeather]);

  // Determine which data source to use
  const isUsingLocalStation = !!mmForecastData;
  React.useEffect(() => {
    console.log("[LOGIC] Data source:", isUsingLocalStation ? "WeatherXM (local station)" : "Google Weather API");
  }, [isUsingLocalStation]);
  const weather = isUsingLocalStation ? null : baseWeather;
  const hourlyData = isUsingLocalStation ? null : baseHourly;
  const dailyData = isUsingLocalStation ? null : baseDaily;

  // Show loading state while getting location or fetching data
  if (loadingLocation || loadingLocalStations || loadingMMForecast || loadingbaseWeather || loadingbaseHourly || loadingBaseDaily) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Show error if any API failed
  if (errorLocation || errorMMForecast || errorbaseWeather) {
    const errorMessage = errorLocation || errorMMForecast?.message || errorbaseWeather?.message;
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              // You might want to add a retry function to your useLocation hook
              // or reload the component
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
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

  // For compact glassy items, define a quick GlassyItemCard wrapper (or use GlassyCard with a compact style)
  const glassyItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    padding: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  } as const;

  return (
    <ScreenWrapper>
      {/* Force only the sunny background for testing */}
      <WeatherBackgroundSkia theme={theme} condition="partly_cloudy" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        {/*
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search location"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        */}

        {/* Data Source Indicator */}
        <MaterialCard variant="filled" style={styles.dataSourceCard}>
          <Text style={styles.dataSourceText}>
            {isUsingLocalStation ? "🌤️ Local Station Forecast" : "☁️ Google Forecast"}
            {nearestGoodStation?.distance && ` (${nearestGoodStation.distance.toFixed(1)}km away)`}
          </Text>
        </MaterialCard>

        {/* Weather Info */}
        <GlassyCard style={styles.weatherInfoCard}>
          <View style={styles.weatherInfoRow}>
            <View style={styles.weatherInfoLeft}>
              <Text style={styles.cityText}>{city}</Text>
              <Text style={styles.tempText}>{temp}°</Text>
              <Text style={styles.highLowText}>High: {high}° - Low: {low}°</Text>
            </View>
            <View style={styles.weatherInfoRight}>
              {isUsingLocalStation ? (
                <Text style={styles.weatherIcon}>
                  {getWeatherXMIcon(String(mmForecastData?.[0]?.hourly?.[0]?.icon ?? ""))}
                </Text>
              ) : weatherIcon ? (
                <Image
                  source={{ uri: weatherIcon }}
                  style={styles.weatherImage}
                  resizeMode="center"
                />
              ) : (
                <Text style={styles.weatherIcon}>☀️</Text>
              )}
              <Text style={styles.descriptionText}>{description}</Text>
              <Text style={styles.feelsLikeText}>Feels like {feelsLike}°</Text>
            </View>
          </View>
        </GlassyCard>

        {/* Hourly Forecast */}
        <GlassyCard style={styles.hourlyCard}>
          <Text style={styles.sectionTitle}>Hourly Forecast</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyScroll}
          >
            {isUsingLocalStation && mmForecastData && results
              ? results?.hourlyAverages?.slice(0, 10).map((h, idx) => (
                  <GlassyCard key={idx} style={glassyItemStyle} intensity={30} shimmer={false}>
                    <Text style={styles.hourlyTime}>
                      {typeof h.timestamp === "string" ? new Date(h.timestamp).getHours() + ":00" : "--:--"}
                    </Text>
                    <Text style={styles.hourlyWeatherIcon}>{getWeatherXMIcon(String(h.icon ?? ""))}</Text>
                    <Text style={styles.hourlyDesc}>
                      {typeof h.precipitation_probability === "number" && h.precipitation_probability > 0
                        ? `${h.precipitation_probability}% rain`
                        : "Clear"}
                    </Text>
                    <Text style={styles.hourlyTemp}>
                      {typeof h.temperature === "number" ? h.temperature.toFixed(1) : "--"}°
                    </Text>
                  </GlassyCard>
                ))
              : hourly.map((h: HourlyForecast, idx) => (
                  <GlassyCard key={idx} style={glassyItemStyle} intensity={30} shimmer={false}>
                    <Text style={styles.hourlyTime}>
                      {h.displayDateTime?.hours !== undefined
                        ? `${h.displayDateTime.hours}:00`
                        : "--:--"}
                    </Text>
                    {h.weatherCondition?.iconBaseUri ? (
                      <Image
                        source={{ uri: `${h.weatherCondition.iconBaseUri}.png` }}
                        style={styles.hourlyWeatherImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.hourlyWeatherIcon}>☀️</Text>
                    )}
                    <Text style={styles.hourlyDesc}>
                      {h.weatherCondition?.description?.text ?? "Clear"}
                    </Text>
                    <Text style={styles.hourlyTemp}>
                      {h.temperature?.degrees !== undefined
                        ? `${h.temperature.degrees}°`
                        : "--"}
                    </Text>
                  </GlassyCard>
                ))}
          </ScrollView>
        </GlassyCard>

        {/* Daily Forecast */}
        <GlassyCard style={styles.dailyCard}>
          <Text style={styles.sectionTitle}>{isUsingLocalStation ? "7 Day Forecast" : "10 Day Forecast"}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyScroll}
          >
            {(isUsingLocalStation && mmForecastData
              ? mmForecastData.slice(0, 7).map((d, idx) => {
                  const dailyData = d?.daily;
                  return (
                    <GlassyCard
                      key={idx}
                      style={glassyItemStyle}
                      intensity={30}
                      shimmer={false}
                    >
                      <Text style={styles.dailyTime}>{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                      <Text style={styles.dailyWeatherIcon}>{getWeatherXMIcon(dailyData?.icon)}</Text>
                      <Text style={styles.dailyTemp}>{dailyData?.temperature_max ?? "--"}° / {dailyData?.temperature_min ?? "--"}°</Text>
                    </GlassyCard>
                  );
                })
              : daily.slice(0, 10).map((d: DailyForecast, idx) => (
                  <GlassyCard
                    key={idx}
                    style={glassyItemStyle}
                    intensity={30}
                    shimmer={false}
                  >
                    <Text style={styles.dailyTime}>{formatDate(d.displayDate)}</Text>
                    {d.daytimeForecast?.weatherCondition?.iconBaseUri ? (
                      <Image
                        source={{ uri: `${d.daytimeForecast.weatherCondition.iconBaseUri}.png` }}
                        style={styles.dailyWeatherImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.dailyWeatherIcon}>☀️</Text>
                    )}
                    <Text style={styles.dailyTemp}>
                      {d.maxTemperature?.degrees !== undefined
                        ? `${d.maxTemperature.degrees}°`
                        : "--"} / {d.minTemperature?.degrees !== undefined
                        ? `${d.minTemperature.degrees}°`
                        : "--"}
                    </Text>
                  </GlassyCard>
                )))}
          </ScrollView>
        </GlassyCard>

        {/* Current Conditions */}
        <Text style={styles.sectionTitle}>Current conditions</Text>
        <View style={styles.currentConditionsRow}>
          {/* Wind */}
          <MaterialCard style={styles.currentConditionCard}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionIcon}>{fallbackIcons.wind}</Text>
              <Text style={styles.conditionLabel}>Wind</Text>
            </View>
            <Text style={styles.conditionValue}>{Number(windSpeed).toFixed(1)} km/h</Text>
            <Text style={styles.conditionSub}>{windDesc}</Text>
          </MaterialCard>
          {/* Humidity */}
          <MaterialCard style={styles.currentConditionCard}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionIcon}>{fallbackIcons.humidity}</Text>
              <Text style={styles.conditionLabel}>Humidity</Text>
            </View>
            <Text style={styles.conditionValue}>{Number(humidity).toFixed(1)}%</Text>
            <Text style={styles.conditionSub}>Dew point {dewPoint}°</Text>
          </MaterialCard>
          {/* UV Index */}
          <MaterialCard style={styles.currentConditionCard}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionIcon}>{fallbackIcons.uv}</Text>
              <Text style={styles.conditionLabel}>UV Index</Text>
            </View>
            <Text style={styles.conditionValue}>{uv}</Text>
          </MaterialCard>
          {/* Pressure */}
          <MaterialCard style={styles.currentConditionCard}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionIcon}>{fallbackIcons.pressure}</Text>
              <Text style={styles.conditionLabel}>Pressure</Text>
            </View>
            <Text style={styles.conditionValue}>{Number(pressure).toFixed(1)}</Text>
            <Text style={styles.conditionSub}>mBar</Text>
          </MaterialCard>
        </View>
      </ScrollView>
      {/* Floating Connect Wallet Button */}
      {!selectedAccount && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <ConnectButton />
        </View>
      )}
      {/* Modal for selected day */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDay ? formatDate(selectedDay.displayDate) : ""}
            </Text>
            {selectedDay?.daytimeForecast?.weatherCondition?.iconBaseUri && (
              <Image
                source={{
                  uri: `${selectedDay.daytimeForecast.weatherCondition.iconBaseUri}.png`,
                }}
                style={styles.modalWeatherImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.modalText}>
              Day: {selectedDay?.daytimeForecast?.weatherCondition?.description?.text ?? "--"}
            </Text>
            <Text style={styles.modalText}>
              Night: {selectedDay?.nighttimeForecast?.weatherCondition?.description?.text ?? "--"}
            </Text>
            <Text style={styles.modalText}>
              Max Temp: {selectedDay?.maxTemperature?.degrees !== undefined ? `${selectedDay.maxTemperature.degrees}°` : "--"}
            </Text>
            <Text style={styles.modalText}>
              Min Temp: {selectedDay?.minTemperature?.degrees !== undefined ? `${selectedDay.minTemperature.degrees}°` : "--"}
            </Text>
            <Text style={styles.modalText}>
              Sunrise: {selectedDay?.sunEvents?.sunriseTime ?? "--"}
            </Text>
            <Text style={styles.modalText}>
              Sunset: {selectedDay?.sunEvents?.sunsetTime ?? "--"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  searchBarContainer: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  searchBar: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  dataSourceCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  dataSourceText: {
    color: theme.colors.onSurface,
    fontSize: 14,
    textAlign: 'center',
  },
  weatherInfoCard: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  weatherInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherInfoLeft: {
    flex: 1,
  },
  cityText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
  },
  tempText: {
    color: theme.colors.onSurface,
    fontSize: 72,
    fontWeight: '200',
  },
  highLowText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginTop: theme.spacing.xs,
  },
  weatherInfoRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  weatherIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  weatherImage: {
    width: 48,
    height: 48,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '400',
  },
  feelsLikeText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  hourlyCard: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  hourlyScroll: {
    paddingHorizontal: theme.spacing.sm,
  },
  hourlyItem: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
    minWidth: 80,
    minHeight: 120,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  hourlyTime: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  hourlyWeatherIcon: {
    fontSize: 28,
    marginVertical: theme.spacing.xs,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  hourlyWeatherImage: {
    width: 36,
    height: 36,
    marginVertical: theme.spacing.xs,
    alignSelf: 'center',
    paddingHorizontal: 'auto',
    textAlign: 'center',

  },
  hourlyDesc: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  hourlyTemp: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  dailyCard: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerHigh,
  },
  dailyDate: {
    color: theme.colors.onSurface,
    fontSize: 16,
    textAlign: 'center',
  },
  dailyWeatherIcon: {
    fontSize: 28,
    textAlign: 'center',
  },
  dailyWeatherImage: {
    width: 36,
    height: 36,
    alignSelf: 'center',
  },
  dailyTemp: {
    color: theme.colors.onSurface,
    fontSize: 16,
    textAlign: 'center',
  },
  currentConditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  currentConditionCard: {
    width: '48%',
    minHeight: 120,
    marginBottom: theme.spacing.md,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  conditionIcon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  conditionLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '400',
  },
  conditionValue: {
    color: theme.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
  },
  conditionSub: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '400',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    color: theme.colors.onSurface,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xxl,
  },
  retryButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  modalWeatherImage: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    marginBottom: theme.spacing.xs,
  },
  modalCloseButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignSelf: 'center',
  },
  modalCloseButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  dailyScroll: {
    paddingHorizontal: theme.spacing.sm,
  },
  dailyItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    minWidth: 90,
    minHeight: 120,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainer,
  },
  dailyTime: {
    color: theme.colors.onSurface,
    fontSize: 14,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 100,
    elevation: 10,
  },
});
