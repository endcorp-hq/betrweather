import React from 'react';
import { View, Text, Image } from 'react-native';
import { RefractiveBgCard } from './RefractiveBgCard';

interface DailyForecastItemProps {
  day: string;
  highTemp: string;
  lowTemp: string;
  description: string;
  icon?: string;
  iconUri?: string;
}

export function DailyForecastItem({
  day,
  highTemp,
  lowTemp,
  description,
  icon,
  iconUri,
}: DailyForecastItemProps) {
  return (
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
          <Text className="text-2xl mb-4">{icon || '☀️'}</Text>
        )}
      </View>

      {/* Description */}
      <Text className="text-gray-300 text-xs text-center font-better-light mb-4">
        {description}
      </Text>

      {/* High/Low Temperature */}
      <Text className="text-white text-lg font-better-medium text-center">
        {highTemp}° / {lowTemp}°
      </Text>
    </RefractiveBgCard>
  );
} 