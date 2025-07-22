import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, BlurMask, Group, Paint } from '@shopify/react-native-skia';
import { randomRainDrop, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const RAIN_DROP_COUNT = 80;
const RAIN_LENGTH = 20;
const RAIN_WIDTH = 0.8;
const RAIN_COLOR = '#ffffff';
const RAIN_BLUR = 0;

const RainyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#4e5d7a', '#7b8fa3', '#b3c6e0'];
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

  return (
    <>
      {/* Rainy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
        {/* Rain drops */}
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
    </>
  );
};

export default RainyBackground; 