import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, BlurMask } from '@shopify/react-native-skia';
import { randomWindStreak, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const WIND_STREAK_COUNT = 10;
const WIND_COLORS = [
  'rgba(200,230,255,0.22)',
  'rgba(180,220,255,0.18)',
  'rgba(160,210,255,0.13)',
  'rgba(210,240,255,0.16)',
];

const WindyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#e0f7fa', '#b3e5fc', '#e1f5fe'];
  const [streaks, setStreaks] = useState(() => Array.from({ length: WIND_STREAK_COUNT }, (_, i) => randomWindStreak({ id: i, colorList: WIND_COLORS, colorIndex: i })));

  useAnimationFrame((dt) => {
    setStreaks((prev) =>
      prev.map((streak) => {
        let newX = streak.x + streak.direction * streak.speed * dt;
        if (newX > width * 1.2) newX = -width * 0.2;
        return { ...streak, x: newX };
      })
    );
  });

  return (
    <>
      {/* Windy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
        {/* Wind streaks */}
        <Group>
          {streaks.map((streak) => {
            const windPath = `M${streak.x} ${streak.y} Q${streak.x + width * 0.2 * streak.widthScale} ${streak.y - 18},${streak.x + width * 0.4 * streak.widthScale} ${streak.y} T${streak.x + width * 0.8 * streak.widthScale} ${streak.y}`;
            return (
              <Path
                key={streak.id}
                path={windPath}
                color={streak.color}
                opacity={streak.opacity}
                style="stroke"
                strokeWidth={4}
              >
                <BlurMask blur={8} style="normal" />
              </Path>
            );
          })}
        </Group>
      </Canvas>
    </>
  );
};

export default WindyBackground; 