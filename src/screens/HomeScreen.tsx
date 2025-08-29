import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { MotiView } from "moti";
import {
  WeatherSourceIndicator,
  SearchButton,
  HourlyForecastItem,
  DailyForecastItem,
  GlassyCard,
  LogoLoader,
  MainWeatherDisplay,
  CurrentConditions,
  DefaultBg,
} from "@/components";
import { useWeatherData } from "../hooks/useWeatherData";
import { useLocation } from "../hooks/useLocation";
import { getLocalTimeForTimezone, getBackgroundVideo } from "@/utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DailyDetailScreen } from "./DailyDetailScreen";
import { useFocusEffect } from "@react-navigation/native";
import { useToast, useTimeZone } from "@/contexts";

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
  const [backgroundVideoSource, setBackgroundVideoSource] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const { height: screenHeight } = Dimensions.get("window");
  const backgroundImageHeight = screenHeight * 0.7;

  const { toast } = useToast();
  const {
    latitude,
    longitude,
    detailedLocation,
    error: locationError,
    isLoading: locationLoading,
  } = useLocation();

  const { timeZoneId, loadingTimeZone } = useTimeZone(
    searchedLocation?.lat || latitude,
    searchedLocation?.lon || longitude,
    refreshCounter
  );

  // expo video player
  const player = useVideoPlayer(null, (player) => {
    player.loop = true;
    player.muted = true;
  });

  // pause/play video for performance
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - play video
      if (player && backgroundVideoSource) {
        try {
          player.play();
        } catch (error) {
          console.log("Error playing video:", error);
        }
      }

      return () => {
        // Screen is unfocused - pause video
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

  // Stabilize the parameters
  const stableLat = searchedLocation?.lat || latitude || 0;
  const stableLon = searchedLocation?.lon || longitude || 0;
  const stableTimeZone = timeZoneId || "";

  const {
    isLoading,
    hasError,
    errorMessage,
    currentWeather,
    currentWeatherSource,
    hourlyForecast,
    dailyForecast,
    userH3Index,
  } = useWeatherData(stableLat, stableLon, stableTimeZone, refreshCounter);

  const getBackgroundVideoSource = async (currentTimeZoneId: string) => {
    let isDay = false;
    try {
      const { time } = getLocalTimeForTimezone(currentTimeZoneId);
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
      console.error(
        "Error getting timezone info for searched location:",
        error
      );
      // Fallback to device time
      const deviceHours = new Date().getHours();
      isDay = deviceHours >= 6 && deviceHours < 18;
    }

    return getBackgroundVideo(currentWeatherSource, isDay);
  };

  const currentData = {
    hourlyForecastData: hourlyForecast,
    dailyForecastData: dailyForecast,
    weather: currentWeather,
    isLoading: isLoading,
    hasError: hasError,
    errorMessage: errorMessage,
    source: currentWeatherSource,
    userH3Index: userH3Index,
    description: currentWeather?.description,
  };

  // load video source into created player
  useEffect(() => {
    const updateBackgroundVideo = async () => {
      try {
        // Only update background when we have final data AND station detection is complete
        if (!currentData.isLoading && !currentData.hasError && timeZoneId) {
          const source = await getBackgroundVideoSource(timeZoneId || "");
          setBackgroundVideoSource(source);

          if (player && source) {
            player.replace(source);
            player.play();
          }
        }
      } catch (error) {
        console.error("Error getting background video source:", error);
        // Fallback to current time
        const deviceHours = new Date().getHours();
        const isDay = deviceHours >= 6 && deviceHours < 18;
        const fallbackSource = getBackgroundVideo(
          currentData.source || "",
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

    updateBackgroundVideo();
  }, [
    currentData.source,
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

  //onclick handlers
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
    if (refreshing) return; // Prevent multiple simultaneous refreshes

    setRefreshing(true);

    try {
      setRefreshCounter((prev) => prev + 1);

      // Wait for the data fetch
      const waitForData = () => {
        return new Promise<void>((resolve) => {
          const checkLoading = () => {
            if (!currentData.isLoading && !currentData.hasError) {
              resolve();
            } else {
              setTimeout(checkLoading, 100);
            }
          };
          checkLoading();
        });
      };

      await Promise.race([
        waitForData(),
        new Promise((resolve) => setTimeout(resolve, 10000)), // max 10 second timeout
      ]);
    } catch (error) {
      console.error("Error during refresh:", error);
      toast.error("Could not refresh weather data");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, currentData.isLoading, currentData.hasError]);

  //loading renderer
  if (currentData.isLoading || locationLoading || loadingTimeZone) {
    return (
      <DefaultBg>
        <View className="flex-1 justify-center items-center p-6">
          <LogoLoader message="Loading weather data" />
        </View>
      </DefaultBg>
    );
  }

  // // Error renderer
  if (currentData.hasError || locationError) {
    return (
      <DefaultBg>
        <View className="flex-1 justify-center items-center p-6">
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

  // Show main content when we have location data
  if (latitude && longitude) {
    return selectedDayDetail ? (
      <DailyDetailScreen
        onBack={handleBackFromDetail}
        selectedDay={selectedDayDetail}
        source={currentData.source || ""}
      />
    ) : (
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
              source={currentData.source || ""}
              distance={undefined}
              cellId={currentData.userH3Index}
              userLatitude={searchedLocation?.lat || latitude}
              userLongitude={searchedLocation?.lon || longitude}
              station={currentData.weather?.station || null}
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
                    currentData.weather?.icon
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
                city={
                  searchedLocation?.name ||
                  detailedLocation?.[0]?.subregion ||
                  "Your City"
                }
                temp={currentData.weather?.temp?.toString() || ""}
                description={currentData.weather?.description || ""}
                high={currentData.weather?.high?.toString() || ""}
                low={currentData.weather?.low?.toString() || ""}
                feelsLike={currentData.weather?.feelsLike?.toString() || ""}
                source={currentData.source || ""}
                weatherIcon={currentData.weather?.icon}
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
                    {currentData.hourlyForecastData?.map(
                      (h: any, idx: number) => (
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
                      )
                    )}
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
                    {currentData.source?.includes("wxm")
                      ? "7 Day Forecast"
                      : "10 Day Forecast"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {currentData.dailyForecastData?.map(
                      (d: any, idx: number) => (
                        <DailyForecastItem
                          key={idx}
                          day={d.day}
                          highTemp={d.highTemp}
                          lowTemp={d.lowTemp}
                          iconUri={d.iconUri}
                          icon={d.icon}
                          rawData={currentData?.dailyForecastData?.[idx]}
                          onPress={handleDailyForecastPress}
                        />
                      )
                    )}
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
                  windSpeed={currentData.weather?.windSpeed?.toString() || ""}
                  windDesc={
                    currentData.weather?.windDirection?.toString() || ""
                  }
                  humidity={currentData.weather?.humidity?.toString() || ""}
                  dewPoint={currentData.weather?.dewPoint?.toString() || ""}
                  uv={currentData.weather?.uvIndex?.toString() || ""}
                  pressure={currentData.weather?.pressure?.toString() || ""}
                  precipitationRate={
                    currentData.weather?.precipitationRate?.toString() || ""
                  }
                />
              </MotiView>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Fallback loading state
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: 16 }}>Loading...</Text>
    </View>
  );
}
