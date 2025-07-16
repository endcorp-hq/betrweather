import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, BlurMask } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

const WIND_STREAK_COUNT = 10;
const WIND_COLORS = [
  'rgba(200,230,255,0.22)',
  'rgba(180,220,255,0.18)',
  'rgba(160,210,255,0.13)',
  'rgba(210,240,255,0.16)',
];

function randomWindStreak(i: number) {
  return {
    id: i,
    y: height * (0.12 + 0.7 * Math.random()),
    speed: 40 + Math.random() * 40,
    opacity: 0.18 + Math.random() * 0.13,
    widthScale: 0.7 + Math.random() * 0.7,
    x: Math.random() * width,
    direction: 1,
    color: WIND_COLORS[i % WIND_COLORS.length],
  };
}

const WindyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#e0f7fa', '#b3e5fc', '#e1f5fe'];
  const [streaks, setStreaks] = useState(() => Array.from({ length: WIND_STREAK_COUNT }, (_, i) => randomWindStreak(i)));

  // Animate wind
  useEffect(() => {
    let running = true;
    let last = Date.now();
    function animate() {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setStreaks((prev) =>
        prev.map((streak) => {
          let newX = streak.x + streak.direction * streak.speed * dt;
          if (newX > width * 1.2) newX = -width * 0.2;
          return { ...streak, x: newX };
        })
      );
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
    };
  }, []);

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