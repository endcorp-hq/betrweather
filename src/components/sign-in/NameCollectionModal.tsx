// src/components/sign-in/NameCollectionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePrivyProfileSetup } from '../../hooks/usePrivyProfileSetup';

interface NameCollectionModalProps {
  visible: boolean;
  email?: string;
  onComplete: () => void;
}

export function NameCollectionModal({
  visible,
  email,
  onComplete,
}: NameCollectionModalProps) {
  const { completeSetup, isLoading, isSetupComplete } = usePrivyProfileSetup();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [nameError, setNameError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      setName('');
      setNameTouched(false);
      setNameError('');
    }
  }, [visible]);

  // Close modal when setup is complete
  useEffect(() => {
    if (isSetupComplete && visible) {
      onComplete();
    }
  }, [isSetupComplete, visible, onComplete]);

  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Name is required';
    }
    if (trimmed.length < 3) {
      return 'Name must be at least 3 characters';
    }
    if (trimmed.length > 50) {
      return 'Name must be less than 50 characters';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameTouched) {
      setNameError(validateName(value));
    }
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    setNameError(validateName(name));
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setNameTouched(true);
    
    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }

    try {
      await completeSetup(name.trim());
      // Modal will close automatically when isSetupComplete becomes true
      // Call onComplete to ensure it closes
      onComplete();
    } catch (error) {
      // Error is already handled by the hook via toast
      // Don't close modal on error - let user retry
      console.error('Failed to complete profile setup:', error);
    }
  };

  const isValid = name.trim().length >= 3 && !nameError;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing by back button during setup
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(26, 32, 44, 0.95)',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: '#ffffff',
                fontSize: 24,
                fontFamily: 'Poppins-SemiBold',
                marginBottom: 8,
              }}
            >
              Complete Your Profile
            </Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 14,
                fontFamily: 'Poppins-Regular',
                lineHeight: 20,
              }}
            >
              We need your name to complete your profile setup.
            </Text>
          </View>

          {/* Email Display (if available) */}
          {email && (
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color="rgba(255, 255, 255, 0.6)"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 14,
                  fontFamily: 'Poppins-Regular',
                  flex: 1,
                }}
              >
                {email}
              </Text>
            </View>
          )}

          {/* Name Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontFamily: 'Poppins-Medium',
                marginBottom: 8,
              }}
            >
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={handleNameChange}
              onBlur={handleNameBlur}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: 14,
                color: '#ffffff',
                fontSize: 16,
                fontFamily: 'Poppins-Regular',
                borderWidth: 1,
                borderColor: nameError
                  ? 'rgba(239, 68, 68, 0.5)'
                  : 'rgba(255, 255, 255, 0.2)',
              }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
            {nameError && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={14}
                  color="#ef4444"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    color: '#ef4444',
                    fontSize: 12,
                    fontFamily: 'Poppins-Regular',
                  }}
                >
                  {nameError}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
            style={{
              backgroundColor: isValid && !isLoading
                ? '#3b82f6'
                : 'rgba(59, 130, 246, 0.5)',
              borderRadius: 8,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              opacity: isValid && !isLoading ? 1 : 0.6,
            }}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontFamily: 'Poppins-SemiBold',
                    marginLeft: 8,
                  }}
                >
                  Setting up...
                </Text>
              </>
            ) : (
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'Poppins-SemiBold',
                }}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

