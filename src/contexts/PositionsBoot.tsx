import React from "react";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import { usePositions } from "../hooks/usePositions";
import { timeStart } from "@/utils";

export const PositionsBoot: React.FC = () => {
  const { selectedAccount } = useAuthorization();
  const { refreshPositions } = usePositions();

  React.useEffect(() => {
    if (!selectedAccount?.publicKey) return;
    const t = setTimeout(() => {
      const tt = timeStart('Positions', 'bootRefresh');
      try { refreshPositions().finally(() => tt.end()); } catch { tt.end(); }
    }, 500);
    return () => clearTimeout(t);
  }, [selectedAccount?.publicKey?.toBase58?.()]);

  return null;
};


