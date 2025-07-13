// Polyfills
import "./src/polyfills";

import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { ShortxProvider } from "./src/solana/useContract";
import "./global.css";
import { CloudBackground } from "./src/components/ui/CloudBackground";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <ShortxProvider>
            <SafeAreaView className="font-better-regular flex-1 bg-sky-blue">
              <CloudBackground />
              <AppNavigator />
            </SafeAreaView>
          </ShortxProvider>
        </ConnectionProvider>
      </ClusterProvider>
    </QueryClientProvider>
  );
}
