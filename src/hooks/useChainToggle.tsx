import { useState, useCallback } from 'react';
import { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';

export function useChainToggle() {
  const [selectedChain, setSelectedChain] = useState<Chain>('solana:devnet');
  
  const toggleChain = useCallback(() => {
    setSelectedChain(prev => prev === 'solana:mainnet-beta' ? 'solana:devnet' : 'solana:mainnet-beta');
  }, []);
  
  const setChain = useCallback((chain: Chain) => {
    setSelectedChain(chain);
  }, []);
  
  const getChainIdentifier = useCallback(() => {
    return selectedChain === 'solana:mainnet-beta' ? 'solana:mainnet-beta' : 'solana:devnet';
  }, [selectedChain]);
  
  return {
    selectedChain,
    toggleChain,
    setChain,
    getChainIdentifier,
  };
} 