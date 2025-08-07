import { Connection, type ConnectionConfig } from "@solana/web3.js";
import React, {
  type FC,
  type ReactNode,
  useMemo,
  createContext,
  useContext,
} from "react";

export interface ConnectionProviderProps {
  children: ReactNode;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  config = { commitment: "confirmed" },
}) => {

  if(!process.env.EXPO_PUBLIC_SOLANA_RPC_URL) {
    throw new Error("EXPO_PUBLIC_SOLANA_RPC_URL is not set");
  }

  const connection = useMemo(
    () => new Connection(process.env.EXPO_PUBLIC_SOLANA_RPC_URL!, config),
    [config]
  );

  return (
    <ConnectionContext.Provider value={{ connection }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export interface ConnectionContextState {
  connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>(
  {} as ConnectionContextState
);

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext);
}
