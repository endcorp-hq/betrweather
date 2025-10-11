import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";

export async function getAssetInfo(args: {
  assetId: string;
  network?: string;
  dasRpc?: string;
}): Promise<any | null> {
  const { assetId, network = "devnet", dasRpc } = args;
  try {
    const rpcUrl = dasRpc || process.env.EXPO_PUBLIC_DAS_RPC || `https://api.${network}.solana.com`;
    const umi = createUmi(rpcUrl);
    umi.use(dasApi());
    const result = await (umi as any).rpc.getAsset({ id: publicKey(assetId) });
    return result;
  } catch (e) {
    console.warn("[DAS] getAsset failed", e);
    return null;
  }
}


