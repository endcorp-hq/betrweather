import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { TopBar } from "../components/top-bar/top-bar-feature";
import { HomeScreen } from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MarketScreen from "../screens/MarketScreen";
import { CustomTabBar } from "../components/ui/CustomTabBar";
import { useAuthorization } from "../utils/useAuthorization";
import { Text } from "react-native";
import { View } from "react-native";
import { ConnectButton } from "../components/sign-in/sign-in-ui";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import { DefaultBg } from "../components/ui/ScreenWrappers/DefaultBg";

const Tab = createBottomTabNavigator();

/**
 * This is the main navigator with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 */
// type WalletGuardedScreenProps = {
//   component: React.ComponentType<any>;
//   tabName: string;
// };
// function WalletGuardedScreen({ component: Component, tabName }: WalletGuardedScreenProps) {
//   const { selectedAccount } = useAuthorization();
//   const navigation = useNavigation<BottomTabNavigationProp<any>>();
//   useEffect(() => {
//     if (!selectedAccount) {
//       Alert.alert(
//         "Wallet Required",
//         "Please connect your wallet to access this feature.",
//         [
//           {
//             text: "OK",
//             onPress: () => navigation.navigate("Weather"),
//           },
//         ]
//       );
//     }
//   }, [selectedAccount]);
//   if (!selectedAccount) return null;
//   return <Component />;
// }

// GuardedScreen: renders children if wallet connected, else shows centered connect button
function GuardedScreen({ children }: { children: React.ReactNode }) {
  const { selectedAccount } = useAuthorization();

  if (selectedAccount) return <DefaultBg>{children}</DefaultBg>;
  // Add message above the connect button, both centered
  return (
    <DefaultBg>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent",
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text className="text-white text-4xl font-better-semi-bold">
            BetrWeather
          </Text>
          <Text
            style={{
              color: require("../theme").default.colors.onSurface,
              fontSize: 14,
              fontWeight: "200",
              marginBottom: 16,
              marginTop: 8,
            }}
            className="font-better-medium"
          >
            Connect your wallet for further access
          </Text>
          <ConnectButton />
        </View>
      </View>
    </DefaultBg>
  );
}

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
          route.name === "AI Models" ||
          route.name === "Profile" ||
          route.name === "MarketDetail" ? (
            <TopBar />
          ) : null,
        headerShown:
          route.name === "Markets" ||
          route.name === "AI Models" ||
          route.name === "Profile" ||
          route.name === "MarketDetail",
      })}
    >
      <Tab.Screen name="Weather" component={HomeScreen} />
      <Tab.Screen name="Markets" component={MarketsGuarded} />
      <Tab.Screen name="AI Models" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileGuarded} />
    </Tab.Navigator>
  );
}
