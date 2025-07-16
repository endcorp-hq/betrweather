import React from "react";
import { TouchableOpacity, View, StyleSheet, Platform, Animated } from "react-native";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import theme from '../../theme';

const TAB_BAR_HEIGHT = 62;
const ICON_SIZE = 24;
const ACTIVE_ICON_SCALE = 1.10;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.outerWrapper}>
      <View style={styles.solidBg} />
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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
            iconName = "weather-partly-cloudy";
            activeColor = '#87CEFA'; // sky-blue
          }
          if (route.name === "Markets") {
            iconName = "finance";
            activeColor = '#78a646'; // accent-green
          }
          if (route.name === "Profile") {
            iconName = isFocused ? "account" : "account-outline";
            activeColor = theme.colors.primary;
          }

          // Animate icon scale on focus
          const scale = isFocused ? ACTIVE_ICON_SCALE : 1;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.tabButton}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <MaterialCommunityIcon
                  name={iconName}
                  size={ICON_SIZE}
                  color={isFocused ? activeColor : theme.colors.onSurfaceVariant}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    zIndex: 100,
    paddingHorizontal: 0,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    // Shadow for floating effect
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
  solidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TAB_BAR_HEIGHT,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    zIndex: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
});
