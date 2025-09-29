import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Platform, Alert, Linking } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);

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
      // First check cached permissions to avoid unnecessary permission screen
      const cachedPermissions = await loadPermissionState();
      
      if (cachedPermissions && cachedPermissions.foreground) {
        // We have cached foreground permission, check if it's still valid
        const foregroundStatus = await Location.getForegroundPermissionsAsync();
        const backgroundStatus = await Location.getBackgroundPermissionsAsync();
        
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
        const foregroundStatus = await Location.getForegroundPermissionsAsync();
        const backgroundStatus = await Location.getBackgroundPermissionsAsync();
        
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
    if (!hasCheckedPermissions || hasForegroundPermission) {
      return; // Don't poll if we haven't checked yet or already have permissions
    }

    const pollInterval = setInterval(async () => {
      try {
        // Check if permissions have been granted
        const foregroundStatus = await Location.getForegroundPermissionsAsync();
        const backgroundStatus = await Location.getBackgroundPermissionsAsync();
        
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