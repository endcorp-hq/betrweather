import React from "react";
import { useMarkets } from "../hooks/useMarkets";

type MarketsContextValue = ReturnType<typeof useMarkets>;

const MarketsContext = React.createContext<MarketsContextValue | null>(null);

export const MarketsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const markets = useMarkets({ resolvedLastHours: 24, autoStart: true });
  return (
    <MarketsContext.Provider value={markets}>{children}</MarketsContext.Provider>
  );
};

export function useMarketsContext(): MarketsContextValue {
  const ctx = React.useContext(MarketsContext);
  if (!ctx) throw new Error("useMarketsContext must be used within MarketsProvider");
  return ctx;
}


