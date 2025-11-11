import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { TopBar } from "../components/top-bar/top-bar-feature";
import { HomeScreen } from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MarketScreen from "../screens/MarketScreen";
import { CustomTabBar } from "../components/ui/CustomTabBar";
import GuardedScreen from "../components/sign-in/guarded-screen";
import InfoScreen from "../screens/InfoScreen";

const Tab = createBottomTabNavigator();
function MarketsGuarded() {
  return (
    <GuardedScreen>
      <MarketScreen />
    </GuardedScreen>
  );
}
function ProfileGuarded() {
  return (
    <GuardedScreen>
      <ProfileScreen />
    </GuardedScreen>
  );
}

export function HomeNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Weather"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: () =>
          route.name === "Markets" ||
          route.name === "Profile" ||
          route.name === "MarketDetail" ? (
            <TopBar />
          ) : null,
        headerShown:
          route.name === "Markets" ||
          route.name === "Profile" ||
          route.name === "MarketDetail",
      })}
    >
      <Tab.Screen name="Weather" component={HomeScreen} />
      <Tab.Screen name="Markets" component={MarketsGuarded} />
      <Tab.Screen name="Profile" component={ProfileGuarded} />
      <Tab.Screen name="Info" component={InfoScreen} />
    </Tab.Navigator>
  );
}
