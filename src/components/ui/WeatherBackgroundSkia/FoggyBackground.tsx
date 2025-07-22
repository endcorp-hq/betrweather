import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, BlurMask } from '@shopify/react-native-skia';
import { randomFogLayer, useAnimationFrame } from './utils';

const { width, height } = Dimensions.get('window');

const FOG_LAYER_COUNT = 4;
const FOG_COLORS = [
  'rgba(220,225,230,0.22)',
  'rgba(200,210,220,0.18)',
  'rgba(180,190,200,0.13)',
  'rgba(210,220,230,0.16)',
];

const FoggyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#bfc7d1', '#e0eafc', '#fafdff'];
  const [layers, setLayers] = useState(() => Array.from({ length: FOG_LAYER_COUNT }, (_, i) => randomFogLayer({ id: i })));

  useAnimationFrame((dt) => {
    setLayers((prev) =>
      prev.map((layer, i) => {
        let newX = layer.x + layer.direction * layer.speed * dt;
        if (newX > width * 1.2) newX = -width * 0.2;
        if (newX < -width * 0.2) newX = width * 1.2;
        return { ...layer, x: newX };
      })
    );
  });

  return (
    <>
      {/* Foggy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
        {/* Fog layers */}
        <Group>
          {layers.map((layer, i) => {
            const fogPath = `M${layer.x} ${layer.y} Q${layer.x + width * 0.2 * layer.widthScale} ${layer.y - 18},${layer.x + width * 0.4 * layer.widthScale} ${layer.y} T${layer.x + width * 0.8 * layer.widthScale} ${layer.y} L${layer.x + width * 0.8 * layer.widthScale} ${layer.y + 38} Q${layer.x + width * 0.6 * layer.widthScale} ${layer.y + 56},${layer.x + width * 0.4 * layer.widthScale} ${layer.y + 38} T${layer.x} ${layer.y + 38} Z`;
            return (
              <Path
                key={layer.id}
                path={fogPath}
                color={FOG_COLORS[i % FOG_COLORS.length]}
                opacity={layer.opacity}
                style="fill"
              >
                <BlurMask blur={18} style="normal" />
              </Path>
            );
          })}
        </Group>
      </Canvas>
    </>
  );
};

export default FoggyBackground; 