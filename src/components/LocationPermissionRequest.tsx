import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocation } from '../hooks/useLocation';

interface LocationPermissionRequestProps {
  onPermissionGranted?: () => void;
}

export const LocationPermissionRequest: React.FC<LocationPermissionRequestProps> = ({
  onPermissionGranted
}) => {
  const {
    hasForegroundPermission,
    hasBackgroundPermission,
    requestAllPermissions,
    error
  } = useLocation();

  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    
    try {
      const success = await requestAllPermissions();
      if (success && onPermissionGranted) {
        onPermissionGranted();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  // If we have all permissions, don't show anything
  if (hasForegroundPermission && hasBackgroundPermission) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Permission Required</Text>
      
      <Text style={styles.description}>
        This app needs access to your location to provide accurate weather information and update the widget.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRequestPermissions}
        disabled={isRequesting}
      >
        <Text style={styles.buttonText}>
          {isRequesting ? 'Requesting...' : 'Grant Location Access'}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Text style={styles.note}>
        Background location access is needed for the weather widget to update when the app is not active.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  note: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
