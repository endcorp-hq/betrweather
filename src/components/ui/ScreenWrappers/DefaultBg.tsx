// src/components/ui/ScreenWrapper.tsx
import React from "react";
import { View } from "react-native";

export function DefaultBg({ children }: { children: React.ReactNode }) {
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000000', 
    }}>
      <View style={{
        flex: 1,
        zIndex: 2,
        paddingHorizontal: 0,
      }}>
        {children}
      </View>
    </View>
  );
}
