import React from 'react';
import { View, ViewStyle } from 'react-native';

interface RefractiveBgCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  borderRadius?: number;
  variant?: 'default' | 'opaque';
}

export function RefractiveBgCard({ 
  children, 
  style, 
  intensity = 0.3, 
  borderRadius = 24,
  variant = 'default'
}: RefractiveBgCardProps) {
  const isOpaque = variant === 'opaque';
  
  return (
    <View
      style={[
        {
          borderRadius,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: isOpaque ? 8 : 16,
          },
          shadowOpacity: isOpaque ? 0.2 : 0.3,
          shadowRadius: isOpaque ? 8 : 16,
          elevation: isOpaque ? 6 : 100,
          alignSelf: 'center',
          overflow: 'hidden',
          height: style?.height || 200,
          width: style?.width || 'auto',
        },
        style,
      ]}
    >
      {/* Main glass container */}
      <View
        style={{
          borderRadius,
          overflow: 'hidden',
          backgroundColor: isOpaque ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.35)',
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          height: '100%',
          width: '100%',
        }}
      >
        {/* Consistent edge highlights - all same width and properly aligned */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1,
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 1,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 1,
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 1,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 1,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 1,
            zIndex: 2,
          }}
        />
        
        {/* Content container */}
        <View
          style={{
            position: 'relative',
            zIndex: 3,
            padding: 24,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
} 