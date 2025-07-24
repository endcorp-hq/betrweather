import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, Dimensions, ScrollView } from 'react-native';
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

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

// Debounce function
const debounce = <T extends (...args: any[]) => ReturnType<T>>(
  callback: T,
  timeout: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      callback(...args)
    }, timeout)
  }
}

export function SearchButton({ onLocationSelect, onSearchToggle }: SearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animations
  const widthAnim = useRef(new Animated.Value(48)).current; // 48 = w-12
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const inputOpacityAnim = useRef(new Animated.Value(0)).current;
  const suggestionsAnim = useRef(new Animated.Value(0)).current;

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      console.log('🔍 Searching for:', query);
      setIsLoading(true);
      setSuggestions([]); // Clear previous suggestions immediately
      
      try {
        const response = await fetch(
          `https://places.googleapis.com/v1/places:autocomplete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY || '',
            },
            body: JSON.stringify({
              input: query,
              includedPrimaryTypes: ['locality', 'administrative_area_level_2', 'administrative_area_level_1', 'postal_code', 'school_district']
            }),
          }
        );
        
        const data = await response.json();
        console.log('📍 Autocomplete response:', data);
        
        if (data.suggestions && data.suggestions.length > 0) {
          console.log('✅ Found predictions:', data.suggestions.length);
          const locations: Location[] = await Promise.all(
            data.suggestions.slice(0, 10).map(async (prediction: any) => {
              try {
                const placeId = prediction.placePrediction.placeId;
                const placeName = prediction.placePrediction.structuredFormat.mainText.text;
                const secondaryText = prediction.placePrediction.structuredFormat.secondaryText.text;
                
                // Get place details for coordinates
                const detailsResponse = await fetch(
                  `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,location`,
                  {
                    headers: {
                      'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY || '',
                    },
                  }
                );
                
                const detailsData = await detailsResponse.json();
                console.log('📍 Details for:', placeName, detailsData);
                
                if (detailsData.location) {
                  const { latitude, longitude } = detailsData.location;
                  
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
              } catch (error) {
                console.log('❌ Error fetching details for place:', prediction.placePrediction.placeId, error);
              }
              
              return null;
            })
          );
          
          // Filter out null results
          const validLocations = locations.filter(location => location !== null) as Location[];
          console.log('✅ Final locations:', validLocations);
          setSuggestions(validLocations);
        } else {
          console.log('❌ No predictions found or API error:', data);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('❌ Error fetching places:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 800), // 800ms debounce
    []
  );

  // Trigger debounced search when query changes
  useEffect(() => {
    if (searchQuery.length >= 3) {
      setSuggestions([]); // Clear immediately when query changes
      debouncedSearch(searchQuery);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [searchQuery, debouncedSearch]);

  const expandSearch = () => {
    setIsExpanded(true);
    onSearchToggle(true);
    
    // Animate width expansion to full screen width minus padding
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: screenWidth - 32, // Full width minus padding (16px on each side)
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(inputOpacityAnim, {
        toValue: 1,
        duration: 200,
        delay: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const collapseSearch = () => {
    setIsExpanded(false);
    onSearchToggle(false);
    setSearchQuery('');
    setSuggestions([]);
    setIsLoading(false);
    
    // Animate width collapse back to original size
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
      // Ensure we're back to the original state
      setIsExpanded(false);
    });
  };

  const handleLocationSelect = (location: Location) => {
    onLocationSelect(location);
    collapseSearch();
  };

  const handlePress = () => {
    if (!isExpanded) {
      // Scale animation on press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      expandSearch();
    }
  };

  const showSuggestions = () => {
    if (suggestions.length > 0 || isLoading) {
      Animated.timing(suggestionsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  useEffect(() => {
    if (suggestions.length > 0 || isLoading) {
      showSuggestions();
    } else if (searchQuery.length >= 3) {
      // Show "no results" state
      Animated.timing(suggestionsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      // Hide dropdown only when query is too short
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [suggestions, isLoading, searchQuery]);

  // Reset search when externally toggled off
  useEffect(() => {
    if (!isExpanded) {
      // Force reset to original size
      widthAnim.setValue(48);
      inputOpacityAnim.setValue(0);
      suggestionsAnim.setValue(0);
    }
  }, [isExpanded]);

  return (
    <View className='relative min-h-full '>
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
        }}
      >
        <ScrollView 
          style={{ height: '100%' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {isLoading && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>Searching...</Text>
            </View>
          )}

          {!isLoading && searchQuery.length >= 3 && suggestions && suggestions.length === 0 && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>No locations found</Text>
            </View>
          )}

          {suggestions.map((location, index) => (
            <TouchableOpacity
              key={`${location.name}-${location.country}-${index}`}
              onPress={() => handleLocationSelect(location)}
              style={{
                padding: 16,
                borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Poppins-Medium' }}>
                {location.name}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, marginTop: 2 }}>
                {location.state ? `${location.state}, ` : ''}{location.country}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
} 