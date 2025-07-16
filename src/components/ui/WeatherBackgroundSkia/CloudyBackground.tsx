import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS } from 'react-native-reanimated';
import { randomCloudConfig, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const abstractCloudPaths = [
  'M60 80 Q80 60 120 80 Q140 60 180 90 Q200 120 170 130 Q160 150 120 140 Q80 150 60 130 Q30 120 40 100 Q50 90 60 80 Z',
  'M200 180 Q220 170 250 180 Q270 170 300 190 Q320 210 290 220 Q270 230 240 220 Q210 230 200 210 Q190 200 200 180 Z',
  'M320 60 Q330 55 350 65 Q360 60 375 70 Q380 80 370 90 Q360 100 340 95 Q325 100 320 90 Q315 80 320 60 Z',
  'M80 200 Q90 195 110 200 Q120 195 130 205 Q135 215 125 220 Q120 225 100 220 Q85 225 80 215 Q75 210 80 200 Z',
];

const AnimatedCloud = ({
  y,
  scale,
  speed,
  opacity,
  color,
  pathIndex,
  onEnd,
}: {
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  color: string;
  pathIndex: number;
  onEnd: () => void;
}) => {
  const cloudWidth = 300;
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

  const path = abstractCloudPaths[pathIndex % abstractCloudPaths.length];

  return (
    <Animated.View style={[{ position: 'absolute', width: cloudWidth * scale, height: 120 * scale, left: 0, top: 0 }, animatedStyle]} pointerEvents="none">
      <Canvas style={{ width: cloudWidth * scale, height: 120 * scale }} pointerEvents="none">
        <Group>
          <Path path={path} color={color} opacity={opacity} style="fill">
            <BlurMask blur={20} style="normal" />
          </Path>
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const CloudyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#4e54c8', '#8f94fb', '#cfd9ff'];
  const [clouds, setClouds] = useState(Array.from({ length: 7 }, (_, i) => randomCloudConfig({ id: i, pathCount: abstractCloudPaths.length })));
  const nextId = useRef(7);

  const handleCloudEnd = (id: number) => {
    setClouds((prev) => prev.filter((c) => c.id !== id).concat(randomCloudConfig({ id: nextId.current++, pathCount: abstractCloudPaths.length })));
  };

  return (
    <>
      {/* Sky gradient background */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
      </Canvas>
      {/* Animated clouds */}
      {clouds.map((cloud) => (
        <AnimatedCloud key={cloud.id} {...cloud} color="#ffffff" onEnd={() => handleCloudEnd(cloud.id)} />
      ))}
    </>
  );
};

export default CloudyBackground;
