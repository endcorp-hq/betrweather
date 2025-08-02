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
          <View className="flex flex-col justify-between items-center h-full py-4">
            {/* Icon at top */}
            <MaterialCommunityIcons 
              name="weather-windy" 
              size={32} 
              color="rgba(255, 255, 255, 0.9)" 
            />
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center py-2">
              {windSpeed}
            </Text>
            
            {/* Bottom Labels */}
            <View className="items-center">
              <Text className="text-gray-300 text-xs font-better-medium text-center mb-1">
                Wind
              </Text>
              <Text className="text-gray-400 text-xs font-better-regular text-center">
                {windDesc}
              </Text>
            </View>
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
          <View className="flex flex-col justify-between items-center h-full py-4">
            {/* Icon at top */}
            <MaterialCommunityIcons 
              name="water-percent" 
              size={32} 
              color="rgba(255, 255, 255, 0.9)" 
            />
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center py-2">
              {humidity}
            </Text>
            
            {/* Bottom Labels */}
            <View className="items-center">
              <Text className="text-gray-300 text-xs font-better-medium text-center mb-1">
                Humidity
              </Text>
              <Text className="text-gray-400 text-xs font-better-regular text-center">
                Dew {typeof dewPoint === 'number' ? dewPoint.toFixed(1) : dewPoint}°
              </Text>
            </View>
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
          <View className="flex flex-col justify-between items-center h-full py-4">
            {/* Icon at top */}
            <MaterialCommunityIcons 
              name="weather-sunny" 
              size={32} 
              color="rgba(255, 255, 255, 0.9)" 
            />
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center py-2">
              {uv}
            </Text>
            
            {/* Bottom Labels */}
            <View className="items-center">
              <Text className="text-gray-300 text-xs font-better-medium text-center mb-1">
                UV Index
              </Text>
              <Text className="text-gray-400 text-xs font-better-regular text-center">
                Sun exposure
              </Text>
            </View>
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
          <View className="flex flex-col justify-between items-center h-full py-4">
            {/* Icon at top */}
            <MaterialCommunityIcons 
              name="gauge" 
              size={32} 
              color="rgba(255, 255, 255, 0.9)" 
            />
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center py-2">
              {pressure}
            </Text>
            
            {/* Bottom Labels */}
            <View className="items-center">
              <Text className="text-gray-300 text-xs font-better-medium text-center mb-1">
                Pressure
              </Text>
              <Text className="text-gray-400 text-xs font-better-regular text-center">
                mBar
              </Text>
            </View>
          </View>
        </GlassyCard>
      </View>
    </>
  );
}; 