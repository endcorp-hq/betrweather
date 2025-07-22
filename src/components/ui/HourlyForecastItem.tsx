import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { RefractiveBgCard } from './RefractiveBgCard';

interface HourlyForecastItemProps {
  time: string;
  temperature: string;
  description: string;
  icon?: string;
  iconUri?: string;
  precipitation?: string;
}

export function HourlyForecastItem({
  time,
  temperature,
  description,
  icon,
  iconUri,
  precipitation,
}: HourlyForecastItemProps) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const textWidth = useRef(0);
  const containerWidth = useRef(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    scrollAnim.setValue(0);

    const timer = setTimeout(() => {
      const scrollDistance = textWidth.current - containerWidth.current;
      if (scrollDistance > 0) {
        animationRef.current = Animated.loop(
          Animated.sequence([
            Animated.delay(1000),
            Animated.timing(scrollAnim, {
              toValue: -scrollDistance - 10, // add small buffer
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.delay(1000),
            Animated.timing(scrollAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ])
        );
        animationRef.current.start();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      animationRef.current?.stop();
    };
  }, [description]);

  return (
    <RefractiveBgCard
      style={{
        width: 110,
        height: 180,
        borderRadius: 16,
        padding: 6,
      }}
      borderRadius={16}
    >
      {/* Time */}
      <Text className="text-gray-300 text-sm font-better-light text-center mb-4">
        {time}
      </Text>

      {/* Weather Icon */}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 30, marginBottom: 2 }}>
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            className="w-8 h-8 mb-4"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-lg">{icon || '☀️'}</Text>
        )}
      </View>

      {/* Precipitation */}
      <Text className="text-gray-300 text-xs text-center font-better-light mb-3">
        {precipitation ?? ''}
      </Text>

      {/* Auto-scrolling Description */}
      <View
        style={{
          height: 16,
          overflow: 'hidden',
          width: '100%',
          marginBottom: 4,
        }}
        onLayout={(e) => {
          containerWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <Animated.View
          style={{
            transform: [{ translateX: scrollAnim }],
          }}
        >
          <Text
            className="text-gray-300 text-xs font-better-light"
            onLayout={(e) => {
              textWidth.current = e.nativeEvent.layout.width;
            }}
          >
            {description}
          </Text>
        </Animated.View>
      </View>

      {/* Temperature */}
      <Text className="text-white text-lg font-better-medium text-center">
        {temperature}°
      </Text>
    </RefractiveBgCard>
  );
}
