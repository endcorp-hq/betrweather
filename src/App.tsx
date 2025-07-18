import React from "react";
import { WeatherProvider } from "./components/ui/ScreenWrapper";
import { AppNavigator } from "./navigators/AppNavigator";

export default function App() {
  return (
    <WeatherProvider>
      <AppNavigator />
    </WeatherProvider>
  );
} 