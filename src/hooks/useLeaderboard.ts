import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/apiClient";

export interface LeaderboardEntry {
  wallet: string;
  name: string;
  winRate: number;
  totalBets: number;
  betsWon: number;
  betsLost: number;
  streak: number;
  rank: number;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const response = await apiClient.request("/users/leaderboard", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}
