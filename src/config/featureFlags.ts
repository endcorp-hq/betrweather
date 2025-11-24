export const ENABLE_NETWORK_TOGGLE: boolean = String(
  process.env.EXPO_PUBLIC_ENABLE_NETWORK_TOGGLE ?? ''
)
  .trim()
  .toLowerCase() === 'true';

// Gate any client-side on-chain SDK usage (shortx, direct RPC reads)
// Default false to ensure all RPC is handled by backend unless explicitly enabled
export const ENABLE_ONCHAIN_CLIENT: boolean = String(
  process.env.EXPO_PUBLIC_ENABLE_ONCHAIN_CLIENT ?? ''
)
  .trim()
  .toLowerCase() === 'true';


