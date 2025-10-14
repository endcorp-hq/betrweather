export type NetworkEnv = 'mainnet' | 'devnet' | 'mainnet-beta';

export function resolveRpcUrl(network: NetworkEnv): string {
  const net = network === 'mainnet-beta' ? 'mainnet' : network;

  const mainnetOverride = process.env.EXPO_PUBLIC_RPC_MAINNET;
  const devnetOverride = process.env.EXPO_PUBLIC_RPC_DEVNET;

  if (net === 'mainnet' && mainnetOverride) return mainnetOverride;
  if (net === 'devnet' && devnetOverride) return devnetOverride;

  const host = net === 'mainnet' ? 'mainnet-beta' : 'devnet';
  return `https://api.${host}.solana.com`;
}


