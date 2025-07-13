// src/components/ui/ScreenWrapper.tsx
import React from "react";
import { View } from "react-native";

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 px-4">
      {children}
    </View>
  );
}
