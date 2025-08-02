import { useState, useEffect } from "react";
import * as Location from "expo-location";

export const useLocation = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detailedLocation, setDetailedLocation] = useState<
    Location.LocationGeocodedAddress[] | null
  >(null);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setError("Permission to access location was denied");
      return;
    }

    try {
      let coords = await Location.getCurrentPositionAsync({});
      setLatitude(coords.coords.latitude);
      setLongitude(coords.coords.longitude);
      setIsLoading(false);
      let response = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      setDetailedLocation(response);
    } catch (error) {
      console.error('Error getting location', error);
      setError("Error getting location");
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return {
    latitude,
    longitude,
    isLoading,
    detailedLocation,
    error,
  };
};
