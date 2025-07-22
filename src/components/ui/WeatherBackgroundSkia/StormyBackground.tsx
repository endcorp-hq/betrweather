import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS } from 'react-native-reanimated';
import { randomCloudConfig, randomRainDrop, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const stormCloudPaths = [
  'M60 80 Q80 60 120 80 Q140 60 180 90 Q200 120 170 130 Q160 150 120 140 Q80 150 60 130 Q30 120 40 100 Q50 90 60 80 Z',
  'M200 180 Q220 170 250 180 Q270 170 300 190 Q320 210 290 220 Q270 230 240 220 Q210 230 200 210 Q190 200 200 180 Z',
  'M320 60 Q330 55 350 65 Q360 60 375 70 Q380 80 370 90 Q360 100 340 95 Q325 100 320 90 Q315 80 320 60 Z',
  'M80 200 Q90 195 110 200 Q120 195 130 205 Q135 215 125 220 Q120 225 100 220 Q85 225 80 215 Q75 210 80 200 Z',
];

const AnimatedStormCloud = ({
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
  const cloudWidth = 320;
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

  const path = stormCloudPaths[pathIndex % stormCloudPaths.length];

  return (
    <Animated.View style={[{ position: 'absolute', width: cloudWidth * scale, height: 130 * scale, left: 0, top: 0 }, animatedStyle]} pointerEvents="none">
      <Canvas style={{ width: cloudWidth * scale, height: 130 * scale }} pointerEvents="none">
        <Group>
          <Path path={path} color={color} opacity={opacity} style="fill">
            <BlurMask blur={24} style="normal" />
          </Path>
        </Group>
      </Canvas>
    </Animated.View>
  );
};

// Improved lightning bolt with more realistic zigzag pattern
function LightningBolt({ x, y, scale = 1, opacity = 1 }: { x: number; y: number; scale?: number; opacity?: number }) {
  // More realistic lightning bolt path with multiple branches
  const boltHeight = 50 * scale;
  const segments = 5;
  const segmentHeight = boltHeight / segments;
  
  // Create a deterministic zigzag pattern based on position
  const zigzagPattern = [];
  for (let i = 0; i < segments; i++) {
    const seed = Math.abs((x + y + i) % 100);
    zigzagPattern.push(((seed - 50) / 50) * 20 * scale);
  }
  
  let path = `M${x} ${y}`;
  let currentX = x;
  
  for (let i = 1; i <= segments; i++) {
    const segmentY = y + (i * segmentHeight);
    const zigzag = zigzagPattern[i - 1] || 0;
    currentX = x + zigzag;
    path += ` L${currentX} ${segmentY}`;
  }
  
  // Ensure path is valid
  if (!path || path.length < 10) {
    path = `M${x} ${y} L${x} ${y + boltHeight}`;
  }
  
  return (
    <Group>
      {/* Main lightning bolt */}
      <Path
        path={path}
        color="#ffffff"
        opacity={opacity}
        style="stroke"
        strokeWidth={4 * scale}
      >
        <BlurMask blur={1 * scale} style="normal" />
      </Path>
      {/* Brighter core */}
      <Path
        path={path}
        color="#fffbe6"
        opacity={opacity * 1.5}
        style="stroke"
        strokeWidth={2 * scale}
      >
        <BlurMask blur={0.5 * scale} style="normal" />
      </Path>
      {/* Glow effect */}
      <Path
        path={path}
        color="#fff9c4"
        opacity={opacity * 0.15}
        style="stroke"
        strokeWidth={8 * scale}
      >
        <BlurMask blur={6 * scale} style="normal" />
      </Path>
    </Group>
  );
}

// Improved rain effect with better drops
const RAIN_DROP_COUNT = 80;
const RAIN_LENGTH = 20;
const RAIN_WIDTH = 0.8;
const RAIN_COLOR = '#ffffff';
const RAIN_BLUR = 0;

const StormyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#23243a', '#3a3a5a', '#4e4376', '#232526'];
  const [clouds, setClouds] = useState(Array.from({ length: 4 }, (_, i) => randomCloudConfig({ id: i, yRange: [0.15, 0.75], scaleRange: [1.1, 2.3], speedRange: [12, 20], opacityRange: [0.35, 0.65], pathCount: stormCloudPaths.length })));
  const nextId = useRef(4);

  // Lightning state with multiple bolts
  const [lightning, setLightning] = useState<{ x: number; y: number; scale: number; key: number; duration: number }[]>([]);
  const lightningKey = useRef(0);

  // Rain state with better positioning
  const [drops, setDrops] = useState(() => Array.from({ length: RAIN_DROP_COUNT }, (_, i) => randomRainDrop({ 
    id: i, 
    speedRange: [400, 700],
    lengthRange: [15, 25],
    opacityRange: [0.4, 0.8],
    width, 
    height 
  })));

  // Stable rain update function
  const updateRain = useCallback((dt: number) => {
    setDrops((prev) =>
      prev.map((drop) => {
        let newY = drop.y + drop.speed * dt;
        if (newY > height + drop.length) {
          // Reset to top with deterministic offset
          const offset = (drop.id * 17) % 30; // Deterministic offset
          const xVariation = ((drop.id * 13) % 30) - 15; // Deterministic X variation
          return {
            ...drop,
            y: -drop.length - offset,
            x: drop.x + xVariation
          };
        }
        return { ...drop, y: newY };
      })
    );
  }, [height]);

  useAnimationFrame(updateRain);

  // Improved lightning logic - only in top half, more frequent and pronounced
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const trigger = () => {
      // Position lightning only in top half of screen
      const x = 60 + (Date.now() % (width - 120));
      const y = 40 + (Date.now() % (height * 0.4));
      const scale = 1.2 + ((Date.now() % 100) / 100) * 1.8;
      const duration = 200 + (Date.now() % 300);
      
      setLightning((prev) => [...prev, { x, y, scale, key: lightningKey.current++, duration }]);
      
      // Remove lightning after duration
      setTimeout(() => {
        setLightning((prev) => prev.filter(l => l.key !== lightningKey.current - 1));
      }, duration);
      
      // Trigger next lightning
      timeoutId = setTimeout(trigger, 2000 + (Date.now() % 4000));
    };
    
    // Initial delay
    timeoutId = setTimeout(trigger, 1000 + (Date.now() % 2000));
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [width, height]);

  const handleCloudEnd = (id: number) => {
    setClouds((prev) => prev.filter((c) => c.id !== id).concat(randomCloudConfig({ id: nextId.current++, yRange: [0.15, 0.75], scaleRange: [1.1, 2.3], speedRange: [12, 20], opacityRange: [0.35, 0.65], pathCount: stormCloudPaths.length })));
  };

  return (
    <>
      {/* Stormy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
        {/* Lightning bolts */}
        <Group>
          {lightning.map((l) => (
            <LightningBolt key={l.key} x={l.x} y={l.y} scale={l.scale} opacity={1.0} />
          ))}
        </Group>
        {/* Improved rain drops */}
        <Group>
          {drops.map((drop) => {
            // Ensure drop coordinates are valid numbers
            const startX = typeof drop.x === 'number' ? drop.x : 0;
            const startY = typeof drop.y === 'number' ? drop.y : 0;
            const endY = typeof drop.length === 'number' ? startY + drop.length : startY + 20;
            
            const path = `M${startX} ${startY} L${startX} ${endY}`;
            
            return (
              <Path
                key={drop.id}
                path={path}
                color={RAIN_COLOR}
                opacity={drop.opacity || 0.6}
                style="stroke"
                strokeWidth={RAIN_WIDTH}
              >
                <BlurMask blur={RAIN_BLUR} style="normal" />
              </Path>
            );
          })}
        </Group>
      </Canvas>
      {/* Animated storm clouds */}
      {clouds.map((cloud) => (
        <AnimatedStormCloud key={cloud.id} {...cloud} color="#44485a" onEnd={() => handleCloudEnd(cloud.id)} />
      ))}
    </>
  );
};

export default StormyBackground; 