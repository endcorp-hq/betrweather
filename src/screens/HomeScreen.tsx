import React, { useState} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
} from "react-native";
import { WeatherBg } from "../components/ui/ScreenWrappers/WeatherBg";
import { WeatherSourceIndicator } from "../components/ui/WeatherSourceIndicator";
import { SearchButton } from "../components/ui/SearchButton";
import { HourlyForecastItem } from "../components/ui/HourlyForecastItem";
import { DailyForecastItem } from "../components/ui/DailyForecastItem";
import GlassyCard from "../components/ui/GlassyCard";
import { LogoLoader } from "../components/ui/LoadingSpinner";
import { MainWeatherDisplay } from "../components/weather/MainWeatherDisplay";
import { CurrentConditions } from "../components/weather/CurrentConditions";
import { useWeatherData } from "../utils/useWeatherData";
import { useSearchWeather } from "../utils/useSearchWeather";
import { 
  processWeatherData, 
  processHourlyForecast, 
  processDailyForecast,
  formatDate 
} from "../utils/weatherDataProcessor";
import { DailyForecast } from "../types/weather";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SearchedLocation {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export function HomeScreen() {
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);

  // Animation for fading content
  // const contentOpacity = useRef(new Animated.Value(1)).current;

  const {
    mmForecastData,
    weather,
    hourlyData,
    dailyData,
    results,
    nearestGoodStation,
    detailedLocation,
    isUsingLocalStation,
    isLoading,
    hasError,
    errorMessage,
  } = useWeatherData();

  // Search weather data
  const searchWeatherData = useSearchWeather(
    searchedLocation?.lat || null,
    searchedLocation?.lon || null
  );

  // Use search data if available, otherwise use current location data
  const currentData = searchedLocation ? searchWeatherData : {
    mmForecastData,
    weather,
    hourlyData,
    dailyData,
    results,
    nearestGoodStation,
    isUsingLocalStation,
    isLoading,
    hasError,
    errorMessage,
  };

  const handleLocationSelect = (location: SearchedLocation) => {
    setSearchedLocation(location);
    handleSearchToggle(false);
  };


  const handleSearchToggle = (isExpanded: boolean) => {
    setIsSearchActive(isExpanded);
    //TODO: Add animation to fade content back in (this currently doesn't work)
    // Animate content fade
    // Animated.timing(contentOpacity, {
    //   toValue: isExpanded ? 0 : 1,
    //   duration: 300,
    //   useNativeDriver: true,
    // }).start();
  };

  // Show loading state while getting location or fetching data
  if (currentData.isLoading) {
      return (
      <WeatherBg>
        <View className="flex-1 justify-center items-center p-6">
          <LogoLoader message="Loading weather data" />
        </View>
      </WeatherBg>
    );
  }

  // Show error if any API failed
  if (currentData.hasError) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-red-500 text-xl font-better-bold mb-4">
          Error
        </Text>
        <Text className="text-white text-base text-center">{currentData.errorMessage}</Text>
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
  const city = searchedLocation ? searchedLocation.name : (detailedLocation?.[0]?.subregion || "Your City");

  // Process weather data
  const weatherData = processWeatherData(
    currentData.isUsingLocalStation, 
    currentData.mmForecastData || null, 
    currentData.weather || null, 
    currentData.results
  );
  
  // Process forecast data
  const hourly = processHourlyForecast(
    currentData.isUsingLocalStation, 
    currentData.mmForecastData || null, 
    currentData.hourlyData || null, 
    currentData.results
  );
  const daily = processDailyForecast(
    currentData.isUsingLocalStation, 
    currentData.mmForecastData || null, 
    currentData.dailyData || null
  );

  const weatherIcon = currentData.weather?.weatherCondition?.iconBaseUri
    ? `${currentData.weather.weatherCondition.iconBaseUri}.png`
    : undefined;

  return (
    <WeatherBg>
      <Animated.View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        opacity: isSearchActive ? 0 : 1, // Hide when search is active, show when content is visible
      }}>
        <View className="flex-row justify-between items-center p-4">
          <WeatherSourceIndicator
            isUsingLocalStation={currentData.isUsingLocalStation}
            distance={currentData.nearestGoodStation?.distance}
          />
        </View>
      </Animated.View>

      <Animated.View style={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 1001,
        opacity: 1, // Always visible
      }}>
        <SearchButton 
          onLocationSelect={handleLocationSelect}
          onSearchToggle={handleSearchToggle}
        />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="bg-transparent"
        contentContainerStyle={{ padding: 16, paddingBottom: 100, paddingTop: 80 }}
      >
         {/* Back Button - Only show when location is searched */}
         {searchedLocation && (
          <Animated.View 
            style={{
              opacity: isSearchActive ? 0 : 1,
              width: 80,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setSearchedLocation(null);
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                marginTop: 8,
                marginBottom: 16,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color="white" />
              <Text style={{ 
                color: 'white', 
                fontSize: 14, 
                fontFamily: 'Poppins-Medium',
                marginLeft: 6,
              }}>
                Back
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {/* Main Weather Display */}
        <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
          <MainWeatherDisplay
            city={city}
            temp={weatherData.temp}
            description={weatherData.description}
            high={weatherData.high}
            low={weatherData.low}
            feelsLike={weatherData.feelsLike}
            isUsingLocalStation={currentData.isUsingLocalStation}
            mmForecastData={currentData.mmForecastData}
            weatherIcon={weatherIcon}
          />
        </Animated.View>

        {/* Hourly Forecast */}
        <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
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
              {hourly.map((h: any, idx: number) => (
                <HourlyForecastItem
                  key={idx}
                  time={h.time}
                  temperature={h.temperature}
                  description={h.description}
                  icon={h.icon}
                  iconUri={h.iconUri}
                />
              ))}
            </ScrollView>
          </GlassyCard>
        </Animated.View>

        {/* Daily Forecast */}
        <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
          <GlassyCard style={{ marginTop: 16, marginBottom: 16 }}>
            <Text className="text-white text-xl font-better-semi-bold my-2">
              {currentData.isUsingLocalStation ? "7 Day Forecast" : "10 Day Forecast"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {daily.map((d: any, idx: number) => (
                <DailyForecastItem
                  key={idx}
                  day={currentData.isUsingLocalStation ? String(d.day) : formatDate(d.displayDate)}
                  highTemp={currentData.isUsingLocalStation ? String(d.highTemp) : String(d.maxTemperature?.degrees ?? "--")}
                  lowTemp={currentData.isUsingLocalStation ? String(d.lowTemp) : String(d.minTemperature?.degrees ?? "--")}
                  description={currentData.isUsingLocalStation ? String(d.description) : String(d.daytimeForecast?.weatherCondition?.description?.text ?? "Clear")}
                  iconUri={currentData.isUsingLocalStation ? undefined : d.daytimeForecast?.weatherCondition?.iconBaseUri ? `${d.daytimeForecast.weatherCondition.iconBaseUri}.png` : undefined}
                  icon={currentData.isUsingLocalStation ? String(d.icon) : (d.daytimeForecast?.weatherCondition?.iconBaseUri ? undefined : "☀️")}
                />
              ))}
            </ScrollView>
          </GlassyCard>
        </Animated.View>

        {/* Current Conditions */}
        <Animated.View style={{ opacity: isSearchActive ? 0 : 1 }}>
          <CurrentConditions
            windSpeed={weatherData.windSpeed}
            windDesc={weatherData.windDesc}
            humidity={weatherData.humidity}
            dewPoint={weatherData.dewPoint.toString()}
            uv={weatherData.uv}
            pressure={weatherData.pressure}
          />
        </Animated.View>
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
