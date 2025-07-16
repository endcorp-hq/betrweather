import { View, Text } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";

export function TopBar() {
  return (
    <View className="bg-transparent h-20 flex-row px-4 items-center justify-between">
      <Text className="text-white text-[24px] font-better-extra-bold">BetrWeather</Text>
      <TopBarWalletMenu />
    </View>
  );
}
