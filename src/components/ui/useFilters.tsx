
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

// Usage: const { selected, FilterBar } = useFilters(["All", "Active", "Closed"]);
export function useFilters(filters: string[]) {
  const [selected, setSelected] = useState(filters[0]);

  const FilterBar = () => (
    <View className="flex-row w-full h-10 items-center justify-center space-x-2 my-3">
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter}
          className={`px-4 py-2 rounded-xl mr-4 border ${
            selected === filter ? "bg-white/90" : "bg-transparent border-white"
          }`}
          onPress={() => setSelected(filter)}
          activeOpacity={0.85}
        >
          <Text
            className={`font-better-regular ${
              selected === filter ? "text-black" : "text-white"
            }`}
          >
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return { selected, FilterBar };
}

