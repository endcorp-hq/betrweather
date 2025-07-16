import React, { useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, withRepeat, useDerivedValue, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Abstract, Figma-inspired cloud SVG paths (handcrafted for now)
const abstractCloudPaths = [
  // Large, blobby cloud
  'M60 80 Q80 60 120 80 Q140 60 180 90 Q200 120 170 130 Q160 150 120 140 Q80 150 60 130 Q30 120 40 100 Q50 90 60 80 Z',
  // Medium, layered cloud
  'M200 180 Q220 170 250 180 Q270 170 300 190 Q320 210 290 220 Q270 230 240 220 Q210 230 200 210 Q190 200 200 180 Z',
  // Small, puffy cloud
  'M320 60 Q330 55 350 65 Q360 60 375 70 Q380 80 370 90 Q360 100 340 95 Q325 100 320 90 Q315 80 320 60 Z',
  // Extra small, accent cloud
  'M80 200 Q90 195 110 200 Q120 195 130 205 Q135 215 125 220 Q120 225 100 220 Q85 225 80 215 Q75 210 80 200 Z',
];

// Helper to generate a random cloud config
function randomCloudConfig(id: number) {
  const y = height * (0.1 + 0.8 * Math.random());
  const scale = 0.8 + Math.random() * 1.2;
  const speed = (Math.random() * 3); // much slower speeds
  const opacity = 0.5 + Math.random() * 0.4;
  const pathIndex = Math.floor(Math.random() * abstractCloudPaths.length);
  // Ensure clouds spawn fully off-screen to the left
  return { id, y, scale, speed, opacity, pathIndex };
}

const INITIAL_CLOUDS = 5;

function AnimatedCloud({ y, scale, speed, opacity, color, pathIndex, onEnd }: any) {
  const cloudWidth = 300; // Estimate or measure your widest cloud path
  const startX = -cloudWidth * scale - Math.random() * 100; // Always off-screen
  const endX = width + cloudWidth * scale;
  const x = useSharedValue(startX);
  const finished = useRef(false);

  useEffect(() => {
    finished.current = false;
    x.value = withTiming(
      endX,
      { duration: 18000 / speed },
      (isFinished) => {
        if (isFinished && !finished.current) {
          finished.current = true;
          if (onEnd) {
            runOnJS(onEnd)();
          }
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, startX, endX, speed, pathIndex]);

  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y },
    { scale: scale },
  ], [x, y, scale, pathIndex]);

  const path = abstractCloudPaths[pathIndex % abstractCloudPaths.length];
  return (
    <Group transform={transform}>
      <Path
        path={path}
        color={color}
        opacity={opacity}
        style="fill"
      />
    </Group>
  );
}

const CloudyBackground = ({ theme }: { theme: any }) => {
  // Dark, premium sky gradient
  const skyGradient = ['#101624', '#1a2236', '#232b3e'];
  const [clouds, setClouds] = useState(() =>
    Array.from({ length: INITIAL_CLOUDS }, (_, i) => randomCloudConfig(i))
  );
  const nextId = useRef(INITIAL_CLOUDS);

  // Handler to respawn a cloud
  const handleCloudEnd = (id: number) => {
    setClouds((prev) => {
      // Remove the finished cloud and add a new one
      const filtered = prev.filter((c) => c.id !== id);
      return [...filtered, randomCloudConfig(nextId.current++)];
    });
  };

  return (
    <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
      {/* Sky gradient */}
      <Path
        path={`M0 0 H${width} V${height} H0 Z`}
        style="fill"
      >
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={skyGradient}
        />
      </Path>
      {/* Animated clouds */}
      {clouds.map((cloud) => (
        <AnimatedCloud
          key={cloud.id}
          {...cloud}
          color={'white'}
          onEnd={() => handleCloudEnd(cloud.id)}
        />
      ))}
    </Canvas>
  );
};

export default CloudyBackground; 