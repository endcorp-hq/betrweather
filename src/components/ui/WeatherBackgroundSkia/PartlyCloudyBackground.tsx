import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, BlurMask, Circle, RadialGradient } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS, withRepeat, withSequence } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const sunRadius = Math.min(width, height) * 0.13;
const sunCenter = { x: width * 0.68, y: height * 0.22 };

const rayCount = 10;
const rayLength = sunRadius * 1.3;
const rayWidth = 14;
const rayOpacity = 0.13;

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

type CloudConfig = {
  id: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  pathIndex: number;
  cloudType?: 'small' | 'medium' | 'large';
  x: number;
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
    
    return createAnimeCloud(baseX, baseY, 1);
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

const PartlyCloudyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#b3c6e0', '#e0eafc', '#fafdff'];
  const [clouds, setClouds] = useState<CloudConfig[]>(() => {
    // Create just one cloud at the top right
    return [
      {
        id: 0,
        y: height * 0.05,
        scale: 1.0,
        speed: 30,
        opacity: 0.95,
        pathIndex: 0,
        cloudType: 'medium',
        x: width * 0.6, // Position at top right
      }
    ];
  });
  const nextId = useRef(1);

  const handleCloudEnd = (id: number) => {
    setClouds((prev) => prev.filter((c) => c.id !== id).concat({
      id: nextId.current++,
      y: height * 0.05,
      scale: 0.8 + Math.random() * 0.4,
      speed: 30,
      opacity: 0.95,
      pathIndex: 0,
      cloudType: 'medium',
      x: width * 0.6,
    }));
  };

  // Sun rays as paths
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / rayCount;
    const x1 = sunCenter.x + Math.cos(angle) * (sunRadius + 6);
    const y1 = sunCenter.y + Math.sin(angle) * (sunRadius + 6);
    const x2 = sunCenter.x + Math.cos(angle) * (sunRadius + rayLength);
    const y2 = sunCenter.y + Math.sin(angle) * (sunRadius + rayLength);
    const perpAngle = angle + Math.PI / 2;
    const wx = Math.cos(perpAngle) * rayWidth;
    const wy = Math.sin(perpAngle) * rayWidth;
    const path = `M${x1 - wx / 2},${y1 - wy / 2} L${x2},${y2} L${x1 + wx / 2},${y1 + wy / 2} Z`;
    return (
      <Path
        key={i}
        path={path}
        color="#fff9c4"
        opacity={rayOpacity}
        style="fill"
      >
        <BlurMask blur={8} style="normal" />
      </Path>
    );
  });

  return (
    <>
      {/* Partly cloudy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
        {/* Sun rays */}
        <Group>{rays}</Group>
        {/* Sun core */}
        <Circle
          cx={sunCenter.x}
          cy={sunCenter.y}
          r={sunRadius}
        >
          <RadialGradient
            c={vec(sunCenter.x, sunCenter.y)}
            r={sunRadius}
            colors={["#fffde4", "#ffe29f", "#ffd70000"]}
          />
          <BlurMask blur={14} style="normal" />
        </Circle>
      </Canvas>
      {/* Single animated cloud */}
      {clouds.map((cloud) => (
        <AnimatedCloud 
          key={cloud.id} 
          {...cloud} 
          color="#e8f4fd" 
          onEnd={() => handleCloudEnd(cloud.id)}
          cloudType={cloud.cloudType || 'medium'}
          x={cloud.x}
        />
      ))}
    </>
  );
};

export default PartlyCloudyBackground; 