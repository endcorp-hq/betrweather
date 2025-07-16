import React, { useRef, useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Group, Path, LinearGradient, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const stormCloudPaths = [
  'M60 80 Q80 60 120 80 Q140 60 180 90 Q200 120 170 130 Q160 150 120 140 Q80 150 60 130 Q30 120 40 100 Q50 90 60 80 Z',
  'M200 180 Q220 170 250 180 Q270 170 300 190 Q320 210 290 220 Q270 230 240 220 Q210 230 200 210 Q190 200 200 180 Z',
  'M320 60 Q330 55 350 65 Q360 60 375 70 Q380 80 370 90 Q360 100 340 95 Q325 100 320 90 Q315 80 320 60 Z',
  'M80 200 Q90 195 110 200 Q120 195 130 205 Q135 215 125 220 Q120 225 100 220 Q85 225 80 215 Q75 210 80 200 Z',
];

const randomStormCloudConfig = (id: number) => {
  const y = height * (0.15 + 0.6 * Math.random());
  const scale = 1.1 + Math.random() * 1.2;
  const speed = 12 + Math.random() * 8;
  const opacity = 0.35 + Math.random() * 0.3;
  const pathIndex = Math.floor(Math.random() * stormCloudPaths.length);
  return { id, y, scale, speed, opacity, pathIndex };
};

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

// Lightning bolt shape (simple zigzag)
function LightningBolt({ x, y, scale = 1, opacity = 1 }: { x: number; y: number; scale?: number; opacity?: number }) {
  // Simple bolt path
  const boltPath = `M${x} ${y} L${x + 10 * scale} ${y + 40 * scale} L${x + 25 * scale} ${y + 40 * scale} L${x + 5 * scale} ${y + 90 * scale} L${x + 30 * scale} ${y + 60 * scale} L${x + 15 * scale} ${y + 60 * scale} L${x + 35 * scale} ${y}`;
  return (
    <Path
      path={boltPath}
      color="#fffbe6"
      opacity={opacity}
      style="stroke"
      strokeWidth={6 * scale}
    >
      <BlurMask blur={12 * scale} style="normal" />
    </Path>
  );
}

// --- Rain effect (from RainyBackground) ---
const RAIN_DROP_COUNT = 20; // reduced for performance
const RAIN_LENGTH = 44;
const RAIN_WIDTH = 2.2;
const RAIN_COLOR = '#b3d0f7';
const RAIN_BLUR = 6;

function randomRainDrop(i: number) {
  return {
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    speed: 220 + Math.random() * 180, // px/sec
    length: RAIN_LENGTH * (0.7 + Math.random() * 0.6),
    opacity: 0.22 + Math.random() * 0.32,
  };
}

const StormyBackground = ({ theme }: { theme: any }) => {
  const skyGradient = ['#23243a', '#3a3a5a', '#4e4376', '#232526']; // dark, stormy
  const [clouds, setClouds] = useState(Array.from({ length: 4 }, (_, i) => randomStormCloudConfig(i)));
  const nextId = useRef(4);

  // Lightning state
  const [lightning, setLightning] = useState<{ x: number; y: number; scale: number; key: number }[]>([]);
  const lightningKey = useRef(0);

  // Rain state
  const [drops, setDrops] = useState(() => Array.from({ length: RAIN_DROP_COUNT }, (_, i) => randomRainDrop(i)));

  // Animate rain (throttled to ~30fps)
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
      if (running) setTimeout(animate, 33); // ~30fps
    }
    animate();
    return () => {
      running = false;
    };
  }, []);

  // Lightning logic (less frequent)
  useEffect(() => {
    const trigger = () => {
      const x = 80 + Math.random() * (width - 160);
      const y = 60 + Math.random() * (height * 0.3);
      const scale = 0.8 + Math.random() * 1.2;
      setLightning((prev) => [...prev, { x, y, scale, key: lightningKey.current++ }]);
      setTimeout(() => {
        setLightning((prev) => prev.slice(1));
      }, 350 + Math.random() * 200);
      setTimeout(trigger, 3000 + Math.random() * 3000); // less frequent
    };
    trigger();
    return () => {};
  }, []);

  const handleCloudEnd = (id: number) => {
    setClouds((prev) => prev.filter((c) => c.id !== id).concat(randomStormCloudConfig(nextId.current++)));
  };

  return (
    <>
      {/* Stormy sky gradient */}
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={skyGradient} />
        </Path>
        {/* Lightning bolts */}
        <Group>
          {lightning.map((l) => (
            <LightningBolt key={l.key} x={l.x} y={l.y} scale={l.scale} opacity={0.95} />
          ))}
        </Group>
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
      {/* Animated storm clouds */}
      {clouds.map((cloud) => (
        <AnimatedStormCloud key={cloud.id} {...cloud} color="#44485a" onEnd={() => handleCloudEnd(cloud.id)} />
      ))}
    </>
  );
};

export default StormyBackground; 