import React from "react";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import { useBackendRelay } from "../hooks/useBackendRelay";

// Ensures JWT is fetched and cached ASAP after app start when user is signed-in
export const AuthWarmup: React.FC = () => {
  const { selectedAccount } = useAuthorization();
  const { ensureAuthToken } = useBackendRelay();

  React.useEffect(() => {
    if (!selectedAccount?.publicKey) return;
    // Warm the token in background; ignore errors (will retry on demand)
    (async () => {
      try { await ensureAuthToken(); } catch {}
    })();
  }, [selectedAccount?.publicKey?.toBase58?.()]);

  return null;
};


