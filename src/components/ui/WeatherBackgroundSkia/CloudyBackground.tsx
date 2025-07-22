import React, { useRef, useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, Circle } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, withRepeat, withSequence } from 'react-native-reanimated';  

const { width, height } = Dimensions.get('window');

// Simple anime-style cloud shapes - solid, no fading
const createAnimeCloud = (baseX: number, baseY: number, scale: number) => {
  const circles = [
    { cx: baseX + 60 * scale, cy: baseY + 30 * scale, r: 40 * scale },
    { cx: baseX + 100 * scale, cy: baseY + 25 * scale, r: 50 * scale },
    { cx: baseX + 140 * scale, cy: baseY + 30 * scale, r: 40 * scale },
    { cx: baseX + 80 * scale, cy: baseY + 60 * scale, r: 35 * scale },
    { cx: baseX + 120 * scale, cy: baseY + 65 * scale, r: 38 * scale },
    { cx: baseX + 50 * scale, cy: baseY + 45 * scale, r: 25 * scale },
    { cx: baseX + 150 * scale, cy: baseY + 45 * scale, r: 25 * scale },
  ];
  return circles;
};

const createSmallAnimeCloud = (baseX: number, baseY: number, scale: number) => {
  const circles = [
    { cx: baseX + 40 * scale, cy: baseY + 25 * scale, r: 25 * scale },
    { cx: baseX + 70 * scale, cy: baseY + 20 * scale, r: 30 * scale },
    { cx: baseX + 100 * scale, cy: baseY + 25 * scale, r: 25 * scale },
    { cx: baseX + 55 * scale, cy: baseY + 50 * scale, r: 20 * scale },
    { cx: baseX + 85 * scale, cy: baseY + 55 * scale, r: 22 * scale },
  ];
  return circles;
};

const createLargeAnimeCloud = (baseX: number, baseY: number, scale: number) => {
  const circles = [
    { cx: baseX + 80 * scale, cy: baseY + 40 * scale, r: 55 * scale },
    { cx: baseX + 130 * scale, cy: baseY + 35 * scale, r: 65 * scale },
    { cx: baseX + 180 * scale, cy: baseY + 40 * scale, r: 55 * scale },
    { cx: baseX + 105 * scale, cy: baseY + 80 * scale, r: 45 * scale },
    { cx: baseX + 155 * scale, cy: baseY + 85 * scale, r: 48 * scale },
    { cx: baseX + 60 * scale, cy: baseY + 60 * scale, r: 35 * scale },
    { cx: baseX + 200 * scale, cy: baseY + 60 * scale, r: 35 * scale },
  ];
  return circles;
};

type CloudConfig = {
  id: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  pathIndex: number;
  cloudType?: 'small' | 'medium' | 'large';
  x: number; // Added x position
};

const AnimatedCloud = ({
  y, scale, speed, opacity, color, pathIndex, onEnd, cloudType = 'medium', x,
}: {
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  color: string;
  pathIndex: number;
  onEnd: () => void;
  cloudType?: 'small' | 'medium' | 'large';
  x: number;
}) => {
  const cloudWidth = cloudType === 'large' ? 450 : cloudType === 'medium' ? 350 : 250;
  const cloudHeight = cloudType === 'large' ? 180 : cloudType === 'medium' ? 140 : 100;
  const xOffset = useSharedValue(0);
  const yOffset = useSharedValue(0);

  React.useEffect(() => {
    // Subtle hovering movement
    yOffset.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: xOffset.value },
      { translateY: y + yOffset.value },
      { scale: scale },
    ],
    opacity: opacity,
  }));

  // Generate cloud circles based on type
  const getCloudCircles = () => {
    const baseX = 0;
    const baseY = 0;
    
    switch (cloudType) {
      case 'small':
        return createSmallAnimeCloud(baseX, baseY, 1);
      case 'large':
        return createLargeAnimeCloud(baseX, baseY, 1);
      default:
        return createAnimeCloud(baseX, baseY, 1);
    }
  };

  const cloudCircles = getCloudCircles();

  return (
    <Animated.View style={[{ position: 'absolute', width: cloudWidth * scale, height: cloudHeight * scale, left: x, top: 0 }, animatedStyle]} pointerEvents="none">
      <Canvas style={{ width: cloudWidth * scale, height: cloudHeight * scale }} pointerEvents="none">
        <Group>
          {cloudCircles.map((circle, index) => (
            <Circle
              key={index}
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              color={color}
              opacity={opacity}
            />
          ))}
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const CloudyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#87CEEB', '#B0E0E6', '#E0F6FF']; // Lighter, more cloudy sky
  const [clouds, setClouds] = useState<CloudConfig[]>(() => {
    // Create 3 clouds in a row covering full width
    return [
      {
        id: 0,
        y: height * 0.05, // Fixed Y position for all clouds
        scale: 1.2,
        speed: 30,
        opacity: 0.95,
        pathIndex: 0,
        cloudType: 'large',
        x: -50, // Left cloud, starts slightly off-screen
      },
      {
        id: 1,
        y: height * 0.05, // Same Y position
        scale: 1.0,
        speed: 30,
        opacity: 0.95,
        pathIndex: 0,
        cloudType: 'medium',
        x: width * 0.3, // Middle cloud
      },
      {
        id: 2,
        y: height * 0.05, // Same Y position
        scale: 0.9,
        speed: 30,
        opacity: 0.95,
        pathIndex: 0,
        cloudType: 'small',
        x: width * 0.65, // Right cloud
      }
    ];
  });
  const nextId = useRef(3);

  const handleCloudEnd = useCallback((id: number) => {
    const cloudTypes = ['small', 'medium', 'large'] as const;
    const cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
    
    setClouds((prev) => prev.filter((c) => c.id !== id).concat({
      id: nextId.current++,
      y: height * 0.05,
      scale: 0.8 + Math.random() * 0.4,
      speed: 30,
      opacity: 0.95,
      pathIndex: 0,
      cloudType,
      x: Math.random() * width,
    }));
  }, []);

  return (
    <>
      {/* Sky gradient background - only show if not transparent */}
      {!transparent && (
        <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        </Canvas>
      )}
      {/* Animated clouds */}
      {clouds.map((cloud) => (
        <AnimatedCloud 
          key={cloud.id} 
          {...cloud} 
          color="#e8f4fd" 
          onEnd={() => handleCloudEnd(cloud.id)}
          cloudType={cloud.cloudType || 'medium'}
          x={cloud.x} // Pass x prop
        />
      ))}
    </>
  );
};

export default CloudyBackground;
