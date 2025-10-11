import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { das } from "@metaplex-foundation/mpl-core-das";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection, PublicKey } from "@solana/web3.js";

export type AuthResult = {
  authorized: boolean;
  tier: "seeker" | "superteam" | "none";
};

// Seeker Genesis Token addresses from official documentation
const SGT_METADATA_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_METADATA_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

// Our Whitelist NFTs
const whitelistNFTs = [
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

async function checkGenesisSeekerNFT(
  connection: Connection,
  walletAddress: string
) {
  try {
    console.log(`\n🔍 Checking for Seeker Genesis Token using official verification method`);
    console.log(`📋 Metadata Authority: ${SGT_METADATA_AUTHORITY}`);
    console.log(`📋 Metadata Address: ${SGT_METADATA_ADDRESS}`);
    
    // Test the connection first
    try {
      console.log(`🔗 Testing connection...`);
      const slot = await connection.getSlot();
      console.log(`✅ Connection successful, current slot: ${slot}`);
    } catch (connError) {
      console.error(`❌ Connection test failed:`, connError);
      return false;
    }
    
    console.log(`🔍 Using searchAssets API to find Seeker Genesis Token...`);
    
    // Use the searchAssets API as per official documentation
    let page = 1;
    let totalAssetsChecked = 0;
    
    while (true) {
      console.log(`📄 Checking page ${page}...`);
      
      const response = await fetch(`https://api.mainnet-beta.solana.com`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'searchAssets',
          params: {
            ownerAddress: walletAddress,
            tokenType: 'all',
            limit: 1000,
            page: page
          }
        })
      });

      const data = await response.json();
      const assets = data.result?.items || [];
      
      console.log(`📊 Found ${assets.length} assets on page ${page}`);
      
      if (assets.length === 0) {
        console.log(`📄 No more assets found, stopping search`);
        break;
      }
      
      totalAssetsChecked += assets.length;
      
      for (const asset of assets) {
        console.log(`🔍 Checking asset: ${asset.id}`);
        
        // Check for metadata pointer extension as per official docs
        const metadataPointer = asset.mint_extensions?.metadata_pointer;
        
        if (metadataPointer) {
          console.log(`📋 Found metadata pointer:`);
          console.log(`   Authority: ${metadataPointer.authority}`);
          console.log(`   Metadata Address: ${metadataPointer.metadata_address}`);
          
          if (metadataPointer.authority === SGT_METADATA_AUTHORITY &&
              metadataPointer.metadata_address === SGT_METADATA_ADDRESS) {
            console.log(`✅ SEEDER GENESIS TOKEN FOUND!`);
            console.log(`   Asset ID: ${asset.id}`);
            console.log(`   Mint: ${asset.mint}`);
            return true;
          }
        }
      }
      
      page++;
    }
    
    console.log(`\n❌ No Seeker Genesis Token found in wallet.`);
    console.log(`\n💡 Debugging info:`);
    console.log(`- Total assets checked: ${totalAssetsChecked}`);
    console.log(`- Pages searched: ${page - 1}`);
    console.log(`- Expected metadata authority: ${SGT_METADATA_AUTHORITY}`);
    console.log(`- Expected metadata address: ${SGT_METADATA_ADDRESS}`);
    
    return false;
  } catch (error) {
    console.error("❌ Error checking Seeker Genesis Token:", error);
    return false;
  }
}

async function checkSuperteamNFT(
  connection: Connection,
  walletAddress: string,
  collectionAddress: string
) {
  const umi = createUmi(connection.rpcEndpoint);

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

// Function to check whitelist NFTs for mainnet
export async function checkWhitelistNFTs(
  walletAddress: string,
  isMainnet: boolean = false
): Promise<AuthResult> {
  console.log(`\n🔍 Starting NFT whitelist check for wallet: ${walletAddress}`);
  console.log(`🌐 Network: ${isMainnet ? 'mainnet' : 'devnet'}`);
  
  // Only perform NFT checks on mainnet
  if (!isMainnet) {
    console.log(`⏭️  NFT check skipped - not on mainnet`);
    return {
      authorized: false,
      tier: "none",
    };
  }

  console.log(`🔗 Creating mainnet connection...`);
  // Create connection for mainnet
  const mainnetRpcUrl = `https://api.mainnet-beta.solana.com`;
  const connection = new Connection(mainnetRpcUrl);

  console.log(`🔍 Checking for Genesis Seeker NFT...`);
  const seekerAuth = await checkGenesisSeekerNFT(
    connection,
    walletAddress
  );

  if (seekerAuth) {
    console.log(`✅ Genesis Seeker NFT found - user authorized as seeker`);
    return {
      authorized: true,
      tier: "seeker",
    };
  } else {
    console.log(`❌ Genesis Seeker NFT not found, checking for Superteam NFT...`);
    const superteamAuth = await checkSuperteamNFT(
      connection,
      walletAddress,
      whitelistNFTs[0].mint
    );
    if (superteamAuth) {
      console.log(`✅ Superteam NFT found - user authorized as superteam`);
      return {
        authorized: true,
        tier: "superteam",
      };
    } else {
      console.log(`❌ Superteam NFT not found, checking for Superteam India NFT...`);
      const superteamIndiaAuth = await checkSuperteamNFT(
        connection,
        walletAddress,
        whitelistNFTs[1].mint
      );
      if (superteamIndiaAuth) {
        console.log(`✅ Superteam India NFT found - user authorized as superteam`);
        return {
          authorized: true,
          tier: "superteam",
        };
      }
      console.log(`❌ No whitelisted NFTs found - user not authorized`);
      return {
        authorized: false,
        tier: "none",
      };
    }
  }
}
