import React from "react";
import { TouchableOpacity, View, Keyboard, Platform } from "react-native";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const TAB_BAR_HEIGHT = 62;
const ICON_SIZE = 24;
const ACTIVE_ICON_SCALE = 0.7;

const SECONDARY_COLOR = "rgba(139, 92, 246, 0.15)";
const ACTIVE_BORDER_COLOR = "rgba(139, 92, 246, 0.4)";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt as any, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt as any, () => setKeyboardVisible(false));
    return () => {
      // @ts-ignore remove compat
      showSub?.remove?.();
      // @ts-ignore remove compat
      hideSub?.remove?.();
    };
  }, []);

  if (keyboardVisible) return null;
  return (
    <View
      className="absolute left-4 right-4 bottom-4 z-50"
      style={{
        height: TAB_BAR_HEIGHT,
      }}
    >
      {/* Main tab bar container with glass effect */}
      <View
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 40,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 100,
        }}
      >
        {/* Blur background */}
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 40,
          }}
        />
        
        {/* Dark overlay for better contrast */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 40,
          }}
        />
        
        {/* Border */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 40,
          }}
        />
        
        {/* Tab row */}
        <View
          className="flex-1 flex-row items-center justify-between"
          style={{ 
            height: '100%',
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let iconName: any = "circle";
            let activeColor = "#8b5cf6"; // Purple for consistency
            if (route.name === "Weather") {
              iconName = "cloud";
              activeColor = "#3b82f6"; // Blue for weather
            }
            if (route.name === "Markets") {
              iconName = "finance";
              activeColor = "#10b981"; // Green for markets/betting
            }
            if (route.name === "Trades") {
              iconName = "face-man";
              activeColor = "#f59e0b"; // Amber for profile
            }

            // Animate icon scale on focus
            const scale = isFocused ? ACTIVE_ICON_SCALE : 1;

            return (
              <AnimatedTouchableOpacity
                layout={LinearTransition.springify().mass(0.5)}
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                activeOpacity={0.85}
                className={`flex-1 flex-row gap-x-1 items-center justify-center rounded-[30px]`}
                style={{ 
                  height: TAB_BAR_HEIGHT / 1.5, 
                  backgroundColor: isFocused ? SECONDARY_COLOR : "transparent",
                  borderWidth: isFocused ? 1 : 0,
                  borderColor: isFocused ? ACTIVE_BORDER_COLOR : "transparent",
                }}
              >
                <Animated.View style={{ transform: [{ scale }] }}>
                  {route.name === "Weather" ? (
                    <MaterialIcons
                      name={iconName}
                      size={ICON_SIZE}
                      color={
                        isFocused ? activeColor : "rgba(255, 255, 255, 0.6)"
                      }
                    />
                  ) : (
                    <MaterialCommunityIcon
                      name={iconName}
                      size={ICON_SIZE}
                      color={
                        isFocused ? activeColor : "rgba(255, 255, 255, 0.6)"
                      }
                    />
                  )}
                </Animated.View>
                {isFocused && (
                <Animated.Text
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  className="text-white text-xs font-better-regular"
                  style={{ color: activeColor, fontWeight: '600' }}
                >
                  {label as string}
                </Animated.Text>
              )}
              </AnimatedTouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

