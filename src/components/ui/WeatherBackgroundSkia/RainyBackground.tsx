import React, { useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, BlurMask, Group, Paint } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

const RAIN_DROP_COUNT = 48;
const RAIN_LENGTH = 48;
const RAIN_WIDTH = 2.2;
const RAIN_COLOR = '#b3d0f7';
const RAIN_BLUR = 6;

function randomRainDrop(i: number) {
  return {
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    speed: 180 + Math.random() * 180, // px/sec
    length: RAIN_LENGTH * (0.7 + Math.random() * 0.6),
    opacity: 0.18 + Math.random() * 0.32,
  };
}

const RainyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#4e5d7a', '#7b8fa3', '#b3c6e0'];
  const [drops, setDrops] = useState(() => Array.from({ length: RAIN_DROP_COUNT }, (_, i) => randomRainDrop(i)));

  // Animate rain
  useEffect(() => {
    let running = true;
    let last = Date.now();
    function animate() {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setDrops((prev) =>
        prev.map((drop) => {
          let newY = drop.y + drop.speed * dt;
          if (newY > height + drop.length) {
            // Reset to top
            return randomRainDrop(drop.id);
          }
          return { ...drop, y: newY };
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
      {/* Rainy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
        {/* Rain drops */}
        <Group>
          {drops.map((drop) => {
            const path = `M${drop.x} ${drop.y} L${drop.x} ${drop.y + drop.length}`;
            return (
              <Path
                key={drop.id}
                path={path}
                color={RAIN_COLOR}
                opacity={drop.opacity}
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