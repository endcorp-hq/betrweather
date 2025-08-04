import React, { createContext, useContext, ReactNode } from "react";
import { useAPI } from "../hooks/useAPI";

interface TimezoneContextType {
  // Empty context - we don't need to store anything here
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  return (
    <TimezoneContext.Provider value={{}}>
      {children}
    </TimezoneContext.Provider>
  );
};

// Simple hook that takes lat/lon and returns timezone data
export const useTimeZone = (lat: number | null, lon: number | null) => {
  const context = useContext(TimezoneContext);

  if (context === undefined) {
    throw new Error("useTimeZone must be used within a TimezoneProvider");
  }

  const { data: timezoneData, isLoading: loadingTimeZone } = useAPI<{ data: { timezone: { timeZoneId: string } } }>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/timezone`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: lat && lon ? JSON.stringify({
        latitude: lat,
        longitude: lon,
      }) : undefined,
    },
    {
      enabled: !!lat && !!lon,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const timeZoneId = timezoneData?.data?.timezone?.timeZoneId || null;

  return { 
    loadingTimeZone, 
    timeZoneId 
  };
};
