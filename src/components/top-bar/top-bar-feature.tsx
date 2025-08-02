import { View, Text } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";
import { useAuthorization } from "../../solana/useAuthorization";

export function TopBar() {
  const { selectedAccount } = useAuthorization();
  return (
    <View className="flex-row justify-between items-center px-4 py-2 pt-20 bg-black">
      <Text className="text-white text-[24px] font-better-bold">BetrWeather</Text>
      {selectedAccount && <TopBarWalletMenu />}
    </View>
  );
}
