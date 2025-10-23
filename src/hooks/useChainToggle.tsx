import { useState, useCallback, useEffect } from 'react';
import { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { useAuthorization } from './solana/useAuthorization';
import { ENABLE_NETWORK_TOGGLE } from 'src/config/featureFlags';

export function useChainToggle() {
  const { userSession } = useAuthorization();
  const [selectedChain, setSelectedChain] = useState<Chain>('solana:mainnet-beta');

  // Initialize and keep toggle in sync with stored session chain
  useEffect(() => {
    if (!ENABLE_NETWORK_TOGGLE) {
      setSelectedChain('solana:mainnet-beta');
      return;
    }
    const chain = userSession?.chain;
    if (!chain) return;
    const next: Chain = chain === 'mainnet' ? 'solana:mainnet-beta' : 'solana:devnet';
    setSelectedChain((prev) => (prev !== next ? next : prev));
  }, [userSession?.chain]);
  
  const toggleChain = useCallback(() => {
    if (!ENABLE_NETWORK_TOGGLE) return; // no-op when disabled
    setSelectedChain(prev => prev === 'solana:mainnet-beta' ? 'solana:devnet' : 'solana:mainnet-beta');
  }, []);
  
  const setChain = useCallback((chain: Chain) => {
    setSelectedChain(chain);
  }, []);
  
  const getChainIdentifier = useCallback(() => {
    if (!ENABLE_NETWORK_TOGGLE) return 'solana:mainnet-beta';
    return selectedChain === 'solana:mainnet-beta' ? 'solana:mainnet-beta' : 'solana:devnet';
  }, [selectedChain]);
  
  return {
    selectedChain,
    toggleChain,
    setChain,
    getChainIdentifier,
  };
} 