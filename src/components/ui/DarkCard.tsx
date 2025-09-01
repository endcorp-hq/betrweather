import React from 'react';
import { View, ViewStyle } from 'react-native';

interface DarkCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
  variant?: 'default' | 'opaque';
}

export function DarkCard({ 
  children, 
  style, 
  borderRadius = 16,
  variant = 'default'
}: DarkCardProps) {
  const isOpaque = variant === 'opaque';
  
  return (
    <View
      style={[
        {
          borderRadius,
          backgroundColor: isOpaque ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
} 