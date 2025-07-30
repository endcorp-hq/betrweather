import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GlassyCard from "../ui/GlassyCard";

interface CurrentConditionsProps {
  windSpeed: string;
  windDesc: string;
  humidity: string;
  dewPoint: string | number;
  uv: string;
  pressure: string;
}

export const CurrentConditions: React.FC<CurrentConditionsProps> = ({
  windSpeed,
  windDesc,
  humidity,
  dewPoint,
  uv,
  pressure,
}) => {
  return (
    <>
      <Text className="text-white text-xl font-better-semi-bold my-2">
        Current conditions
      </Text>
      <View className="flex-row flex-wrap justify-between mb-6">
        {/* Wind */}
        <GlassyCard
          style={{
            width: "48%",
            height: 150,
            marginBottom: 16,
          }}
        >
          <View className="flex flex-col justify-between items-start h-full">
            {/* Top Label */}
            <View className="flex-row items-center">
              <MaterialCommunityIcons 
                name="weather-windy" 
                size={24} 
                color="rgba(255, 255, 255, 0.8)" 
              />
              <Text className="text-gray-300 text-xs font-better-regular ml-2">
                Wind
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {windSpeed}
            </Text>
            
            {/* Bottom Label */}
            <Text className="text-gray-300 text-xs font-better-regular">
              {windDesc}
            </Text>
          </View>
        </GlassyCard>
        
        {/* Humidity */}
        <GlassyCard
          style={{
            width: "48%",
            height: 150,
            marginBottom: 16,
          }}
        >
          <View className="flex flex-col justify-between items-start h-full">
            {/* Top Label */}
            <View className="flex-row items-center">
              <MaterialCommunityIcons 
                name="water-percent" 
                size={24} 
                color="rgba(255, 255, 255, 0.8)" 
              />
              <Text className="text-gray-300 text-xs font-better-regular ml-2">
                Humidity
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {humidity}
            </Text>
            
            {/* Bottom Label */}
            <Text className="text-gray-300 text-xs font-better-regular">
              Dew point {typeof dewPoint === 'number' ? dewPoint.toFixed(1) : dewPoint}
            </Text>
          </View>
        </GlassyCard>
        
        {/* UV Index */}
        <GlassyCard
          style={{
            width: "48%",
            height: 150,
            marginBottom: 16,
          }}
        >
          <View className="flex flex-col justify-between items-start h-full">
            {/* Top Label */}
            <View className="flex-row items-center">
              <MaterialCommunityIcons 
                name="weather-sunny" 
                size={24} 
                color="rgba(255, 255, 255, 0.8)" 
              />
              <Text className="text-gray-300 text-xs font-better-regular ml-2">
                UV Index
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-[60px] font-better-bold text-center self-center">
              {uv}
            </Text>
        
          <View className="h-2" />
          </View>
        </GlassyCard>
        
        {/* Pressure */}
        <GlassyCard
          style={{
            width: "48%",
            height: 150,
            marginBottom: 16,
          }}
        >
          <View className="flex flex-col justify-between items-start h-full">
            {/* Top Label */}
            <View className="flex-row items-center">
              <MaterialCommunityIcons 
                name="gauge" 
                size={24} 
                color="rgba(255, 255, 255, 0.8)" 
              />
              <Text className="text-gray-300 text-xs font-better-regular ml-2">
                Pressure
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {pressure}
            </Text>
            
            {/* Bottom Label */}
            <Text className="text-gray-300 text-xs font-better-regular">
              mBar
            </Text>
          </View>
        </GlassyCard>
      </View>
    </>
  );
}; 