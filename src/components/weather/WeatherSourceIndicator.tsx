import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { calculateDistance } from '../../utils/weatherUtils';

interface Station {
  lat: number;
  lon: number;
  name: string;
}

interface WeatherSourceIndicatorProps {
  source: string;
  distance?: number;
  cellId?: string | null;
  station?: Station | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
}

export function WeatherSourceIndicator({ 
  source, 
  distance, 
  cellId, 
  station,
  userLatitude,
  userLongitude
}: WeatherSourceIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);


  // Auto-hide after 3 seconds when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start(() => setIsExpanded(false));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const handlePress = () => {
    // Calculate distance if we have station data and user location
    if (station && userLatitude && userLongitude && !calculatedDistance) {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        station.lat,
        station.lon
      );
      setCalculatedDistance(distance);
    }

    if (isExpanded) {
      // Collapse animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => setIsExpanded(false));
    } else {
      // Expand animation
      setIsExpanded(true);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.03,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  // Determine the message to show
  const getMessage = () => {
    if (source?.includes("wxm station") && station && calculatedDistance) {
      return `Local WXM station ${calculatedDistance}km away`;
    } else if (source?.includes("wxm")) {
      return 'Hyper local data';
    } else {
      return 'Google Weather';
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
          <View className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30 p-2">
            {source?.includes("wxm") ? (
              <Image
                source={require('../../../assets/logo/betrCloud.png')}
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
          {getMessage()}
        </Text>
        {source?.includes("wxm") && cellId && (
          <Text className="text-gray-600 text-xs font-better-medium mt-1">
            Cell ID: {cellId}
          </Text>
        )}
        {station && (
          <Text className="text-gray-600 text-xs font-better-medium mt-1">
            Station: {station.name}
          </Text>
        )}
      </Animated.View>
    </>
  );
} 