// Polyfills
import "./src/polyfills";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { ShortxProvider } from "./src/solana/useContract";
import "./global.css";
import { CloudBackground } from "./src/components/ui/CloudBackground";
import { Toaster } from "sonner-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <ShortxProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
            <SafeAreaView className="font-better-regular flex-1 bg-sky-blue">
              <CloudBackground />
              <AppNavigator />
             
                <Toaster richColors />
         
            </SafeAreaView>
            </SafeAreaProvider>
            </GestureHandlerRootView>
          </ShortxProvider>
        </ConnectionProvider>
      </ClusterProvider>
    </QueryClientProvider>
  );
}
