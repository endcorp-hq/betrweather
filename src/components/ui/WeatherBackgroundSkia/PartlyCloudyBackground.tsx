import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, BlurMask, Circle, RadialGradient } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const sunRadius = Math.min(width, height) * 0.13;
const sunCenter = { x: width * 0.68, y: height * 0.22 };

const rayCount = 10;
const rayLength = sunRadius * 1.3;
const rayWidth = 14;
const rayOpacity = 0.13;

const cloudPaths = [
  'M60 80 Q80 60 120 80 Q140 60 180 90 Q200 120 170 130 Q160 150 120 140 Q80 150 60 130 Q30 120 40 100 Q50 90 60 80 Z',
  'M200 180 Q220 170 250 180 Q270 170 300 190 Q320 210 290 220 Q270 230 240 220 Q210 230 200 210 Q190 200 200 180 Z',
];

const randomCloudConfig = (id: number) => {
  const y = height * (0.13 + 0.3 * Math.random());
  const scale = 0.7 + Math.random() * 0.7;
  const speed = 12 + Math.random() * 8;
  const opacity = 0.18 + Math.random() * 0.18;
  const pathIndex = Math.floor(Math.random() * cloudPaths.length);
  return { id, y, scale, speed, opacity, pathIndex };
};

const AnimatedCloud = ({
  y, scale, speed, opacity, color, pathIndex, onEnd,
}: {
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  color: string;
  pathIndex: number;
  onEnd: () => void;
}) => {
  const cloudWidth = 180;
  const startX = -cloudWidth * scale;
  const endX = width + cloudWidth * scale;
  const x = useSharedValue(startX);

  React.useEffect(() => {
    x.value = withTiming(
      endX,
      { duration: speed * 1000, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onEnd)();
      }
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y },
      { scale: scale },
    ],
    opacity: opacity,
  }));

  const path = cloudPaths[pathIndex % cloudPaths.length];

  return (
    <Animated.View style={[{ position: 'absolute', width: cloudWidth * scale, height: 80 * scale, left: 0, top: 0 }, animatedStyle]} pointerEvents="none">
      <Canvas style={{ width: cloudWidth * scale, height: 80 * scale }} pointerEvents="none">
        <Group>
          <Path path={path} color={color} opacity={opacity} style="fill">
            <BlurMask blur={14} style="normal" />
          </Path>
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const PartlyCloudyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#b3c6e0', '#e0eafc', '#fafdff'];
  const [clouds, setClouds] = useState(Array.from({ length: 2 }, (_, i) => randomCloudConfig(i)));
  const nextId = useRef(2);

  const handleCloudEnd = (id: number) => {
    setClouds((prev) => prev.filter((c) => c.id !== id).concat(randomCloudConfig(nextId.current++)));
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
      {/* Sky gradient background */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
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
      {/* Animated clouds */}
      {clouds.map((cloud) => (
        <AnimatedCloud key={cloud.id} {...cloud} color="#ffffff" onEnd={() => handleCloudEnd(cloud.id)} />
      ))}
    </>
  );
};

export default PartlyCloudyBackground; 