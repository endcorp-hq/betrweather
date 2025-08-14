import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Connection, type ConnectionConfig } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthorization } from '../hooks/solana/useAuthorization';

type NetworkEnvironment = 'mainnet' | 'devnet';

interface ChainContextType {
  currentChain: NetworkEnvironment | null;
  connection: Connection;
  rpcUrl: string;
  isLoading: boolean;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

interface ChainProviderProps {
  children: ReactNode;
  config?: ConnectionConfig;
}

const RPC_URLS = {
  mainnet: process.env.EXPO_PUBLIC_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
  devnet: process.env.EXPO_PUBLIC_DEVNET_RPC_URL || "https://api.devnet.solana.com"
};


export const ChainProvider: React.FC<ChainProviderProps> = ({ 
  children, 
  config = { commitment: "confirmed" } 
}) => {
  const [currentChain, setCurrentChain] = useState<NetworkEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {selectedAccount} = useAuthorization();

  useEffect(() => {
    const initializeChain = async () => {
      try {
        setIsLoading(true);
        // First, check if user has a stored session with chain info
        const userSession = await AsyncStorage.getItem('authorization-cache');
        if (userSession) {
          const parsedSession = JSON.parse(userSession);
          if (parsedSession?.userSession?.chain) {
            setCurrentChain(parsedSession.userSession.chain);
            setIsLoading(false);
            return;
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading chain from storage:', error);
        // remove user session from async storage and relogin
        await AsyncStorage.removeItem('authorization-cache');
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    if(selectedAccount) {
      initializeChain();
    }
  }, [selectedAccount]);
  

  const connection = React.useMemo(() => {
    if (!currentChain) {
      // Return a default connection while loading to prevent crashes
      return new Connection(RPC_URLS.devnet, config);
    }
    
    const rpcUrl = RPC_URLS[currentChain];
    return new Connection(rpcUrl, config);
  }, [currentChain, config, isLoading]);

  const rpcUrl = currentChain ? RPC_URLS[currentChain] : null;

  return (
    <ChainContext.Provider value={{ currentChain, connection, rpcUrl, isLoading }}>
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
}; 