import React from "react";
import { useMarkets } from "../hooks";

export const MarketsBoot: React.FC = () => {
  // Keep markets stream alive globally so updates arrive regardless of screen
  // Ensure only one global subscriber to avoid duplicate connections
  useMarkets({ resolvedLastHours: 24, autoStart: true });
  return null;
};


