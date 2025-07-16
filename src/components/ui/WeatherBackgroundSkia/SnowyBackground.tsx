import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, Paint, BlurMask, Circle } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

const SNOWFLAKE_COUNT = 32;
const SNOW_COLOR = '#fafdff';

function randomSnowflake(i: number) {
  return {
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    r: 2.5 + Math.random() * 2.5,
    speed: 18 + Math.random() * 32,
    sway: 18 + Math.random() * 18,
    swaySpeed: 0.5 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.5 + Math.random() * 0.5,
  };
}

const SnowyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#b3c6e0', '#e0eafc', '#fafdff'];
  const [flakes, setFlakes] = useState(() => Array.from({ length: SNOWFLAKE_COUNT }, (_, i) => randomSnowflake(i)));
  const [t, setT] = useState(0);

  // Animate snow
  useEffect(() => {
    let running = true;
    let last = Date.now();
    function animate() {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => prev + dt);
      setFlakes((prev) =>
        prev.map((flake) => {
          let newY = flake.y + flake.speed * dt;
          let newX = flake.x + Math.sin(t * flake.swaySpeed + flake.phase) * flake.sway * dt;
          if (newY > height + flake.r) {
            return randomSnowflake(flake.id);
          }
          return { ...flake, y: newY, x: newX };
        })
      );
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
    };
  }, [t]);

  return (
    <>
      {/* Snowy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
        {/* Snowflakes */}
        <Group>
          {flakes.map((flake) => (
            <Circle
              key={flake.id}
              cx={flake.x}
              cy={flake.y}
              r={flake.r}
              color={SNOW_COLOR}
              opacity={flake.opacity}
            >
              <BlurMask blur={flake.r * 0.7} style="normal" />
            </Circle>
          ))}
        </Group>
      </Canvas>
    </>
  );
};

export default SnowyBackground; 