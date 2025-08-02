import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WeatherSourceIndicatorProps {
  isUsingLocalStation: boolean;
  distance?: number;
  cellId?: string | null;
}

export function WeatherSourceIndicator({ isUsingLocalStation, distance, cellId }: WeatherSourceIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  // Auto-hide after 3 seconds when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setIsExpanded(false));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const handlePress = () => {
    if (isExpanded) {
      // Collapse animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsExpanded(false));
    } else {
      // Expand animation
      setIsExpanded(true);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.03,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30">
            {isUsingLocalStation ? (
              <Image
                source={require('../../../assets/wxmlogo.png')}
           className='w-full h-full'
           
              />
            ) : (
              <Text className="text-white text-xl font-better-bold">G</Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded text overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 14,
          left: 70,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          alignSelf: 'flex-start',
        }}
        className="bg-white/80 backdrop-blur-md rounded-lg px-3 py-2 border border-gray-200/50"
      >
        <Text className="text-black text-sm font-better-medium" numberOfLines={1}>
          {isUsingLocalStation 
            ? `Hyper local data by WeatherXM${distance ? ` (${distance.toFixed(1)}km)` : ''}`
            : 'Google Weather'
          }
        </Text>
        {isUsingLocalStation && cellId && (
          <Text className="text-gray-600 text-xs font-better-medium mt-1">
            Cell ID: {cellId}
          </Text>
        )}
      </Animated.View>
    </>
  );
} 