import React from "react";
import { useMarkets } from "../hooks";

export const MarketsBoot: React.FC = () => {
  // Keep markets stream alive globally so updates arrive regardless of screen
  useMarkets({ resolvedLastHours: 24, autoStart: true });
  return null;
};


