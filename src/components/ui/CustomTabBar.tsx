import React from "react";
import { TouchableOpacity, View, Platform } from "react-native";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import theme from "../../theme";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const TAB_BAR_HEIGHT = 62;
const ICON_SIZE = 24;
const ACTIVE_ICON_SCALE = 0.7;

const SECONDARY_COLOR = "#130057";
const PRIMARY_COLOR = "#fff";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View
      className={`absolute left-4 right-4 bottom-4 z-50 shadow-lg bg-white flex-1 flex-row justify-center items-center  self-center shadow-black/20 rounded-[40px] px-3 py-3`}
      style={{
        height: TAB_BAR_HEIGHT,
        paddingBottom: Platform.OS === "ios" ? 18 : 8,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 18,
        shadowColor: theme.colors.primary,
        elevation: theme.elevation.level2.elevation,
      }}
    >

      {/* Tab row */}
      <View
        className="flex-1 flex-row items-center justify-between rounded-t-[22px] overflow-hidden z-30"
        style={{ height: TAB_BAR_HEIGHT }}
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
          let activeColor = theme.colors.primary;
          if (route.name === "Weather") {
            iconName = "cloud";
            activeColor = "#78a646"; // sky-blue
          }
          if (route.name === "Markets") {
            iconName = "finance";
            activeColor = "#78a646"; // accent-green
          }
          if (route.name === "Profile") {
            iconName = "face-man";
            activeColor = "#78a646";
          }
          if (route.name === "AI Models") {
            iconName = "robot-excited";
            activeColor = "#78a646"; // accent-green
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
              style={{ height: TAB_BAR_HEIGHT / 1.5, backgroundColor: isFocused ? SECONDARY_COLOR : "transparent" }}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                {route.name === "Weather" ? (
                  <MaterialIcons
                    name={iconName}
                    size={ICON_SIZE}
                    color={
                      isFocused ? activeColor : theme.colors.onSurfaceVariant
                    }
                  />
                ) : (
                  <MaterialCommunityIcon
                    name={iconName}
                    size={ICON_SIZE}
                    color={
                      isFocused ? activeColor : theme.colors.onSurfaceVariant
                    }
                  />
                )}
              </Animated.View>
              {isFocused && (
              <Animated.Text
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="text-white text-xs font-better-regular"
              >
                {label as string}
              </Animated.Text>
            )}
            </AnimatedTouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

