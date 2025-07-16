import React from 'react';
import CloudyBackground from './CloudyBackground';

// Stubs for now
const SunnyBackground = (props: any) => null;
const RainyBackground = (props: any) => null;

export interface WeatherBackgroundSkiaProps {
  condition: string;
  theme: any;
}

export function WeatherBackgroundSkia({ condition, theme }: WeatherBackgroundSkiaProps) {
  switch (condition) {
    case 'cloudy':
      return <CloudyBackground theme={theme} />;
    case 'sunny':
      return <SunnyBackground theme={theme} />;
    case 'rainy':
      return <RainyBackground theme={theme} />;
    default:
      return null;
  }
}

export default WeatherBackgroundSkia; 