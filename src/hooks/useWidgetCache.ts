import { useCallback } from 'react';
import { NativeModules } from 'react-native';

const { WidgetBridge } = NativeModules;

export function useWidgetCache() {
  const saveWalletAddress = useCallback(async (address: string, network: string) => {
    try {
      console.log('this is widget cache', WidgetBridge)
      await WidgetBridge.saveUserSession(address, network);
      console.log('Wallet address saved to widget cache:', address);
    } catch (error) {
      console.error('Failed to save wallet address to widget cache:', error);
    }
  }, []);

  const removeWalletAddress = useCallback(async () => {
    try {
      console.log('this is widget cache', WidgetBridge)
      await WidgetBridge.clearUserSession(); // Clear wallet address
      console.log('Wallet address removed from widget cache');
    } catch (error) {
      console.error('Failed to remove wallet address from widget cache:', error);
    }
  }, []);

  const getWalletAddress = useCallback(async (): Promise<string | null> => {
    try {
      return await WidgetBridge.getWalletAddress();
    } catch (error) {
      console.error('Failed to get wallet address from widget cache:', error);
      return null;
    }
  }, []);

  return {
    saveWalletAddress,
    removeWalletAddress,
    getWalletAddress,
  };
}
