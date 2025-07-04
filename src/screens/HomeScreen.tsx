import React from "react";
import { View } from "react-native";
import { Text } from "react-native";
import "../../global.css";

import { Section } from "../Section";
import { useAuthorization } from "../utils/useAuthorization";
import { AccountDetailFeature } from "../components/account/account-detail-feature";
import { SignInFeature } from "../components/sign-in/sign-in-feature";

export function HomeScreen() {
  const { selectedAccount } = useAuthorization();

  return (
    <View className="flex-1 p-4">
      <Text className="text-white font-bold mb-3">
        Solana Mobile Expo Template
      </Text>
      {selectedAccount ? (
        <AccountDetailFeature />
      ) : (
        <>
          <Section
            title="Solana SDKs"
            description="Configured with Solana SDKs like Mobile Wallet Adapter and web3.js."
          />
          <Section
            title="UI Kit and Navigation"
            description="Utilizes React Native Paper components and the React Native Navigation library."
          />
          <Section
            title="Get started!"
            description="Connect or Sign in with Solana (SIWS) to link your wallet account."
          />
          <SignInFeature />
        </>
      )}
    </View>
  );
}
