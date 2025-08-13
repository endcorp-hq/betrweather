import { Connection, type ConnectionConfig } from "@solana/web3.js";
import React, { type FC, type ReactNode, createContext, useContext } from "react";
import { useChain } from "./ChainProvider";

export interface ConnectionProviderProps {
  children: ReactNode;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
}) => {
  const { connection } = useChain(); // Use connection from ChainProvider

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
