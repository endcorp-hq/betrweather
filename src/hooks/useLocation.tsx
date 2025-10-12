import { useState, useEffect } from "react";
import { Platform, Alert, Linking } from "react-native";
import type * as ExpoLocationTypes from 'expo-location';
// Lazy import expo-location only on native to avoid web bundle errors
let ExpoLocation: typeof import('expo-location') | undefined;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoLocation = require('expo-location');
}
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocation = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detailedLocation, setDetailedLocation] = useState<
    ExpoLocationTypes.LocationGeocodedAddress[] | null
  >(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);

  const requestForegroundPermission = async () => {
    try {
      if (Platform.OS === 'web' || !ExpoLocation) {
        // Web: assume permission via browser prompt handled elsewhere
        setHasForegroundPermission(true);
        return true;
      }
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setHasForegroundPermission(status === "granted");
      return status === "granted";
    } catch (error) {
      console.error('Error requesting foreground permission:', error);
      return false;
    }
  };

  const requestBackgroundPermission = async () => {
    try {
      if (Platform.OS === 'web' || !ExpoLocation) {
        setHasBackgroundPermission(false);
        return false;
      }
      console.log("requestBackgroundPermission");
      // Check if we already have background permission
      const backgroundStatus = await ExpoLocation.getBackgroundPermissionsAsync();
      console.log("backgroundStatus", backgroundStatus);
      if (backgroundStatus.status === "granted") {
        console.log("backgroundStatus is granted");
        setHasBackgroundPermission(true);
        return true;
      }

      // Request background permission
      const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
      setHasBackgroundPermission(status === "granted");
      
      if (status !== "granted") {
        // Background permission is optional, just return false without showing error
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting background permission:', error);
      return false;
    }
  };

  const savePermissionState = async (foreground: boolean, background: boolean) => {
    try {
      await AsyncStorage.setItem('locationPermissions', JSON.stringify({
        foreground,
        background,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving permission state:', error);
    }
  };

  const loadPermissionState = async () => {
    try {
      const cached = await AsyncStorage.getItem('locationPermissions');
      if (cached) {
        const { foreground, background, timestamp } = JSON.parse(cached);
        // Check if cached state is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return { foreground, background };
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading permission state:', error);
      return null;
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

      // Then request background permission (only on Android 10+, optional for widgets)
      if (Platform.OS === 'android' && Platform.Version >= 29) {
        await requestBackgroundPermission();
        // Don't fail if background permission is denied - it's optional
      }

      // Get location with foreground permission
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
      if (Platform.OS === 'web' || !ExpoLocation) {
        // Browser geolocation fallback
        await new Promise<void>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLatitude(pos.coords.latitude);
              setLongitude(pos.coords.longitude);
              setDetailedLocation(null);
              setIsLoading(false);
              resolve();
            },
            (err) => {
              setError('Error getting current location');
              setIsLoading(false);
              reject(err);
            }
          );
        });
        return;
      }
      let coords = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 100
      });
      
      setLatitude(coords.coords.latitude);
      setLongitude(coords.coords.longitude);
      
      // Get detailed location
      let response = await ExpoLocation.reverseGeocodeAsync({
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
      // Web: skip expo-location permission APIs; directly attempt browser geolocation
      if (Platform.OS === 'web' || !ExpoLocation) {
        setHasForegroundPermission(true);
        setHasBackgroundPermission(false);
        await getLocation();
        setHasCheckedPermissions(true);
        return;
      }
      // First check cached permissions to avoid unnecessary permission screen
      const cachedPermissions = await loadPermissionState();
      
      if (cachedPermissions && cachedPermissions.foreground) {
        // We have cached foreground permission, check if it's still valid
        const foregroundStatus = await ExpoLocation.getForegroundPermissionsAsync();
        const backgroundStatus = await ExpoLocation.getBackgroundPermissionsAsync();
        
        const hasForeground = foregroundStatus.status === "granted";
        const hasBackground = backgroundStatus.status === "granted";
        
        setHasForegroundPermission(hasForeground);
        setHasBackgroundPermission(hasBackground);
        
        // Save current state
        await savePermissionState(hasForeground, hasBackground);
        
        if (hasForeground) {
          await getLocation();
        } else {
          // Permission was revoked, clear cache and show permission screen
          await AsyncStorage.removeItem('locationPermissions');
          setIsLoading(false);
        }
      } else {
        // No cached permissions, check current state
        const foregroundStatus = await ExpoLocation.getForegroundPermissionsAsync();
        const backgroundStatus = await ExpoLocation.getBackgroundPermissionsAsync();
        
        const hasForeground = foregroundStatus.status === "granted";
        const hasBackground = backgroundStatus.status === "granted";
        
        setHasForegroundPermission(hasForeground);
        setHasBackgroundPermission(hasBackground);
        
        // Save current state
        await savePermissionState(hasForeground, hasBackground);
        
        if (hasForeground) {
          await getLocation();
        } else {
          setIsLoading(false);
        }
      }
      
      setHasCheckedPermissions(true);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsLoading(false);
      setHasCheckedPermissions(true);
    }
  };

  // Add a function to refresh location data
  const refreshLocation = async () => {
    if (hasForegroundPermission) {
      await getLocation();
    }
  };

  // Add a function to force re-check permissions and location
  const forceRefreshPermissions = async () => {
    // Only do a full permission check if we don't already have foreground permission
    if (!hasForegroundPermission) {
      await checkPermissions();
    } else {
      // If we already have permission, just get location data
      await getLocation();
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // Poll permissions every 2 seconds on first launch until permissions are granted
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip polling on web
    if (!hasCheckedPermissions || hasForegroundPermission) {
      return; // Don't poll if we haven't checked yet or already have permissions
    }

    const pollInterval = setInterval(async () => {
      try {
        if (!ExpoLocation) return;
        // Check if permissions have been granted
        const foregroundStatus = await ExpoLocation.getForegroundPermissionsAsync();
        const backgroundStatus = await ExpoLocation.getBackgroundPermissionsAsync();
        
        const hasForeground = foregroundStatus.status === "granted";
        const hasBackground = backgroundStatus.status === "granted";
        
        if (hasForeground) {
          // Permissions granted, update state and get location
          setHasForegroundPermission(true);
          setHasBackgroundPermission(hasBackground);
          await savePermissionState(hasForeground, hasBackground);
          await getLocation();
          clearInterval(pollInterval); // Stop polling
        }
      } catch (error) {
        console.error('Error polling permissions:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [hasCheckedPermissions, hasForegroundPermission]);

  return {
    latitude,
    longitude,
    isLoading,
    detailedLocation,
    error,
    hasForegroundPermission,
    hasBackgroundPermission,
    hasCheckedPermissions,
    requestAllPermissions,
    openLocationSettings,
    refreshLocation,
    forceRefreshPermissions
  };
};