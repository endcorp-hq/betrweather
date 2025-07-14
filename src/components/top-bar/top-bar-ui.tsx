import { Account, useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { useNavigation } from "@react-navigation/native";
import { ellipsify } from "../../utils/ellipsify";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, Text, TouchableOpacity, View, Modal } from "react-native";
import { useCluster } from "../cluster/cluster-data-access";

export function TopBarWalletButton({
  selectedAccount,
  openMenu,
}: {
  selectedAccount: Account | null;
  openMenu: () => void;
}) {
  const { connect } = useMobileWallet();
  return (
    <TouchableOpacity onPress={selectedAccount ? openMenu : connect}>
      <View className="rounded-full px-6 py-2 shadow-wallet-button-shadow bg-accent-light border">
        <Text className="text-black font-better-semibold text-lg text-center">
          {selectedAccount
            ? ellipsify(selectedAccount.publicKey.toBase58())
            : "Connect"}
        </Text>
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
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View className="absolute top-20 right-4 bg-white rounded-lg shadow-lg min-w-48">
            <TouchableOpacity
              onPress={copyAddressToClipboard}
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
            >
              <Text className="text-lg mr-3">📋</Text>
              <Text className="text-gray-700 font-medium">Copy address</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={viewExplorer}
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
            >
              <Text className="text-lg mr-3">🔗</Text>
              <Text className="text-gray-700 font-medium">View Explorer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={async () => {
                await disconnect();
                closeMenu();
              }}
              className="flex-row items-center px-4 py-3"
            >
              <Text className="text-lg mr-3">❌</Text>
              <Text className="text-red-600 font-medium">Disconnect</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
