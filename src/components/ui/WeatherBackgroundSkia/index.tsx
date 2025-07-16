import React from 'react';
import CloudyBackground from './CloudyBackground';
import SunnyBackground from './SunnyBackground';
import StormyBackground from './StormyBackground';
import RainyBackground from './RainyBackground';
import SnowyBackground from './SnowyBackground';
import FoggyBackground from './FoggyBackground';
import WindyBackground from './WindyBackground';
import PartlyCloudyBackground from './PartlyCloudyBackground';

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