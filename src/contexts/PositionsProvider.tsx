import React, { useMemo } from "react";
import { usePositions } from "../hooks/usePositions";
// OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
// import { useAuthorization } from "../hooks/solana/useAuthorization";
import { usePrivy } from "@privy-io/expo";

/**
 * Get wallet address from Privy user
 */
function getPrivyWalletAddress(privyUser: any): string | null {
  // Check linked accounts for wallet
  const walletAccount = privyUser?.linked_accounts?.find(
    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
  );
  if (walletAccount?.address) {
    return walletAccount.address;
  }
  
  // Fallback: check if user has embedded wallet directly
  if (privyUser?.wallet?.address) {
    return privyUser.wallet.address;
  }
  
  return null;
}

type PositionsContextValue = ReturnType<typeof usePositions>;

const PositionsContext = React.createContext<PositionsContextValue | null>(null);

export const PositionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
  // const { selectedAccount } = useAuthorization();
  const { user: privyUser, isReady } = usePrivy();
  const positions = usePositions();

  // Get wallet address from Privy
  const walletAddress = useMemo(() => {
    if (!privyUser || !isReady) {
      return null;
    }
    return getPrivyWalletAddress(privyUser);
  }, [privyUser, isReady]);

  React.useEffect(() => {
    if (!walletAddress) return;
    // Single background boot
    const t = setTimeout(() => { positions.refreshPositions().catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [walletAddress]);

  return (
    <PositionsContext.Provider value={positions}>{children}</PositionsContext.Provider>
  );
};

export function usePositionsContext(): PositionsContextValue {
  const ctx = React.useContext(PositionsContext);
  if (!ctx) throw new Error("usePositionsContext must be used within PositionsProvider");
  return ctx;
}


