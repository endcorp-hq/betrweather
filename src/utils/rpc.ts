export type NetworkEnv = 'mainnet' | 'devnet' | 'mainnet-beta';
import { ENABLE_NETWORK_TOGGLE } from 'src/config/featureFlags';

export function resolveRpcUrl(network: NetworkEnv): string {
  const net = ENABLE_NETWORK_TOGGLE ? (network === 'mainnet-beta' ? 'mainnet' : network) : 'mainnet';

  const universalOverride = process.env.EXPO_PUBLIC_SOLANA_RPC_URL;
  if (universalOverride) return universalOverride;

  const host = net === 'mainnet' ? 'mainnet-beta' : 'devnet';
  return `https://api.${host}.solana.com`;
}