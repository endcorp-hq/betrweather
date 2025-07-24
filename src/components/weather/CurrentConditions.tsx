import React from "react";
import { View, Text } from "react-native";
import GlassyCard from "../ui/GlassyCard";
import { fallbackIcons } from "../../utils/weatherDataProcessor";

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
          <View className=" flex flex-col justify-between items-start h-full">
            {/* Top Label */}
            <View className="flex-row items-center ">
              <Text className="text-xl mr-1">{fallbackIcons.wind}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Wind
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {Number(windSpeed).toFixed(1)} km/h
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
              <Text className="text-xl mr-1">{fallbackIcons.humidity}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Humidity
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {Number(humidity).toFixed(1)}%
            </Text>
            
            {/* Bottom Label */}
            <Text className="text-gray-300 text-xs font-better-regular">
              Dew point {typeof dewPoint === 'number' ? dewPoint.toFixed(1) : dewPoint}°
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
              <Text className="text-xl mr-1">{fallbackIcons.uv}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
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
              <Text className="text-xl mr-1">{fallbackIcons.pressure}</Text>
              <Text className="text-gray-300 text-xs font-better-regular">
                Pressure
              </Text>
            </View>
            
            {/* Center Value */}
            <Text className="text-white text-3xl font-better-bold text-center">
              {Number(pressure).toFixed(1)}
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