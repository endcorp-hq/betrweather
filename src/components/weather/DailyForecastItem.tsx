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

  // Format day display
  const formatDayDisplay = (dayString: string) => {
    const parts = dayString.split(',');
    const dayName = parts[0]?.trim();
    const date = parts[1]?.trim();
    
    // Check if it's today
    const today = new Date();
    const todayString = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (dayName === todayString) {
      return { dayLabel: 'Today', date: date };
    }
    
    // Return short day name for other days
    const shortDay = dayName?.substring(0, 3).toLowerCase();
    return { dayLabel: shortDay, date: date };
  };

  // Format date to DD/MM
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // Parse the date string and format as DD/MM
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If parsing fails, try to extract month and day from the string
      const monthMatch = dateString.match(/(\w+)/);
      const dayMatch = dateString.match(/(\d+)/);
      
      if (monthMatch && dayMatch) {
        const month = monthMatch[1].substring(0, 3).toLowerCase();
        const day = dayMatch[1];
        
        // Convert month name to number
        const monthMap: { [key: string]: string } = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        
        const monthNum = monthMap[month] || '01';
        const dayNum = day.padStart(2, '0');
        return `${dayNum}/${monthNum}`;
      }
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${day}/${month}`;
    }
    
    return dateString;
  };

  const { dayLabel, date } = formatDayDisplay(day);
  const formattedDate = formatDate(date);

  return (
    <TouchableOpacity
      onPress={() => onPress?.(rawData)}
      activeOpacity={0.8}
    >
    <RefractiveBgCard
      style={{
        width: 86,
        height: 208,
        borderRadius: 12,
        padding: 0,
        margin: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      borderRadius={12}
    >
      {/* Day Label */}
      <Text className="text-gray-300 text-base font-better-medium text-center mb-2">
        {dayLabel}
      </Text>

      {/* Date */}
      <Text className="text-gray-300 text-sm font-better-light text-center mb-2">
        {formattedDate}
      </Text>

      {/* Weather Icon */}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 60, marginBottom: 0 }}>
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-29 h-29"
          />
        ) : (
          <Text className="text-3xl">{icon || "☀️"}</Text>
        )}
      </View>

      {/* High Temperature */}
      <Text className="text-white text-lg font-better-medium text-center mb-1">
        {highTemp}
      </Text>

      {/* Low Temperature */}
      <Text className="text-gray-300 text-base font-better-light text-center">
        {lowTemp}
      </Text>
    </RefractiveBgCard>
    </TouchableOpacity>
  );
} 