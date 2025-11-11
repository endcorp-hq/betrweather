import { View, Text, TouchableOpacity } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";
import { useAuthorization } from "../../hooks/solana/useAuthorization";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function TopBar() {
  const { selectedAccount } = useAuthorization();
  const navigation = useNavigation();

  const handleInfoPress = () => {
    navigation.navigate("Info" as never);
  };

  return (
    <View className="flex-row justify-between items-center px-4 py-2 pt-20 bg-black">
      <View className="flex-row items-center flex-1 justify-between">
        <Text className="text-white text-[24px] font-better-bold">BetrWeather</Text>
        <TouchableOpacity
          onPress={handleInfoPress}
          className="ml-3 p-1"
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="information-outline" 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      {selectedAccount && <TopBarWalletMenu />}
    </View>
  );
}
