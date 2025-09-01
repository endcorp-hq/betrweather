import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';

export const LocationPermissionScreen = () => {
  const navigation = useNavigation();
  const [isRequesting, setIsRequesting] = useState(false);
  
  const {
    hasForegroundPermission,
    hasBackgroundPermission,
    requestAllPermissions,
  } = useLocation();

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    
    try {
      const success = await requestAllPermissions();
      if (success) {
        // Navigate to home screen after successful permission grant
        navigation.navigate('HomeStack' as never);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Check if we already have permissions and navigate automatically
  useEffect(() => {
    if (hasForegroundPermission && !isLoading) {
      // Only require foreground permission for basic app usage
      // Navigate to HomeStack since we can't go back
      navigation.navigate('HomeStack' as never);
    }
  }, [hasForegroundPermission, isLoading, navigation]);

  return (
    <View className="flex-1 bg-black justify-center items-center p-5">
      <View className="max-w-sm w-full items-center">
        <Text className="text-2xl font-better-bold text-white text-center mb-5">
          Location Access Required
        </Text>
        
        <Text className="text-base text-white font-better-regular text-center mb-8 leading-6">
          BetrWeather needs access to your location to provide accurate weather information and keep your widget updated.
        </Text>

        <View className="mb-8 items-center">
          <Text className="text-lg font-better-regular text-white mb-4">
            We need:
          </Text>
          <Text className="text-sm text-gray-300 font-better-semi-bold mb-2">
            • Location access while using the app <Text className="text-green-400">(Required)</Text>
          </Text>
          <Text className="text-sm text-gray-300 font-better-semi-bold mb-2">
            • Background location access for the weather widget <Text className="text-yellow-400">(Optional)</Text>
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-2">
            Background access is only needed if you want the weather widget to update when the app is closed
          </Text>
        </View>

        <TouchableOpacity
          className="bg-green-700 py-4 px-8 rounded-xl items-center mb-4 w-full"
          onPress={handleRequestPermissions}
          disabled={isRequesting}
        >
          <Text className="text-white text-lg font-better-semi-bold">
            {isRequesting ? 'Requesting...' : 'Grant Location Access'}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-gray-500 text-center italic">
          You can change these permissions anytime in your device settings.
        </Text>
      </View>
    </View>
  );
};