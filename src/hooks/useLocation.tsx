import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Platform, Alert, Linking } from "react-native";

export const useLocation = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detailedLocation, setDetailedLocation] = useState<
    Location.LocationGeocodedAddress[] | null
  >(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);

  const requestForegroundPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasForegroundPermission(status === "granted");
      return status === "granted";
    } catch (error) {
      console.error('Error requesting foreground permission:', error);
      return false;
    }
  };

  const requestBackgroundPermission = async () => {
    try {
      console.log("requestBackgroundPermission");
      // Check if we already have background permission
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      console.log("backgroundStatus", backgroundStatus);
      if (backgroundStatus.status === "granted") {
        console.log("backgroundStatus is granted");
        setHasBackgroundPermission(true);
        return true;
      }

      // Request background permission
      const { status } = await Location.requestBackgroundPermissionsAsync();
      setHasBackgroundPermission(status === "granted");
      return true;
    } catch (error) {
      console.error('Error requesting background permission:', error);
      return false;
    }
  };

  const openLocationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const requestAllPermissions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // // First request foreground permission
      const foregroundGranted = await requestForegroundPermission();
      if (!foregroundGranted) {
        setError("Foreground location permission is required");
        setIsLoading(false);
        return false;
      }

      // Then request background permission (only on Android 10+)
      if (Platform.OS === 'android' && Platform.Version >= 29) {
        const backgroundGranted = await requestBackgroundPermission();
        if (!backgroundGranted) {
          setError("Background location permission is required for the widget");
          setIsLoading(false);
          return false;
        }
      }

      // Both permissions granted, get location
      await getLocation();
      return true;
    } catch (error) {
      console.error('Error in requestAllPermissions:', error);
      setError("Failed to get location permissions");
      setIsLoading(false);
      return false;
    }
  };

  const getLocation = async () => {
    try {
      let coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 100
      });
      
      setLatitude(coords.coords.latitude);
      setLongitude(coords.coords.longitude);
      
      // Get detailed location
      let response = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      setDetailedLocation(response);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setError("Error getting current location");
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      
      setHasForegroundPermission(foregroundStatus.status === "granted");
      setHasBackgroundPermission(backgroundStatus.status === "granted");
      
      // If we have both permissions, get location
      if (foregroundStatus.status === "granted" && backgroundStatus.status === "granted") {
        await getLocation();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsLoading(false);
    }
  };

  // Add a function to refresh location data
  const refreshLocation = async () => {
    if (hasForegroundPermission && hasBackgroundPermission) {
      await getLocation();
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    latitude,
    longitude,
    isLoading,
    detailedLocation,
    error,
    hasForegroundPermission,
    hasBackgroundPermission,
    requestAllPermissions,
    openLocationSettings,
    refreshLocation
  };
};