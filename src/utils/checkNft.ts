import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { das } from "@metaplex-foundation/mpl-core-das";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection, PublicKey } from "@solana/web3.js";

export type AuthResult = {
  authorized: boolean;
  tier: "seeker" | "superteam" | "none";
};

const RPC_ADDRESS = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";

// Our Whitelist NFTs
const whitelistNFTs = [
  {
    mint: "2DMMamkkxQ6zDMBtkFp8KH7FoWzBMBA1CGTYwom4QH6Z",
    type: "SPL-Token",
    name: "Seeker Phone",
  },
  {
    mint: "Str4rEwcTfvMRUsnF1mUEE5EMgaiBwpc5zw1axC9Ktk",
    type: "MPL-Core",
    name: "Superteam Member NFT",
  },
  {
    mint: "7SmirHfvSqyiYpnHC1T9TLMYvD19Bw5Wj7ECADXhz2F",
    type: "MPL-Core",
    name: "Superteam India Member NFT",
  },
];

async function checkSeekerPhoneNFT(
  walletAddress: string,
  seekerPhoneMint: string
) {
  const connection = new Connection(RPC_ADDRESS);

  try {
    console.log(`Checking for Seeker Phone NFT...`);
    const response = await connection.getTokenAccountsByOwner(
      new PublicKey(walletAddress),
      {
        mint: new PublicKey(seekerPhoneMint),
      }
    );

    if (response.value.length > 0) {
      console.log(`Seeker Phone NFT found`);
      return true;
    } else {
      console.log(`Seeker Phone NFT not found`);
      return false;
    }
  } catch (error) {
    console.error("Error checking Seeker Phone NFT:", error);
    return false;
  }
}

async function checkSuperteamNFT(
  walletAddress: string,
  collectionAddress: string
) {
  const umi = createUmi(RPC_ADDRESS);

  umi.use(dasApi());

  const assetsByCollection = await das.getAssetsByOwner(umi, {
    owner: publicKey(walletAddress),
  });

  for (const asset of assetsByCollection) {
    let updateAuth = asset.updateAuthority.address;
    if (updateAuth === collectionAddress) {
      console.log("Superteam NFT found");
      return true;
    } else {
      console.log("Superteam NFT not found");
      return false;
    }
  }
}

// Main function to check whitelist
export async function checkWhitelistNFTs(
  walletAddress: string
): Promise<AuthResult> {
  const seekerAuth = await checkSeekerPhoneNFT(
    walletAddress,
    whitelistNFTs[0].mint
  );

  if (seekerAuth) {
    return {
      authorized: true,
      tier: "seeker",
    };
  } else {
    console.log("Seeker Phone NFT not found, checking for Superteam NFT");
    const superteamAuth = await checkSuperteamNFT(
      walletAddress,
      whitelistNFTs[1].mint
    );
    if (superteamAuth) {
      return {
        authorized: true,
        tier: "superteam",
      };
    } else {
      const superteamIndiaAuth = await checkSuperteamNFT(
        walletAddress,
        whitelistNFTs[2].mint
      );
      if (superteamIndiaAuth) {
        return {
          authorized: true,
          tier: "superteam",
        };
      }
      return {
        authorized: false,
        tier: "none",
      };
    }
  }
}
