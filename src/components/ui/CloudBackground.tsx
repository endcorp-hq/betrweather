// src/components/ui/CloudBackground.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, Dimensions, Text } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function generateClouds(count: number) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const top = Math.floor((SCREEN_HEIGHT / count) * i + Math.random() * 30);
    const size = Math.floor(40 + Math.random() * 40);
    const duration = 12000 + Math.random() * 8000;
    const delay = Math.random() * 8000;
    const leftStart = -size - Math.random() * 40;
    const leftEnd = SCREEN_WIDTH + Math.random() * 40;
    clouds.push({ top, size, duration, delay, leftStart, leftEnd });
  }
  return clouds;
}

function Cloud({ top, size, duration, delay, leftStart, leftEnd }: { top: number, size: number, duration: number, delay: number, leftStart: number, leftEnd: number }) {
  const left = useRef(new Animated.Value(leftStart)).current;

  useEffect(() => {
    const animate = () => {
      left.setValue(leftStart);
      Animated.timing(left, {
        toValue: leftEnd,
        duration,
        delay,
        useNativeDriver: false,
      }).start(() => animate());
    };
    animate();
  }, [left, leftStart, leftEnd, duration, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        left,
        zIndex: 0,
        opacity: 0.7,
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      <Text style={{ fontSize: size }}>{'☁️'}</Text>
    </Animated.View>
  );
}

const CLOUDS = generateClouds(10);

export function CloudBackground() {
  return (
    <View
      className="absolute top-0 left-0 bottom-0 z-0 bg-sky-blue h-full w-full"
      pointerEvents="none"
    >
      {CLOUDS.map((props, idx) => (
        <Cloud key={idx} {...props} />
      ))}
    </View>
  );
}