import { View, Text } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";


export function TopBar() {
  return (
    <View className="" style={{
      backgroundColor: 'transparent',
      opacity: 0.8,
      height: 80,
      flexDirection: 'row',
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 10, height: 10 },
      elevation: 2,
      borderBottomLeftRadius: 15,
      borderBottomRightRadius: 15,
    }}>
      <Text className="text-white/75 text-[24px] font-better-semi-bold">BetrWeather</Text>
      <TopBarWalletMenu />
    </View>
  );
}
