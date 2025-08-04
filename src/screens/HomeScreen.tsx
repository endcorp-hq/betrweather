import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { MotiView } from "moti";
import { WeatherSourceIndicator } from "../components/weather/WeatherSourceIndicator";
import { SearchButton } from "../components/weather/SearchButton";
import { HourlyForecastItem } from "../components/weather/HourlyForecastItem";
import { DailyForecastItem } from "../components/weather/DailyForecastItem";
import GlassyCard from "../components/ui/GlassyCard";
import { LogoLoader } from "../components/ui/LoadingSpinner";
import { MainWeatherDisplay } from "../components/weather/MainWeatherDisplay";
import { CurrentConditions } from "../components/weather/CurrentConditions";
import { useWeatherData } from "../hooks/useWeatherData";
import { useSearchWeather } from "../hooks/useSearchWeather";
import { useLocation } from "../hooks/useLocation";
import {
  processWeatherData,
  processHourlyForecast,
  processDailyForecast,
  getWeatherXMIcon,
} from "../utils/weatherDataProcessor";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DefaultBg } from "../components/ui/ScreenWrappers/DefaultBg";
import { DailyDetailScreen } from "./DailyDetailScreen";
import { useFocusEffect } from "@react-navigation/native";
import getBackgroundVideo from "../utils/getWeatherVideo";
import { useToast } from "../components/ui/CustomToast";
import { useTimeZone } from "../contexts/TimezoneContext";
import { getLocalTimeForTimezone } from "../utils/timezoneUtils";

interface SearchedLocation {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export function HomeScreen() {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchedLocation, setSearchedLocation] =
    useState<SearchedLocation | null>(null);
  const [showAnimations, setShowAnimations] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<any>(null);
  const { height: screenHeight } = Dimensions.get("window");
  const backgroundImageHeight = screenHeight * 0.7;
  const [backgroundVideoSource, setBackgroundVideoSource] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const {toast} = useToast();
  // Get current location coordinates
  const { latitude, longitude } = useLocation();
  
  // Use the new hook that provides both timezone and local time
  const { timeZoneId } = useTimeZone(searchedLocation?.lat || latitude, searchedLocation?.lon || longitude);
  
  // Create video player for expo-video - always available on HomeScreen
  const player = useVideoPlayer(null, (player) => {
    player.loop = true;
    player.muted = true;
  });

  // Handle screen focus/unfocus to pause/play video for performance
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused - play video if we have a source
      if (player && backgroundVideoSource) {
        try {
          player.play();
        } catch (error) {
          console.log("Error playing video:", error);
        }
      }

