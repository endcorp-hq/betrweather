import { useState, useEffect } from "react";

export const useTimeZone = (latitude: number | null, longitude: number | null) => {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchedTimezone = async () => {
      if (latitude && longitude) {
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/timezone`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                latitude: latitude,
                longitude: longitude,
              }),
            }
          );
          const data = await response.json();
          if (data.data?.timezone?.timeZoneId) {
            setTimeZone(data.data.timezone.timeZoneId);
          }
        } catch (error) {
          console.error("Error fetching searched timezone:", error);
        }
      } else {
        setTimeZone(null);
      }
    };

    fetchSearchedTimezone();
  }, [latitude, longitude]);

  return { timeZone };
};
