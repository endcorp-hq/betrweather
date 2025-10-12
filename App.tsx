// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ConnectionProvider,
  ToastProvider,
  TimezoneProvider,
  ChainProvider,
  MarketsProvider,
  PositionsProvider,
} from "@/contexts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ShortxProvider } from "./src/hooks/solana";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Font from 'expo-font';
import React from 'react';

import "./global.css";
import "react-native-reanimated";

// Ensure RNW uses class-based dark mode on web before app mounts
try { (StyleSheet as any).setFlag?.('darkMode', 'class'); } catch {}

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  React.useEffect(() => {
    Font.loadAsync({
      'Poppins-Black': require('./assets/fonts/Poppins-Black.ttf'),
      'Poppins-BlackItalic': require('./assets/fonts/Poppins-BlackItalic.ttf'),
      'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
      'Poppins-BoldItalic': require('./assets/fonts/Poppins-BoldItalic.ttf'),
      'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
      'Poppins-ExtraBoldItalic': require('./assets/fonts/Poppins-ExtraBoldItalic.ttf'),
      'Poppins-ExtraLight': require('./assets/fonts/Poppins-ExtraLight.ttf'),
      'Poppins-ExtraLightItalic': require('./assets/fonts/Poppins-ExtraLightItalic.ttf'),
      'Poppins-Italic': require('./assets/fonts/Poppins-Italic.ttf'),
      'Poppins-Light': require('./assets/fonts/Poppins-Light.ttf'),
      'Poppins-LightItalic': require('./assets/fonts/Poppins-LightItalic.ttf'),
      'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
      'Poppins-MediumItalic': require('./assets/fonts/Poppins-MediumItalic.ttf'),
      'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
      'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
      'Poppins-SemiBoldItalic': require('./assets/fonts/Poppins-SemiBoldItalic.ttf'),
      'Poppins-Thin': require('./assets/fonts/Poppins-Thin.ttf'),
      'Poppins-ThinItalic': require('./assets/fonts/Poppins-ThinItalic.ttf'),
    }).then(() => setFontsLoaded(true)).catch(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ToastProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <QueryClientProvider client={queryClient}>
        <ChainProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <ShortxProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                  <TimezoneProvider>
                    <MarketsProvider>
                      <PositionsProvider>
                        <AppNavigator />
                      </PositionsProvider>
                    </MarketsProvider>
                  </TimezoneProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
            </ShortxProvider>
          </ConnectionProvider>
        </ChainProvider>
      </QueryClientProvider>
      </ToastProvider>
    </View>
  );
}
