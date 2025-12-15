import React, { useMemo } from "react";
// OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
// import { useAuthorization } from "../hooks/solana/useAuthorization";
import { usePrivy } from "@privy-io/expo";
import { usePositions } from "../hooks/usePositions";
import { timeStart } from "@/utils";

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

export const PositionsBoot: React.FC = () => {
  // OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
  // const { selectedAccount } = useAuthorization();
  const { user: privyUser, isReady } = usePrivy();
  const { refreshPositions } = usePositions();

  // Get wallet address from Privy
  const walletAddress = useMemo(() => {
    if (!privyUser || !isReady) {
      return null;
    }
    return getPrivyWalletAddress(privyUser);
  }, [privyUser, isReady]);

  React.useEffect(() => {
    if (!walletAddress) return;
    const t = setTimeout(() => {
      const tt = timeStart('Positions', 'bootRefresh');
      try { refreshPositions().finally(() => tt.end()); } catch { tt.end(); }
    }, 500);
    return () => clearTimeout(t);
  }, [walletAddress, refreshPositions]);

  return null;
};


