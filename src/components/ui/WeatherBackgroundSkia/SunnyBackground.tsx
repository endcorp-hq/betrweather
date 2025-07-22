import React from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Circle, Group, LinearGradient, RadialGradient, vec, Path, BlurMask } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

const sunRadius = Math.min(width, height) * 0.28; // much larger sun
const sunCenter = { x: width / 2, y: height * 0.32 }; // centered horizontally, upper third

const rayCount = 24; // more rays
const rayLength = sunRadius * 1.7;
const rayWidth = 32;
const rayOpacity = 0.22;

const lensFlares = [
  { x: sunCenter.x + sunRadius * 0.7, y: sunCenter.y + sunRadius * 1.2, r: sunRadius * 0.32, opacity: 0.22 },
  { x: sunCenter.x - sunRadius * 0.9, y: sunCenter.y + sunRadius * 1.7, r: sunRadius * 0.18, opacity: 0.16 },
  { x: sunCenter.x + sunRadius * 1.2, y: sunCenter.y + sunRadius * 2.1, r: sunRadius * 0.13, opacity: 0.13 },
  { x: sunCenter.x, y: sunCenter.y + sunRadius * 2.5, r: sunRadius * 0.22, opacity: 0.10 },
];

const SunnyBackground = ({ theme, transparent = false }: { theme: any; transparent?: boolean }) => {
  const skyGradient = ['#56ccf2', '#ffe29f', '#f6d365']; // blue to yellow

  // Sun rays as paths
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / rayCount;
    const x1 = sunCenter.x + Math.cos(angle) * (sunRadius + 16);
    const y1 = sunCenter.y + Math.sin(angle) * (sunRadius + 16);
    const x2 = sunCenter.x + Math.cos(angle) * (sunRadius + rayLength);
    const y2 = sunCenter.y + Math.sin(angle) * (sunRadius + rayLength);
    // Wide rays as triangles
    const perpAngle = angle + Math.PI / 2;
    const wx = Math.cos(perpAngle) * rayWidth;
    const wy = Math.sin(perpAngle) * rayWidth;
    const path = `M${x1 - wx / 2},${y1 - wy / 2} L${x2},${y2} L${x1 + wx / 2},${y1 + wy / 2} Z`;
    return (
      <Path
        key={i}
        path={path}
        color="#fff9c4"
        opacity={rayOpacity}
        style="fill"
      >
        <BlurMask blur={18} style="normal" />
      </Path>
    );
  });

  return (
    <>
      {/* Sky gradient background - only show if not transparent */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        {!transparent && (
          <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
          </Path>
        )}
        {/* Sun rays */}
        <Group>{rays}</Group>
        {/* Sun core */}
        <Circle
          cx={sunCenter.x}
          cy={sunCenter.y}
          r={sunRadius}
        >
          <RadialGradient
            c={vec(sunCenter.x, sunCenter.y)}
            r={sunRadius}
            colors={["#fffde4", "#ffe29f", "#ffd70000"]}
          />
          <BlurMask blur={32} style="normal" />
        </Circle>
        {/* Lens flare circles */}
        {lensFlares.map((flare, i) => (
          <Circle
            key={i}
            cx={flare.x}
            cy={flare.y}
            r={flare.r}
            color="#fff9c4"
            opacity={flare.opacity}
          >
            <BlurMask blur={24} style="normal" />
          </Circle>
        ))}
      </Canvas>
    </>
  );
};

export default SunnyBackground; 