
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

// Usage: const { selected, FilterBar } = useFilters(["All", "Active", "Closed"]);
export function useFilters(options: string[]) {
  const [selected, setSelected] = useState(options[0]);

  const FilterBar = () => (
    <View className="flex-row mb-6">
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => setSelected(option)}
          className="flex-1 py-3"
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-better-semi-bold text-sm uppercase ${
              selected === option
                ? 'text-white'
                : 'text-gray-400'
            }`}
          >
            {option === 'hourly' ? 'HOURLY' : 
             option === 'daily' ? 'DAILY' : 
             option === 'weekly' ? 'WEEKLY' : 
             option === 'monthly' ? 'MONTHLY' : 
             option === 'long-term' || option === 'longterm' ? 'LONG-TERM' : option}
          </Text>
          {selected === option && (
            <View className="h-0.5 bg-white mt-2" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return { selected, setSelected, FilterBar };
}

