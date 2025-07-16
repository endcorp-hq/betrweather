// src/components/ui/ScreenWrapper.tsx
import React from "react";
import { View } from "react-native";

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: 10 }}>
      {children}
    </View>
  );
}
