import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { DefaultBg } from "../components/ui";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function InfoScreen() {
  const navigation = useNavigation();

  const handleViewDocs = () => {
    Linking.openURL("https://betrweather.xyz/docs");
  };

  const handleVisitWebsite = () => {
    Linking.openURL("https://betrweather.xyz/");
  };

  const handleTwitterPress = () => {
    Linking.openURL("https://x.com/betrweather");
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:betrweather@endcorp.co");
  };

  return (
    <DefaultBg>
      <ScrollView className="flex-1 px-6 pt-8">
        {/* Back Button */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center self-start px-3 py-2 rounded-full border border-white/50 bg-white/8"
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color="white"
            />
            <Text className="font-better-regular text-white text-sm ml-2">
              Back
            </Text>
          </TouchableOpacity>
        </View>

        {/* Beta Notice - Same as login screen */}
        <View className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6">
          <Text className="text-white text-base font-better-regular text-center">
            BetrWeather predictions are currently in beta with a limited number of markets.
          </Text>
          <Text className="text-white text-base font-better-regular text-center mt-2">
           If you have any questions, or face any issues, please do not hesitate to reach out to us. 
          </Text>
        </View>

        {/* Action Tabs */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={handleViewDocs}
            className="bg-white/10 rounded-2xl p-6 mb-4 border border-white/20"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="book-open-variant" size={28} color="#60a5fa" />
                <Text className="text-white text-lg font-better-semi-bold ml-4">
                  View Documentation
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleVisitWebsite}
            className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="web" size={28} color="#a78bfa" />
                <Text className="text-white text-lg font-better-semi-bold ml-4">
                  Visit Website
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Social Icons */}
        <View className="mb-8">
          <Text className="text-white text-base font-better-semi-bold mb-4 text-center">
            Connect With Us
          </Text>
          <View className="flex-row justify-center gap-6">
            {/* X (Twitter) */}
            <TouchableOpacity
              onPress={handleTwitterPress}
              className="items-center justify-center bg-white rounded-full w-14 h-14"
              activeOpacity={0.7}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-black text-2xl font-better-bold">
                𝕏
              </Text>
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              onPress={handleEmailPress}
              className="items-center justify-center bg-white rounded-full w-14 h-14"
              activeOpacity={0.7}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons name="gmail" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </DefaultBg>
  );
}

