import { View, Text, TouchableOpacity } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";
import { useAuthorization } from "../../hooks/solana/useAuthorization";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function TopBar() {
  return (
    <View
      className="flex-row justify-between items-center px-4 py-2 pt-20 bg-[#fcfcfc] border-b border-gray-200"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 10,
      }}
    >
      <View className="flex-row items-center flex-1 justify-between">
        <Text className="text-black text-[24px] font-better-bold">BetrWeather</Text>
      </View>
    </View>
  );
}
