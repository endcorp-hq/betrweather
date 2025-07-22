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
    // Render a transparent background for dark gradient condition
    return null;
  }
  switch (condition) {
    // case 'cloudy':
    //   return <CloudyBackground theme={theme} transparent={true} />;
    // case 'sunny':
    //   return <SunnyBackground theme={theme} transparent={true} />;
    case 'stormy':
      return <StormyBackground theme={theme} transparent={true} />;
    case 'rainy':
      return <RainyBackground theme={theme} transparent={true} />;
    case 'snowy':
      return <SnowyBackground theme={theme} transparent={true} />;
    // case 'foggy':
    //   return <FoggyBackground theme={theme} transparent={true} />;
    // case 'windy':
    //   return <WindyBackground theme={theme} transparent={true} />;
    // case 'partly_cloudy':
    //   return <PartlyCloudyBackground theme={theme} transparent={true} />;
    default:
      return null;
  }
}

export default WeatherBackgroundSkia; 