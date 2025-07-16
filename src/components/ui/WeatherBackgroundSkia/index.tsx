import React from 'react';
import CloudyBackground from './CloudyBackground';
import SunnyBackground from './SunnyBackground';
import StormyBackground from './StormyBackground';
import RainyBackground from './RainyBackground';
import SnowyBackground from './SnowyBackground';
import FoggyBackground from './FoggyBackground';
import WindyBackground from './WindyBackground';
import PartlyCloudyBackground from './PartlyCloudyBackground';
import { Canvas, Path, LinearGradient, vec } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

export interface WeatherBackgroundSkiaProps {
  condition: string;
  theme: any;
}

export function WeatherBackgroundSkia({ condition, theme }: WeatherBackgroundSkiaProps) {
  if (condition === 'dark_gradient') {
    // Render a simple dark gradient background
    const { width, height } = Dimensions.get('window');
    return (
      <Canvas style={{ position: 'absolute', width, height }} pointerEvents="none">
        <Path path={`M0 0 H${width} V${height} H0 Z`} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={["#181924", "#23243a", "#181924"]} />
        </Path>
      </Canvas>
    );
  }
  switch (condition) {
    case 'cloudy':
      return <CloudyBackground theme={theme} />;
    case 'sunny':
      return <SunnyBackground theme={theme} />;
    case 'stormy':
      return <StormyBackground theme={theme} />;
    case 'rainy':
      return <RainyBackground theme={theme} />;
    case 'snowy':
      return <SnowyBackground theme={theme} />;
    case 'foggy':
      return <FoggyBackground theme={theme} />;
    case 'windy':
      return <WindyBackground theme={theme} />;
    case 'partly_cloudy':
      return <PartlyCloudyBackground theme={theme} />;
    default:
      return null;
  }
}

export default WeatherBackgroundSkia; 