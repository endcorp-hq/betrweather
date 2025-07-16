// Utility functions for WeatherBackgroundSkia animated backgrounds
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// --- Cloud Utilities ---
export function randomCloudConfig({ id, yRange = [0.1, 0.7], scaleRange = [1, 2], speedRange = [10, 20], opacityRange = [0.2, 0.6], pathCount = 1 }: { id: number, yRange?: [number, number], scaleRange?: [number, number], speedRange?: [number, number], opacityRange?: [number, number], pathCount?: number }) {
  const [yMin, yMax] = yRange;
  const [scaleMin, scaleMax] = scaleRange;
  const [speedMin, speedMax] = speedRange;
  const [opacityMin, opacityMax] = opacityRange;
  return {
    id,
    y: height * (yMin + (yMax - yMin) * Math.random()),
    scale: scaleMin + Math.random() * (scaleMax - scaleMin),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
    pathIndex: Math.floor(Math.random() * pathCount),
  };
}

// --- Rain Utilities ---
export function randomRainDrop({ 
    id, 
    speedRange = [180, 360], 
    lengthRange = [33.6, 76.8], 
    opacityRange = [0.18, 0.5], 
    width, 
    height, 
}: { 
    id: number, 
    speedRange?: [number, number], 
    lengthRange?: [number, number], 
    opacityRange?: [number, number], 
    width?: number, height?: number 
}) {
  const [speedMin, speedMax] = speedRange;
  const [lengthMin, lengthMax] = lengthRange;
  const [opacityMin, opacityMax] = opacityRange;
  return {
    id,
    x: Math.random() * (width || 0),
    y: Math.random() * (height || 0),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    length: lengthMin + Math.random() * (lengthMax - lengthMin),
    opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
  };
}

// --- Fog Utilities ---
export function randomFogLayer({ id, baseY = 0.15, yStep = 0.18, yJitter = 0.08, speedRange = [8, 16], opacityRange = [0.13, 0.26], widthScaleRange = [1.1, 1.4], direction = null }: { id: number, baseY?: number, yStep?: number, yJitter?: number, speedRange?: [number, number], opacityRange?: [number, number], widthScaleRange?: [number, number], direction?: number | null }) {
  const [speedMin, speedMax] = speedRange;
  const [opacityMin, opacityMax] = opacityRange;
  const [widthScaleMin, widthScaleMax] = widthScaleRange;
  return {
    id,
    y: height * (baseY + yStep * id + Math.random() * yJitter),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
    widthScale: widthScaleMin + Math.random() * (widthScaleMax - widthScaleMin),
    x: Math.random() * width,
    direction: direction !== null ? direction : (Math.random() > 0.5 ? 1 : -1),
  };
}

// --- Wind Utilities ---
export function randomWindStreak({
  id,
  yRange = [0.12, 0.82],
  speedRange = [40, 80],
  opacityRange = [0.18, 0.31],
  widthScaleRange = [0.7, 1.4],
  colorList = [],
  colorIndex = 0,
}: {
  id: number;
  yRange?: [number, number];
  speedRange?: [number, number];
  opacityRange?: [number, number];
  widthScaleRange?: [number, number];
  colorList?: string[];
  colorIndex?: number;
}) {
  const [yMin, yMax] = yRange;
  const [speedMin, speedMax] = speedRange;
  const [opacityMin, opacityMax] = opacityRange;
  const [widthScaleMin, widthScaleMax] = widthScaleRange;
  return {
    id,
    y: height * (yMin + (yMax - yMin) * Math.random()),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
    widthScale: widthScaleMin + Math.random() * (widthScaleMax - widthScaleMin),
    x: Math.random() * width,
    direction: 1,
    color: colorList.length > 0 ? colorList[colorIndex % colorList.length] : undefined,
  };
}

// --- Snow Utilities ---
export function randomSnowflake({ id, rRange = [2.5, 5], speedRange = [18, 50], swayRange = [18, 36], swaySpeedRange = [0.5, 1.2], opacityRange = [0.5, 1] }: { id: number, rRange?: [number, number], speedRange?: [number, number], swayRange?: [number, number], swaySpeedRange?: [number, number], opacityRange?: [number, number] }) {
  const [rMin, rMax] = rRange;
  const [speedMin, speedMax] = speedRange;
  const [swayMin, swayMax] = swayRange;
  const [swaySpeedMin, swaySpeedMax] = swaySpeedRange;
  const [opacityMin, opacityMax] = opacityRange;
  return {
    id,
    x: Math.random() * width,
    y: Math.random() * height,
    r: rMin + Math.random() * (rMax - rMin),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    sway: swayMin + Math.random() * (swayMax - swayMin),
    swaySpeed: swaySpeedMin + Math.random() * (swaySpeedMax - swaySpeedMin),
    phase: Math.random() * Math.PI * 2,
    opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
  };
}

// --- Animation Loop Helper ---
import React from 'react';
export function useAnimationFrame(callback: (dt: number) => void, deps: any[] = []) {
  React.useEffect(() => {
    let running = true;
    let last = Date.now();
    function animate() {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      callback(dt);
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
    };
  }, deps);
} 