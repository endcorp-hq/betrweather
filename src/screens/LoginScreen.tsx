import { View, Text, TouchableOpacity } from "react-native";
import { useMobileWallet } from "../utils/useMobileWallet";
import { useState } from "react";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { connect } = useMobileWallet();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connect();
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
    <View className="flex-1 items-center justify-center">
      <View className="flex-col items-center justify-center">
        <Text className="text-white font-better-extra-bold text-[50px]">
          BetrWeather
        </Text>
        <Text className="text-white font-better-regular text-lg">
          Bringing weather to the markets
        </Text>
       
      </View>
      <TouchableOpacity
        className="text-black px-10 h-[50px] w-[200px] mt-10 bg-accent-light border flex items-center justify-center rounded-full"
        onPress={handleConnect}
      >
        <Text className="text-lg font-better-regular">{isLoading ? "Loading..." : "Connect Wallet"}</Text>
      </TouchableOpacity>
    </View>
    </ScreenWrapper>
  );
}
