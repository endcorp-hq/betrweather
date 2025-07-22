import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, Paint, BlurMask, Circle } from '@shopify/react-native-skia';
import { randomSnowflake, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const SNOWFLAKE_COUNT = 32;
const SNOW_COLOR = '#fafdff';

const SnowyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#b3c6e0', '#e0eafc', '#fafdff'];
  const [flakes, setFlakes] = useState(() => Array.from({ length: SNOWFLAKE_COUNT }, (_, i) => randomSnowflake({ id: i })));
  const [t, setT] = useState(0);

  useAnimationFrame((dt) => {
    setT((prev) => prev + dt);
    setFlakes((prev) =>
      prev.map((flake) => {
        let newY = flake.y + flake.speed * dt;
        let newX = flake.x + Math.sin(t * flake.swaySpeed + flake.phase) * flake.sway * dt;
        if (newY > height + flake.r) {
          return randomSnowflake({ id: flake.id });
        }
        return { ...flake, y: newY, x: newX };
      })
    );
  });

  return (
    <>
      {/* Snowy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
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