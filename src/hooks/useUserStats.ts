import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "../hooks/solana/useAuthorization";
import { apiClient } from "../utils/apiClient";
import { getJWTTokens } from "../utils/authUtils";

export interface UserStats {
  wallet: string;
  name?: string;
  totalBets: number;
  betsWon: number;
  betsLost: number;
  streak: number;
  rank: number | null;
  winRate: number;
  totalBetAmountUSDCFormatted?: string;
  totalBetAmountSOLFormatted?: string;
  totalBetAmountBONKFormatted?: string;
  totalWonAmountUSDCFormatted?: string;
  totalWonAmountSOLFormatted?: string;
  totalWonAmountBONKFormatted?: string;
}

export function useUserStats() {
  const { selectedAccount } = useAuthorization();

  return useQuery({
    queryKey: ["user-stats", selectedAccount?.address],
    queryFn: async (): Promise<UserStats | null> => {
      if (!selectedAccount) return null;

      const jwt = await getJWTTokens();
      if (!jwt?.accessToken) return null;

      const response = await apiClient.request(
        `/users/stats?walletAddress=${selectedAccount.publicKey.toBase58()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status}`);
      }

      const data = await response.json();
      return data?.data || data; // support wrapped or direct response
    },
    enabled: !!selectedAccount,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}


