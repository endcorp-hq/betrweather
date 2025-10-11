import React from "react";
import { usePositions } from "../hooks/usePositions";
import { useAuthorization } from "../hooks/solana/useAuthorization";

type PositionsContextValue = ReturnType<typeof usePositions>;

const PositionsContext = React.createContext<PositionsContextValue | null>(null);

export const PositionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedAccount } = useAuthorization();
  const positions = usePositions();

  React.useEffect(() => {
    if (!selectedAccount?.publicKey) return;
    // Single background boot
    const t = setTimeout(() => { positions.refreshPositions().catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [selectedAccount?.publicKey?.toBase58?.()]);

  return (
    <PositionsContext.Provider value={positions}>{children}</PositionsContext.Provider>
  );
};

export function usePositionsContext(): PositionsContextValue {
  const ctx = React.useContext(PositionsContext);
  if (!ctx) throw new Error("usePositionsContext must be used within PositionsProvider");
  return ctx;
}


