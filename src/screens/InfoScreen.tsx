import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, Image } from "react-native";
import { DefaultBg } from "../components/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function InfoScreen() {
  const handleDiscordPress = () => {
    Linking.openURL("https://discord.gg/p4QBXFeJFx");
  };

  const handleTwitterPress = () => {
    Linking.openURL("https://x.com/betrweather");
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:betrweather@endcorp.co");
  };

  return (
    <DefaultBg>
      <ScrollView
        className="flex-1 px-6 pt-10"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white/10 border border-white/10 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-3">
            <Image
              source={require("../../assets/logo/betrCloud.png")}
              style={{ width: 56, height: 56, marginRight: 16 }}
              resizeMode="contain"
            />
            <Text className="text-white text-3xl font-better-semi-bold text-left flex-1">
              Welcome to BetrWeather
            </Text>
          </View>
          <Text className="text-white/80 text-base font-better-regular text-left leading-6">
            We blend weather intelligence from a decentralized sensor network with on-chain prediction markets, so you can trade on hyper-local forecasts in real time.
          </Text>
        </View>

        <View className="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-5 mb-6">
          <View className="flex-row items-center justify-center mb-2">
            <MaterialCommunityIcons name="rocket-launch" size={20} color="#93c5fd" />
            <Text className="text-white font-better-semi-bold text-sm uppercase tracking-widest ml-2">
              Beta Release
            </Text>
          </View>
          <Text className="text-white text-base font-better-regular text-center leading-6">
            BetrWeather is live in select markets while we onboard stations and build out more expressive markets for different geographies. We'd love your feedback to help us shape the next release.
          </Text>
        </View>

        <View className="bg-white/8 border border-white/15 rounded-3xl p-6 mb-6 space-y-4">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="router-wireless" size={24} color="#a855f7" />
            <Text className="text-white text-lg font-better-semi-bold ml-3">
              Decentralized Weather Stations
            </Text>
          </View>
          <Text className="text-white/85 text-base font-better-regular leading-6">
            Our forecasts come from community-run hardware. When you get close to a weather station, the app pulls observations directly from that device, giving you hyper-local updates you can trust.
          </Text>
        </View>

        <View className="bg-white/8 border border-white/15 rounded-3xl p-6 mb-8 space-y-4">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="message-alert-outline" size={24} color="#34d399" />
            <Text className="text-white text-lg font-better-semi-bold ml-3">
              Tell Us What You Think
            </Text>
          </View>
          <Text className="text-white/85 text-base font-better-regular leading-6">
            Spot something off or have an idea? Reach out—every insight makes BetrWeather better for the community.
          </Text>
        </View>

        <View className="gap-y-4">
          <Text className="text-white text-base font-better-semi-bold text-center">
            Join the Conversation
          </Text>

          <TouchableOpacity
            onPress={handleDiscordPress}
            className="flex-row items-center justify-between bg-white/12 border border-white/20 rounded-2xl px-5 py-4"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="discord" size={26} color="#7289da" />
              <Text className="text-white text-lg font-better-semi-bold ml-4">
                Join us on Discord
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTwitterPress}
            className="flex-row items-center justify-between bg-white/12 border border-white/20 rounded-2xl px-5 py-4"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="alpha-x-circle-outline" size={26} color="#0ea5e9" />
              <Text className="text-white text-lg font-better-semi-bold ml-4">
                Follow us on X
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmailPress}
            className="flex-row items-center justify-between bg-white/12 border border-white/20 rounded-2xl px-5 py-4"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="email-send-outline" size={24} color="#f59e0b" />
              <View className="ml-4">
                <Text className="text-white text-lg font-better-semi-bold">
                  Need support?
                </Text>
                <Text className="text-white/70 text-sm font-better-regular mt-1">
                  betrweather@endcorp.co
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </DefaultBg>
  );
}

