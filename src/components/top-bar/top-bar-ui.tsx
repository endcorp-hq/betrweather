import React, { useState } from "react";
import { Account, useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Linking, Text, TouchableOpacity, View, Modal } from "react-native";
import { useCluster } from "../cluster/cluster-data-access";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export function TopBarWalletButton({
  selectedAccount,
  openMenu,
}: {
  selectedAccount: Account | null;
  openMenu: () => void;
}) {
  const { connect } = useMobileWallet();
  return (
    <TouchableOpacity onPress={selectedAccount ? openMenu : connect} activeOpacity={0.8}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }}
      >
        <MaterialCommunityIcons 
          name="account-circle" 
          size={24} 
          color="white" 
        />
      </View>
    </TouchableOpacity>
  );
}

export function TopBarSettingsButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate("Settings");
      }}
      className="rounded-full p-3 bg-gray-200"
    >
      <Text className="text-gray-700 text-lg">⚙️</Text>
    </TouchableOpacity>
  );
}

export function TopBarWalletMenu() {
  const { selectedAccount } = useAuthorization();
  const { getExplorerUrl } = useCluster();
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const { disconnect } = useMobileWallet();

  const copyAddressToClipboard = async () => {
    if (selectedAccount) {
      await Clipboard.setStringAsync(selectedAccount.publicKey.toBase58());
    }
    closeMenu();
  };

  const viewExplorer = () => {
    if (selectedAccount) {
      const explorerUrl = getExplorerUrl(
        `account/${selectedAccount.publicKey.toBase58()}`
      );
      Linking.openURL(explorerUrl);
    }
    closeMenu();
  };

  // Helper function to format address with first 5 and last 5 characters
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  return (
    <>
      <TopBarWalletButton
        selectedAccount={selectedAccount}
        openMenu={openMenu}
      />
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <TouchableOpacity 
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 350,
              overflow: 'hidden',
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <View style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f0',
              position: 'relative',
            }}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={closeMenu}
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  zIndex: 1,
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingLeft: 40, // Make room for close button
              }}>
                {/* Wallet Address */}
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ 
                    color: '#666', 
                    fontSize: 12, 
                    marginBottom: 4,
                    fontFamily: 'Poppins-Regular',
                  }}>
                    Wallet Address
                  </Text>
                  <Text style={{ 
                    color: '#000', 
                    fontSize: 14, 
                    fontFamily: 'Poppins-SemiBold',
                  }}>
                    {selectedAccount ? formatAddress(selectedAccount.publicKey.toBase58()) : 'Not connected'}
                  </Text>
                </View>
                
                {/* Logout Button */}
                <TouchableOpacity
                  onPress={async () => {
                    await disconnect();
                    closeMenu();
                  }}
                  style={{
                    backgroundColor: '#fee2e2',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#fecaca',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ 
                    color: '#dc2626', 
                    fontSize: 14, 
                    fontFamily: 'Poppins-SemiBold',
                  }}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Section */}
            <View style={{ padding: 20 }}>
              {/* Copy Address Button */}
              <TouchableOpacity
                onPress={copyAddressToClipboard}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8f9fa',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name="content-copy" 
                  size={20} 
                  color="#000" 
                  style={{ marginRight: 12 }} 
                />
                <Text style={{ 
                  color: '#000', 
                  fontSize: 16, 
                  fontFamily: 'Poppins-SemiBold',
                }}>
                  Copy Address
                </Text>
              </TouchableOpacity>

              {/* View Explorer Button */}
              <TouchableOpacity
                onPress={viewExplorer}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8f9fa',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name="open-in-new" 
                  size={20} 
                  color="#000" 
                  style={{ marginRight: 12 }} 
                />
                <Text style={{ 
                  color: '#000', 
                  fontSize: 16, 
                  fontFamily: 'Poppins-SemiBold',
                }}>
                  View Explorer
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
