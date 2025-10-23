export type AuthResult = {
  authorized: boolean;
  tier: "seeker" | "superteam" | "none";
};

// Keep a minimal stub for backward compatibility
export async function checkWhitelistNFTs(
  _walletAddress: string,
  _isMainnet: boolean = false
): Promise<AuthResult> {
  return { authorized: false, tier: "none" };
}
