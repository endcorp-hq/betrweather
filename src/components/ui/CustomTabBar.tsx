import React from "react";
import { TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="flex-row h-14">
      <View className=" bg-white/60 rounded-t-3xl flex-1 flex-row">
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
        if (route.name === "Weather") iconName = "weather-partly-cloudy";
        if (route.name === "Markets") iconName = "finance";
        if (route.name === "Profile") iconName = isFocused ? "account" : "account-outline";

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            className="flex-1 items-center justify-center"
          >
            <MaterialCommunityIcon name={iconName} size={isFocused ? 24 : 20} border={1} color={isFocused ? "#87CEFA" : "#888"} />
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}
