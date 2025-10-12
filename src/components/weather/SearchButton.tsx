import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, Dimensions, ScrollView, Keyboard, Pressable, Platform } from 'react-native';
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useDebounce } from '../../hooks';
  
interface Location {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

interface SearchButtonProps {
  onLocationSelect: (location: Location) => void;
  onSearchToggle: (isExpanded: boolean) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function SearchButton({ onLocationSelect, onSearchToggle }: SearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [suggestions, setSuggestions] = useState<Location[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animations
  const widthAnim = useRef(new Animated.Value(48)).current; // 48 = w-12
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputOpacityAnim = useRef(new Animated.Value(0)).current;
  const suggestionsAnim = useRef(new Animated.Value(0)).current;

  // Add ref for TextInput
  const inputRef = useRef<TextInput>(null);


  useEffect(() => {
    const loadSuggestions = async () => {
      if (debouncedSearchQuery.length < 3) {
        setSuggestions(null);
        return;
      }
      setIsLoading(true);
      setSuggestions(null);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/place-autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: debouncedSearchQuery,
          }),
        }
      );

      const data = await response.json();

      if(data.data.suggestions.length === 0 || data.error) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      if (data.data?.suggestions && data.data.suggestions.length > 0) {
        const locations: Location[] = await Promise.all(
          data.data.suggestions.slice(0, 20).map(async (prediction: any) => {
            const placeId = prediction.placePrediction.placeId;
            const placeName = prediction.placePrediction.structuredFormat.mainText.text;
            const secondaryText = prediction.placePrediction.structuredFormat.secondaryText.text;

            // Get place details from your backend
            const detailsResponse = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/google-weather/place-details`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  placeId: placeId,
                }),
              }
            );

            const detailsData = await detailsResponse.json();

            if (detailsData.data?.place?.location) {
              const { latitude, longitude } = detailsData.data.place.location;

              // Parse address components from secondary text
              const addressParts = secondaryText.split(', ');
              const country = addressParts[addressParts.length - 1];
              const state = addressParts.length > 1 ? addressParts[0] : undefined;

              return {
                name: placeName,
                country,
                state,
                lat: latitude,
                lon: longitude,
              };
            }
          })
        );
        setIsLoading(false);
        setSuggestions(locations);
      }
    };

    loadSuggestions();
  }, [debouncedSearchQuery]);


  //animation to expand search
  const expandSearch = () => {
    setIsExpanded(true);
    onSearchToggle(true);
    
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: screenWidth - 32, 
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(inputOpacityAnim, {
        toValue: 1,
        duration: 200,
        delay: 150,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    });
  };

  //animation to collapse search
  const collapseSearch = () => {
    setIsExpanded(false);
    onSearchToggle(false);
    setSearchQuery('');
    setSuggestions(null);
    setIsLoading(false);
    
    Keyboard.dismiss();
    inputRef.current?.blur();
    
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: 48,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(inputOpacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsExpanded(false);
    });
  };

  const handleLocationSelect = (location: Location) => {    
    // Use setTimeout to ensure keyboard dismissal completes before proceeding
    setTimeout(() => {
      onLocationSelect(location);
      collapseSearch();
    }, 50); // Small delay to ensure keyboard is fully dismissed
  };

  //seaerch button press
  const handlePress = () => {
    if (!isExpanded) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
      
      expandSearch();
    }
  };

  //effect to toggle visibility of suggestions dropdown
  useEffect(() => {
    if (suggestions && (suggestions.length > 0 || isLoading)) {
      Animated.timing(suggestionsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else if (debouncedSearchQuery.length >= 3 && !isLoading) {
      //show when no suggestions and not loading
      Animated.timing(suggestionsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else if(isLoading) {
      //show when loading
      Animated.timing(suggestionsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      // Hide dropdown when query is short
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [suggestions, isLoading, debouncedSearchQuery]);

  // Reset search when externally toggled off
  useEffect(() => {
    if (!isExpanded) {
      // Force reset to original size
      widthAnim.setValue(48);
      inputOpacityAnim.setValue(0);
      suggestionsAnim.setValue(0);
    }
  }, [isExpanded]);

  const noLocations = searchQuery.length >= 3 && !isLoading && suggestions && suggestions.length === 0;


  return (
    <View className='relative min-h-full'>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
          className=''
        >
          <Animated.View 
            style={{
              width: widthAnim,
              height: 48,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Search Icon */}
            <View style={{ 
              width: 48, 
              height: 48, 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'absolute',
              left: 0,
              zIndex: 1,
            }}>
              <MaterialCommunityIcon name="magnify" size={24} color="white" />
            </View>

            {/* Search Input */}
            <Animated.View style={{
              flex: 1,
              opacity: inputOpacityAnim,
              marginLeft: 48,
              marginRight: 12,
            }}>
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search for a city..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'Poppins-Regular',
                  height: 48,
                }}
                autoFocus={isExpanded}
                // Add these props to improve keyboard behavior
                returnKeyType="search"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // If there are suggestions, select the first one
                  if (suggestions && suggestions.length > 0) {
                    handleLocationSelect(suggestions[0]);
                  }
                }}
              />
            </Animated.View>

            {/* Close Button */}
            {isExpanded && (
              <TouchableOpacity 
                onPress={collapseSearch}
                style={{ 
                  width: 32, 
                  height: 32, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <MaterialCommunityIcon name="close" size={20} color="white" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      {/* Suggestions Dropdown */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          opacity: suggestionsAnim,
          transform: [
            {
              translateY: suggestionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
          zIndex: 1000,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          height: noLocations || isLoading || (suggestions &&suggestions?.length > 0) ? 'auto' : 0,
        }}
      >
        <ScrollView 
          style={{ height: '100%' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {isLoading && (
            <View className='p-4 items-center my-4'>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>Searching...</Text>
            </View>
          )}

          {!isLoading && searchQuery.length >= 3 && suggestions && suggestions.length === 0 && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>No locations found</Text>
            </View>
          )}

          {suggestions && suggestions.map((location, index) => (
            <Pressable
              key={`${location.name}-${location.country}-${index}`}
              onPress={() => {
                // Prevent keyboard from interfering with the press event
                inputRef.current?.blur();
                Keyboard.dismiss();
                handleLocationSelect(location);
              }}
              style={{
                padding: 16,
                borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              }}
              android_disableSound={true} // Disable Android sound for better UX
            >
              <Text className='text-white text-base font-better-medium'>
                {location.name}
              </Text>
              <Text className='text-white/60 text-base mt-1'>
                {location.state ? `${location.state}, ` : ''}{location.country}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
} 