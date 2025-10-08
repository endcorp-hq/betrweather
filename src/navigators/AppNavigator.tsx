/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 */
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { HomeNavigator } from "./HomeNavigator";
import { StatusBar } from "expo-status-bar";
import MarketDetailScreen from "../screens/MarketDetailScreen";
import { TopBar } from "../components/top-bar/top-bar-feature";
import GuardedScreen from "../components/sign-in/guarded-screen";
import { LocationPermissionScreen } from "../screens/LocationPermissionScreen";

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 *
 */

type RootStackParamList = {
  LocationPermission: undefined;
  HomeStack: undefined;
  Settings: undefined;
  MarketDetail: { id: string; dbId?: string | null; marketId?: string | null; market?: any };
  // 🔥 Your screens go here
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator();

const GuardedDetailScreen = () => {
  return (
    <GuardedScreen>
      <MarketDetailScreen />
    </GuardedScreen>
  );
};

// Start with weather page by default, show permission screen only when needed
const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName="HomeStack">
      <Stack.Screen
        name="HomeStack"
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LocationPermission"
        component={LocationPermissionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MarketDetail"
        component={GuardedDetailScreen}
        options={{ headerShown: true, header: () => <TopBar /> }}
      />
    </Stack.Navigator>
  );
};

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = (props: NavigationProps) => {
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "transparent",
    },
  };

  return (
    <NavigationContainer theme={MyTheme} {...props}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppStack />
    </NavigationContainer>
  );
};