      return () => {
        // Screen is unfocused - pause video to save resources
        if (player) {
          try {
            player.pause();
          } catch (error) {
            console.log("Error pausing video:", error);
          }
        }
      };
    }, [player, backgroundVideoSource])
  );

  const {
    wxmv1HourlyForecastData,
    wxmv1DailyForecastData,
    weather,
    hourlyData,
    dailyData,
    detailedLocation,
    isUsingLocalStation,
    isLoading,
    hasError,
    errorMessage,
    weatherType,
    userH3Index,
  } = useWeatherData(refreshCounter);



  // Search weather data
  const searchWeatherData = useSearchWeather(
    searchedLocation?.lat || null,
    searchedLocation?.lon || null,
    refreshCounter
  );

  // Move getBackgroundVideoSource here, after searchWeatherData is defined
  const getBackgroundVideoSource = async (currentTimeZoneId: string) => {
    let isDay = false;    
    try {
      const {time} = getLocalTimeForTimezone(currentTimeZoneId);
      if (time) {
        // Parse the time string to get local hours
        const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let localHours = parseInt(timeMatch[1]);
          const period = timeMatch[3].toUpperCase();
          if (period === "PM" && localHours !== 12) localHours += 12;
          if (period === "AM" && localHours === 12) localHours = 0;

          isDay = localHours >= 6 && localHours < 18;
        }
      }
    } catch (error) {
      console.error("Error getting timezone info for searched location:", error);
      // Fallback to device time
      const deviceHours = new Date().getHours();
      isDay = deviceHours >= 6 && deviceHours < 18;
    }

    return getBackgroundVideo(weatherType, isDay);
  };

  // Use search data if available, otherwise use current location data
  const currentData = searchedLocation
    ? {
        wxmv1HourlyForecastData: searchWeatherData.wxmv1HourlyForecastData,
        wxmv1DailyForecastData: searchWeatherData.wxmv1DailyForecastData,
        weather: searchWeatherData.weather,
        hourlyData: searchWeatherData.hourlyData,
        dailyData: searchWeatherData.dailyData,
        isUsingLocalStation: searchWeatherData.isUsingLocalStation,
        isLoading: searchWeatherData.isLoading,
        hasError: searchWeatherData.hasError,
        errorMessage: searchWeatherData.errorMessage,
        weatherType: searchWeatherData.weatherType,
        userH3Index: searchWeatherData.userH3Index,
      }
    : {
        wxmv1HourlyForecastData,
        wxmv1DailyForecastData,
        weather,
        hourlyData,
        dailyData,
        isUsingLocalStation,
        isLoading,
        hasError,
        errorMessage,
        weatherType,
        userH3Index,
      };
  // Update the useEffect to load video source into existing player
  useEffect(() => {
    const updateBackgroundVideo = async () => {
      try {
        const source = await getBackgroundVideoSource(timeZoneId || "");
        setBackgroundVideoSource(source);

        // Load the new source into the existing player
        if (player && source) {
          player.replace(source);
          player.play();
        }
      } catch (error) {
        console.error("Error getting background video source:", error);
        // Fallback to current time
        const deviceHours = new Date().getHours();
        const isDay = deviceHours >= 6 && deviceHours < 18;
        const fallbackSource = getBackgroundVideo(
          currentData.weatherType,
          isDay
        );
        setBackgroundVideoSource(fallbackSource);

        // Load fallback source into player
        if (player && fallbackSource) {
          player.replace(fallbackSource);
          player.play();
        }
      }
    };

    if (!currentData.isLoading && !currentData.hasError && timeZoneId) {
      updateBackgroundVideo();
    }
  }, [
    currentData.weatherType,
    searchedLocation,
    currentData.isLoading,
    currentData.hasError,
    player,
    latitude,
    longitude,
    refreshCounter,
    timeZoneId,
  ]);

  // Trigger animations when data loads
  useEffect(() => {
    if (!currentData.isLoading && !currentData.hasError) {
      // Small delay to ensure smooth transition from loading and stable background
      const timer = setTimeout(() => {
        setShowAnimations(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowAnimations(false);
    }
  }, [currentData.isLoading, currentData.hasError]);

  const handleLocationSelect = (location: SearchedLocation) => {
    setSearchedLocation(location);
    handleSearchToggle(false);
  };

  const handleSearchToggle = (isExpanded: boolean) => {
    setIsSearchActive(isExpanded);
  };

  const handleDailyForecastPress = (dayData: any) => {
    setSelectedDayDetail(dayData);
  };

  const handleBackFromDetail = () => {
    setSelectedDayDetail(null);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Clear searched location and increment refresh counter
      setSearchedLocation(null);
      setRefreshCounter(prev => prev + 1);
      
      // Wait for the data to be fetched by monitoring the loading state
      const waitForData = () => {
        return new Promise<void>((resolve) => {
          const checkLoading = () => {
            if (!currentData.isLoading && !currentData.hasError) {
              resolve();
            } else {
              // Check again after a short delay
              setTimeout(checkLoading, 100);
            }
          };
          checkLoading();
        });
      };
      
      // Wait for data to be fetched (with a timeout)
      await Promise.race([
        waitForData(),
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
      ]);
      
    } catch (error) {
      console.error('Error during refresh:', error);
      toast.error('Could not refresh weather data');
    } finally {
      setRefreshing(false);
    }
  }, [currentData.isLoading, currentData.hasError]);

  // Show loading state while getting location or fetching data
  if (currentData.isLoading) {
    return (
      <DefaultBg>
        <View className="flex-1 justify-center items-center p-6">
          <LogoLoader message="Loading weather data" />
        </View>
      </DefaultBg>
    );
  }

  // Show error if any API failed
  if (currentData.hasError) {
    return (
      <DefaultBg>
        <View className="flex-1 justify-center items-center p-6">
          {/* Animated Error Icon */}
          <Animated.View
            style={{
              transform: [{ scale: 1.2 }],
              marginBottom: 24,
            }}
          >
            <View className="bg-red-500/20 rounded-full p-6 border border-red-400/30">
              <MaterialCommunityIcons
                name="weather-cloudy-alert"
                size={48}
                color="gray"
              />
            </View>
          </Animated.View>

          {/* Error Title */}
          <Text className="text-white text-2xl font-better-bold mb-2 text-center">
            Weather Unavailable
          </Text>

          {/* Error Message */}
          <Text className="text-gray-300 text-base font-better-regular text-center mb-8 leading-6">
            {currentData.errorMessage ||
              "Unable to fetch weather data. Please check your connection and try again."}
          </Text>

          {/* Action Buttons */}
          <View className="flex-row">
            <TouchableOpacity
              className="bg-emerald-500/80 px-6 py-3 mr-4 rounded-full border border-emerald-400/30"
              onPress={() => {
                // Refresh the data by clearing search and forcing re-render
                setSearchedLocation(null);
                // Force a re-render by updating state
                setIsSearchActive(false);
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-better-bold text-base">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weather Status */}
          <View className="mt-8 bg-white/10 rounded-2xl p-4 border border-white/20">
            <Text className="text-gray-300 text-sm text-center font-better-light">
              🌤️ Weather services are experiencing temporary issues
            </Text>
          </View>
        </View>
      </DefaultBg>
    );
  }

  // Fallbacks for missing data
  const city = searchedLocation
    ? searchedLocation.name
    : detailedLocation?.[0]?.subregion || "Your City";

  // Get current hour data from hourly forecast
  const getCurrentHourData = () => {
    if (
      currentData.isUsingLocalStation &&
      currentData.wxmv1HourlyForecastData?.forecast[0]?.hourly
    ) {
      const hourlyData = currentData.wxmv1HourlyForecastData.forecast[0].hourly;
      const currentUTC = new Date();
      const currentHour = currentUTC.getUTCHours();

      // Find the hourly data point that matches the current hour
      const currentHourData = hourlyData.find((h) => {
        const dataTime = new Date(h.timestamp);
        return dataTime.getUTCHours() === currentHour;
      });

      // If we found the current hour, use it; otherwise use the first available data
      return currentHourData || hourlyData[0] || null;
    }
    return null;
  };

  // Process weather data
  const weatherData = processWeatherData(
    currentData.isUsingLocalStation,
    currentData.weather || null,
    getCurrentHourData(),
    currentData.wxmv1DailyForecastData?.forecast[0].daily || null
  );

  // Process forecast data
  const hourly = processHourlyForecast(
    currentData.isUsingLocalStation,
    currentData.hourlyData || null,
    currentData.wxmv1HourlyForecastData || null,
    timeZoneId || undefined
  );
  const daily = processDailyForecast(
    currentData.isUsingLocalStation,
    currentData.wxmv1DailyForecastData?.forecast
      ? ({ forecast: currentData.wxmv1DailyForecastData.forecast } as any)
      : null,
    currentData.dailyData || null
  );

  // Get raw daily data for detail screen
  const getRawDailyData = () => {
    if (
      currentData.isUsingLocalStation &&
      currentData.wxmv1DailyForecastData?.forecast
    ) {
      return currentData.wxmv1DailyForecastData.forecast;
    } else if (currentData.dailyData?.forecastDays) {
      return currentData.dailyData.forecastDays;
    }
    return [];
  };

  const rawDailyData = getRawDailyData();

  const weatherIcon = currentData.weather?.weatherCondition?.iconBaseUri
    ? `${currentData.weather.weatherCondition.iconBaseUri}.png`
    : getWeatherXMIcon(currentData.weatherType);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* Top controls - fixed position */}
      <Animated.View
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          zIndex: 1000,
          opacity: isSearchActive ? 0 : 1,
        }}
      >
        <View className="flex-row justify-between items-center p-4">
          <WeatherSourceIndicator
            isUsingLocalStation={currentData.isUsingLocalStation}
            distance={undefined}
            cellId={currentData.userH3Index}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: 66,
          right: 16,
          zIndex: 1001,
          opacity: 1,
        }}
      >
        <SearchButton
          onLocationSelect={handleLocationSelect}
          onSearchToggle={handleSearchToggle}
        />
      </Animated.View>

      {/* Main scrollable content with background video */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: "black" }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
            colors={["white"]}
            progressBackgroundColor="rgba(255, 255, 255, 0.1)"
          />
        }
      >
        {/* Background video section */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: showAnimations ? 1 : 0,
            scale: showAnimations ? 1 : 0.95,
          }}
          transition={{ type: "timing", duration: 300, delay: 0 }}
          style={{ height: backgroundImageHeight, position: "relative" }}
        >
          {/* Only show video when search is not active and we have a source */}
          {!isSearchActive && player && backgroundVideoSource && (
            <>
              <VideoView
                key={`${searchedLocation?.name || "current"}-${
                  currentData.weatherType
                }`}
                player={player}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: backgroundImageHeight,
                }}
                contentFit="cover"
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={false}
              />

              {/* Light tint overlay for better content visibility */}
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  zIndex: 1,
                }}
              />

              {/* Blur Gradient Overlay */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,1)"]}
                locations={[0, 1]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: backgroundImageHeight * 0.4,
                  zIndex: 2,
                }}
              />
            </>
          )}
        </MotiView>

        {/* Main weather display over the video */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: backgroundImageHeight,
            opacity: isSearchActive ? 0 : 1,
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingTop: 80,
            zIndex: 3,
          }}
        >
          {/* Back Button - Only show when location is searched */}
          {searchedLocation && (
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{
                opacity: showAnimations ? 1 : 0,
                translateY: showAnimations ? 0 : -20,
              }}
              transition={{ type: "timing", duration: 600, delay: 200 }}
              style={{
                width: 80,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 0,
                marginTop: 40,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setSearchedLocation(null);
                }}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={16}
                  color="white"
                />
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontFamily: "Poppins-Medium",
                    marginLeft: 6,
                  }}
                >
                  Back
                </Text>
              </TouchableOpacity>
            </MotiView>
          )}

          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{
              opacity: showAnimations ? 1 : 0,
              translateY: showAnimations ? 0 : 30,
            }}
            transition={{ type: "timing", duration: 800, delay: 300 }}
          >
            <MainWeatherDisplay
              city={city}
              temp={weatherData.temp}
              description={weatherData.description}
              high={weatherData.high}
              low={weatherData.low}
              feelsLike={weatherData.feelsLike}
              isUsingLocalStation={currentData.isUsingLocalStation}
              mmForecastData={getCurrentHourData()}
              weatherIcon={weatherIcon}
              currentTimeZoneId={timeZoneId || ""}
            />
          </MotiView>
        </Animated.View>

        {/* Forecast content with black background */}
        <View style={{ backgroundColor: "black", padding: 16 }}>
          {/* Hourly Forecast */}
          <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
            <MotiView
              from={{ opacity: 0, translateY: 40 }}
              animate={{
                opacity: showAnimations ? 1 : 0,
                translateY: showAnimations ? 0 : 40,
              }}
              transition={{ type: "timing", duration: 700, delay: 500 }}
            >
              <GlassyCard style={{ marginBottom: 16 }}>
                <Text className="text-white text-xl font-better-semi-bold my-2">
                  Hourly Forecast
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 8 }}
                >
                  {hourly.map((h: any, idx: number) => (
                    <HourlyForecastItem
                      key={idx}
                      time={h.time}
                      temperature={
                        Math.round(
                          h.temperature?.degrees || h.temperature || 0
                        ).toString() || "--"
                      }
                      description={h.description}
                      icon={h.icon}
                      iconUri={h.iconUri}
                    />
                  ))}
                </ScrollView>
              </GlassyCard>
            </MotiView>
          </Animated.View>

          {/* Daily Forecast */}
          <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
            <MotiView
              from={{ opacity: 0, translateY: 40 }}
              animate={{
                opacity: showAnimations ? 1 : 0,
                translateY: showAnimations ? 0 : 40,
              }}
              transition={{ type: "timing", duration: 700, delay: 700 }}
            >
              <GlassyCard style={{ marginBottom: 16 }}>
                <Text className="text-white text-xl font-better-semi-bold my-2">
                  {currentData.isUsingLocalStation
                    ? "7 Day Forecast"
                    : "10 Day Forecast"}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                  {daily.map((d: any, idx: number) => (
                    <DailyForecastItem
                      key={idx}
                      day={d.day}
                      highTemp={d.highTemp}
                      lowTemp={d.lowTemp}
                      iconUri={d.iconUri}
                      icon={d.icon}
                      rawData={rawDailyData[idx]}
                      onPress={handleDailyForecastPress}
                    />
                  ))}
                </ScrollView>
              </GlassyCard>
            </MotiView>
          </Animated.View>

          {/* Current Conditions */}
          <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
            <MotiView
              from={{ opacity: 0, translateY: 40 }}
              animate={{
                opacity: showAnimations ? 1 : 0,
                translateY: showAnimations ? 0 : 40,
              }}
              transition={{ type: "timing", duration: 700, delay: 900 }}
            >
              <CurrentConditions
                windSpeed={weatherData.windSpeed}
                windDesc={weatherData.windDesc}
                humidity={weatherData.humidity}
                dewPoint={weatherData.dewPoint.toString()}
                uv={weatherData.uv}
                pressure={weatherData.pressure}
              />
            </MotiView>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Modal for selected day */}
      <Modal
        visible={!!selectedDayDetail}
        animationType="slide"
        onRequestClose={handleBackFromDetail}
      >
        <DailyDetailScreen
          selectedDay={selectedDayDetail}
          onBack={handleBackFromDetail}
          isUsingLocalStation={currentData.isUsingLocalStation}
        />
      </Modal>
    </View>
  );
}
