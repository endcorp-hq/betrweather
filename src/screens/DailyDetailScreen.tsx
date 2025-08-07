import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import GlassyCard from '../components/ui/GlassyCard';
import { getWeatherXMIcon, mapWXMV1IconToWeatherType } from '../utils/weatherUtils';

interface DailyDetailScreenProps {
  selectedDay: any;
  onBack: () => void;
  isUsingLocalStation: boolean;
}

export function DailyDetailScreen({ selectedDay, onBack, isUsingLocalStation }: DailyDetailScreenProps) {
  if (!selectedDay) return null;

  // Extract data based on the data source
  const getDayData = () => {
    if (isUsingLocalStation && selectedDay.daily) {
      // WXMV1 data structure
      // Create a timestamp for the middle of the day for day/night determination
      const dayTimestamp = new Date(selectedDay.date);
      dayTimestamp.setHours(12, 0, 0, 0); // Set to noon
      
      return {
        date: selectedDay.date,
        highTemp: selectedDay.daily.temperature_max ? `${Math.round(selectedDay.daily.temperature_max)}°` : "--",
        lowTemp: selectedDay.daily.temperature_min ? `${Math.round(selectedDay.daily.temperature_min)}°` : "--",
        icon: getWeatherXMIcon(mapWXMV1IconToWeatherType(selectedDay.daily.icon ?? "", dayTimestamp)),
        precipitation: selectedDay.daily.precipitation_probability ? `${Math.round(selectedDay.daily.precipitation_probability)}%` : "0%",
        humidity: selectedDay.daily.humidity ? `${Math.round(selectedDay.daily.humidity)}%` : "--",
        windSpeed: selectedDay.daily.wind_speed ? `${Math.round(selectedDay.daily.wind_speed)} mph` : "--",
        pressure: selectedDay.daily.pressure ? `${Math.round(selectedDay.daily.pressure)} mb` : "--",
        uvIndex: selectedDay.daily.uv_index ? `${Math.round(selectedDay.daily.uv_index)}` : "--",
      };
    } else {      
      // Create a timestamp for the middle of the day for day/night determination
      const dayTimestamp = new Date(selectedDay.displayDate?.year || new Date().getFullYear(), 
                                   (selectedDay.displayDate?.month || 1) - 1, 
                                   selectedDay.displayDate?.day || 1);
      dayTimestamp.setHours(12, 0, 0, 0); // Set to noon
      
      return {
        date: selectedDay.displayDate,
        highTemp: selectedDay.maxTemperature?.degrees ? `${Math.round(selectedDay.maxTemperature.degrees)}°` : "--",
        lowTemp: selectedDay.minTemperature?.degrees ? `${Math.round(selectedDay.minTemperature.degrees)}°` : "--",
        icon: getWeatherXMIcon(mapWXMV1IconToWeatherType("clear", dayTimestamp)), // Default to clear weather for Google API
        precipitation: selectedDay.daytimeForecast?.precipitationProbability ? `${Math.round(selectedDay.daytimeForecast.precipitationProbability)}%` : "0%",
        humidity: selectedDay.daytimeForecast?.relativeHumidity ? `${Math.round(selectedDay.daytimeForecast.relativeHumidity)}%` : "--",
        windSpeed: selectedDay.daytimeForecast?.wind?.speed?.value ? `${Math.round(selectedDay.daytimeForecast.wind.speed.value)} km/h` : "--",
        pressure: selectedDay.daytimeForecast?.airPressure?.meanSeaLevelMillibars ? `${Math.round(selectedDay.daytimeForecast.airPressure.meanSeaLevelMillibars)} mb` : "--",
        uvIndex: selectedDay.daytimeForecast?.uvIndex ? `${Math.round(selectedDay.daytimeForecast.uvIndex)}` : "--",
      };
    }
  };

  const dayData = getDayData();

  const formatDate = (dateInput: any) => {
    try {
      let date;
      
      if (isUsingLocalStation && selectedDay.daily) {
        // WXMV1 date format
        date = new Date(dateInput);
      } else {
        // Google API date format
        if (dateInput?.year && dateInput?.month && dateInput?.day) {
          date = new Date(dateInput.year, dateInput.month - 1, dateInput.day);
        } else {
          date = new Date(dateInput);
        }
      }
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "Invalid Date";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {/* Header - Fixed position with proper status bar handling */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: 50, // Increased for status bar
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'black',
        zIndex: 10,
      }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
          <Text style={{ 
            color: 'white', 
            fontSize: 16, 
            fontFamily: 'Poppins-Medium',
            marginLeft: 8,
          }}>
            Back
          </Text>
        </TouchableOpacity>
        
        <Text style={{ 
          color: 'white', 
          fontSize: 20, 
          fontFamily: 'Poppins-Bold',
          marginLeft: 20,
          flex: 1,
        }}>
          Daily Forecast
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1}}
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 100,
        }}
      >
        {/* Main Day Info */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
        >
          <GlassyCard style={{ marginBottom: 24 }}>
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ 
                color: 'white', 
                fontSize: 24, 
                fontFamily: 'Poppins-Bold',
                marginBottom: 8,
              }}>
                {formatDate(dayData.date)}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 48, marginRight: 16 }}>
                  {dayData.icon}
                </Text>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: 14, 
                      fontFamily: 'Poppins-Medium',
                      marginRight: 8,
                    }}>
                      High:
                    </Text>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 32, 
                      fontFamily: 'Poppins-Bold',
                    }}>
                      {dayData.highTemp}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: 14, 
                      fontFamily: 'Poppins-Medium',
                      marginRight: 8,
                    }}>
                      Low:
                    </Text>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: 18, 
                      fontFamily: 'Poppins-Medium',
                    }}>
                      {dayData.lowTemp}
                    </Text>
                  </View>
                </View>
              </View>
              
             
            </View>
          </GlassyCard>
        </MotiView>

        {/* Weather Details Grid */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {/* Precipitation */}
            <GlassyCard style={{ width: '48%', marginBottom: 16 }}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <MaterialCommunityIcons name="weather-rainy" size={24} color="rgba(255, 255, 255, 0.8)" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontFamily: 'Poppins-Bold',
                  marginTop: 8,
                }}>
                  {dayData.precipitation}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 12, 
                  fontFamily: 'Poppins-Regular',
                }}>
                  Precipitation
                </Text>
              </View>
            </GlassyCard>

            {/* Humidity */}
            <GlassyCard style={{ width: '48%', marginBottom: 16 }}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <MaterialCommunityIcons name="water-percent" size={24} color="rgba(255, 255, 255, 0.8)" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontFamily: 'Poppins-Bold',
                  marginTop: 8,
                }}>
                  {dayData.humidity}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 12, 
                  fontFamily: 'Poppins-Regular',
                }}>
                  Humidity
                </Text>
              </View>
            </GlassyCard>

            {/* Wind Speed */}
            <GlassyCard style={{ width: '48%', marginBottom: 16 }}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <MaterialCommunityIcons name="weather-windy" size={24} color="rgba(255, 255, 255, 0.8)" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontFamily: 'Poppins-Bold',
                  marginTop: 8,
                }}>
                  {dayData.windSpeed}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 12, 
                  fontFamily: 'Poppins-Regular',
                }}>
                  Wind Speed
                </Text>
              </View>
            </GlassyCard>

            {/* Pressure */}
            <GlassyCard style={{ width: '48%', marginBottom: 16 }}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <MaterialCommunityIcons name="gauge" size={24} color="rgba(255, 255, 255, 0.8)" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontFamily: 'Poppins-Bold',
                  marginTop: 8,
                }}>
                  {dayData.pressure}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 12, 
                  fontFamily: 'Poppins-Regular',
                }}>
                  Pressure
                </Text>
              </View>
            </GlassyCard>

            {/* UV Index */}
            <GlassyCard style={{ width: '48%', marginBottom: 16 }}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <MaterialCommunityIcons name="weather-sunny" size={24} color="rgba(255, 255, 255, 0.8)" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontFamily: 'Poppins-Bold',
                  marginTop: 8,
                }}>
                  {dayData.uvIndex}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: 12, 
                  fontFamily: 'Poppins-Regular',
                }}>
                  UV Index
                </Text>
              </View>
            </GlassyCard>
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
} 