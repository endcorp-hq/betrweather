import { View, Text } from "react-native";
import { useAuthorization } from "@/hooks";
import { DefaultBg } from "../ui";
import { SignInButton } from "./sign-in-ui";

// GuardedScreen: renders children if wallet connected, else shows centered connect button
export default function GuardedScreen({
  children,
}: {
  children: React.ReactNode;
}) {
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
              color: require("../../theme").default.colors.onSurface,
              fontSize: 14,
              fontWeight: "200",
              marginBottom: 16,
              marginTop: 8,
            }}
            className="font-better-medium"
          >
            Connect your wallet for further access
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            {/* <ConnectButton /> */}
            <SignInButton />
          </View>
        </View>
      </View>
    </DefaultBg>
  );
}
