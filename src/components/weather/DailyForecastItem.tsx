import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import {RefractiveBgCard} from '../ui/RefractiveBgCard';

interface DailyForecastItemProps {
  day: string;
  highTemp: string;
  lowTemp: string;
  icon?: string;
  iconUri?: string;
  rawData?: any; // Raw data for detail screen
  onPress?: (data: any) => void;
}

export function DailyForecastItem({
  day,
  highTemp,
  lowTemp,
  icon,
  iconUri,
  rawData,
  onPress,
}: DailyForecastItemProps) {

  return (
    <TouchableOpacity
      onPress={() => onPress?.(rawData)}
      activeOpacity={0.8}
    >
    <RefractiveBgCard
      style={{
        width: 160,
        height: 180,
        borderRadius: 16,
        padding: 6,
      }}
      borderRadius={16}
    >
      {/* Day */}
      <View className="mb-4">
        <Text className="text-gray-300 text-sm font-better-light text-center">
          {day.split(',')[0]}
        </Text>
        <Text className="text-gray-300 text-xs font-better-light text-center">
          {day.split(',')[1]?.trim() || ''}
        </Text>
      </View>

      {/* Weather Icon */}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 30, marginBottom: 2 }}>
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-8 h-8 mb-4"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-sm font-better-light mb-4 text-center text-white">{icon || "☀️"}</Text>
        )}
      </View>

      {/* High/Low Temperature */}
      <Text className="text-white text-lg font-better-medium text-center">
        {highTemp} / {lowTemp}
      </Text>
    </RefractiveBgCard>
    </TouchableOpacity>
  );
} 