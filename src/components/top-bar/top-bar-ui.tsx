import { Account, useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { useNavigation } from "@react-navigation/native";
import { ellipsify } from "../../utils/ellipsify";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, Text, TouchableOpacity, View, Modal } from "react-native";
import { useCluster } from "../cluster/cluster-data-access";
import Feather from 'react-native-vector-icons/Feather';
import theme from '../../theme';

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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderRadius: theme.borderRadius.xxl,
            padding: theme.spacing.xl,
            minWidth: 320,
            alignItems: 'center',
            ...theme.elevation.level4,
          }}>
            <Text style={{ color: theme.colors.onSurface, fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.lg, fontFamily: 'Poppins-Bold' }}>
              Wallet
            </Text>
            {selectedAccount && (
              <View style={{ marginBottom: theme.spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, fontFamily: 'Poppins-Regular' }}>Address</Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 16, fontFamily: 'Poppins-Bold', marginTop: 2, textAlign: 'center' }}>
                  {ellipsify(selectedAccount.publicKey.toBase58(), 8)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={copyAddressToClipboard}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceContainer,
                borderRadius: theme.borderRadius.lg,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.xl,
                marginBottom: theme.spacing.md,
                width: 220,
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
            >
              <Feather name="copy" size={22} color={theme.colors.primary} style={{ marginRight: 14 }} />
              <Text style={{ color: theme.colors.onSurface, fontSize: 16, fontFamily: 'Poppins-SemiBold' }}>Copy address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={viewExplorer}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceContainer,
                borderRadius: theme.borderRadius.lg,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.xl,
                marginBottom: theme.spacing.md,
                width: 220,
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
            >
              <Feather name="external-link" size={22} color={theme.colors.info} style={{ marginRight: 14 }} />
              <Text style={{ color: theme.colors.onSurface, fontSize: 16, fontFamily: 'Poppins-SemiBold' }}>View Explorer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await disconnect();
                closeMenu();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceContainer,
                borderRadius: theme.borderRadius.lg,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.xl,
                marginBottom: theme.spacing.md,
                width: 220,
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
            >
              <Feather name="log-out" size={22} color={theme.colors.error} style={{ marginRight: 14 }} />
              <Text style={{ color: theme.colors.error, fontSize: 16, fontFamily: 'Poppins-SemiBold' }}>Disconnect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={closeMenu}
              style={{ marginTop: theme.spacing.md }}
              activeOpacity={0.85}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontFamily: 'Poppins-SemiBold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
