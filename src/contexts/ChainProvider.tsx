import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Connection, type ConnectionConfig } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthorization } from '../hooks/solana/useAuthorization';

type NetworkEnvironment = 'mainnet' | 'devnet';

interface ChainContextType {
  currentChain: NetworkEnvironment | null;
  connection: Connection | null;
  isLoading: boolean;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

interface ChainProviderProps {
  children: ReactNode;
  config?: ConnectionConfig;
}

export const ChainProvider: React.FC<ChainProviderProps> = ({ 
  children, 
  config = { commitment: "confirmed" } 
}) => {
  const [currentChain, setCurrentChain] = useState<NetworkEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {selectedAccount} = useAuthorization();
  const connectionRef = useRef<Connection | null>(null);

  // Cleanup function for connections
  const cleanupConnection = useCallback(() => {
    if (connectionRef.current) {
      try {
        // Dispose of the connection properly
        connectionRef.current;
        connectionRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up connection:', error);
      }
    }
  }, []);

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

  // Cleanup connection when component unmounts
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

  const connection = React.useMemo(() => {
    if (!currentChain) {
      return null;
    }
    
    const chainString = `https://${currentChain}.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    const rpcUrl = chainString;
    
    // Reuse existing connection if RPC endpoint is the same
    if (connectionRef.current && connectionRef.current.rpcEndpoint === rpcUrl) {
      return connectionRef.current;
    }
    
    // Create new connection only if endpoint changed
    const newConnection = new Connection(rpcUrl, config);
    connectionRef.current = newConnection;
    
    return newConnection;
  }, [currentChain, config]);

  return (
    <ChainContext.Provider value={{ currentChain, connection, isLoading }}>
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