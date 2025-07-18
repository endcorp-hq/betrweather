import { View, Text } from "react-native";
import { TopBarWalletMenu } from "./top-bar-ui";
import theme from '../../theme';

export function TopBar() {
  return (
    <View style={{
      backgroundColor: theme.colors.surfaceContainerHigh,
      height: 80,
      flexDirection: 'row',
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    }}>
      <Text className="text-white text-[24px] font-better-extra-bold">BetrWeather</Text>
      <TopBarWalletMenu />
    </View>
  );
}
