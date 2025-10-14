import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getJWTTokens,
  getPublicKeyFromAddress,
  storeJWTTokens,
} from "../utils/authUtils";
import { tokenManager } from "../utils/tokenManager";
import { checkUserStatus, signInUser, signUp } from "../utils/signInUtils";
import { Account } from "../types/solana-types";
import { STORAGE_KEYS } from "../utils/constants";
import { toast } from "../utils/toastUtils";
import { useUser } from "./useUser";

export function useBackendAuth() {
  const queryClient = useQueryClient();
  const { updateUserData } = useUser();
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);

  // Check if user has valid JWT tokens
  const { data: jwtTokens, isLoading: isCheckingTokens } = useQuery({
    queryKey: [STORAGE_KEYS.JWT_TOKENS],
    queryFn: getJWTTokens,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Backend signup mutation
  const signupMutation = useMutation({
    mutationFn: async ({
      publicKey,
      signature,
      payload,
      userData,
    }: {
      publicKey: string;
      signature: string;
      payload: string;
      userData?: { name: string; email: string };
    }) => {
      try {
        console.log("userData", userData);
        const result = await signUp(publicKey, signature, payload, userData);
        const tokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt,
          expiresAt: result.expiresAt,
          walletAddress: result.user.wallet,
        };

        //the order is crucial here. If alternated the useUser hook causes a rerender.
        await storeJWTTokens(tokens);
        await updateUserData(result.user);
        return result;
      } finally {
        // isSignupInProgressRef.current = false;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEYS.JWT_TOKENS] });
      setIsBackendAuthenticated(true);
      toast.success("Signup successful!");
    },
    onError: (error) => {
      console.error("Backend signup failed:", error);
      if (!error.message.includes("already in progress")) {
        toast.error("Backend authentication failed");
      }
      setIsBackendAuthenticated(false);
    },
  });

  // Backend signin mutation
  const signinMutation = useMutation({
    mutationFn: async ({
      publicKey,
      signature,
      payload,
    }: {
      publicKey: string;
      signature: string;
      payload: string;
    }) => {
      try {
        const result = await signInUser(publicKey, signature, payload);
        const tokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt,
          expiresAt: result.expiresAt,
          walletAddress: result.user.wallet,
        };
        await storeJWTTokens(tokens);
        await updateUserData(result.user);
        return result;
      } catch (error) {
        console.error("Backend signin failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEYS.JWT_TOKENS] });
      setIsBackendAuthenticated(true);
      // toast.success("Signin successful!");
    },
    onError: (error) => {
      console.error("Backend signin failed:", error);
      if (!error.message.includes("already in progress")) {
        toast.error("Backend authentication failed");
      }
      setIsBackendAuthenticated(false);
    },
  });

  // Backend User check mutation
  const checkUserMutation = useMutation({
    mutationFn: async (account: Account) => {
      const publicKey = getPublicKeyFromAddress(account.address);
      return await checkUserStatus(publicKey);
    },
    onSuccess: (result) => {
      if (result.userExists && !result.ownershipProved) {
        // User exists but needs to prove ownership
        // toast.info("Please sign a message to prove ownership");
      }
    },
    onError: (error) => {
      if (!error.message.includes("already in progress")) {
        console.error("Check user failed:", error);
      }
    },
  });

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const success = await tokenManager.refreshTokens();
      if (success) {
        await queryClient.refetchQueries({
          queryKey: [STORAGE_KEYS.JWT_TOKENS],
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }, [queryClient]);

  //   // Background refresh effect (runs every minute to check if refresh is needed)
    // useEffect(() => {
    //   if (!jwtTokens) return;

    //   const interval = setInterval(async () => {
    //     if (tokenManager.shouldRefresh(jwtTokens)) {
    //         console.log("Refreshing tokens at", new Date().toLocaleString());
    //       await refreshTokens();
    //     }
    //   }, 60000); // Check every minute

    //   return () => clearInterval(interval);
    // }, [jwtTokens]);

  // Handle backend authentication for a wallet with ref guard
  //   const handleBackendAuth = useCallback(
  //     async (account: Account) => {
  //       const walletAddress = account.publicKey.toBase58();

  //       // Guard: Only process if it's a new wallet
  //     //   if (lastProcessedWalletRef.current === walletAddress) {
  //     //     console.log("Same wallet, skipping auth check");
  //     //     return;
  //     //   }

  //     //   lastProcessedWalletRef.current = walletAddress;
  //     //   console.log("Processing new wallet:", walletAddress);

  //       if (!account.address) {
  //         setIsBackendAuthenticated(false);
  //         return;
  //       }

  //       // Guard: prevent multiple auth checks
  //       if (isCheckingAuth) {
  //         console.log("Backend auth already in progress, dropping request");
  //         return;
  //       }

  //       setIsCheckingAuth(true);

  //       try {
  //         // Check if we have valid tokens for this specific wallet
  //         const storedTokens = await getJWTTokens();
  //         if (storedTokens && tokenManager.isRefreshTokenValid(storedTokens)) {
  //           // Check if the stored wallet matches the current selected account
  //           if (storedTokens?.walletAddress === account.publicKey.toBase58()) {
  //             // Same wallet, tokens are valid
  //             setIsBackendAuthenticated(true);
  //             setIsCheckingAuth(false);
  //             return;
  //           }
  //         }

  //         // Check if user exists
  //         const userStatus = await checkUserMutation.mutateAsync(account);
  //         if (userStatus.userExists) {
  //           // User exists, sign them in
  //           await signinMutation.mutateAsync({ account });
  //         } else {
  //           console.log("user doesn't exist, they need to sign up");
  //           // User doesn't exist, they need to sign up
  //           const storedData = await AsyncStorage.getItem(
  //             STORAGE_KEYS.TEMPORARY_USER
  //           );
  //           if (storedData) {
  //             const parsedData = JSON.parse(storedData);
  //             console.log("parsedData", parsedData);

  //             await signupMutation.mutateAsync({
  //               account,
  //               userData: {
  //                 name: parsedData.name,
  //                 email: parsedData.email,
  //               },
  //             });
  //           }
  //           setIsBackendAuthenticated(false);
  //         }
  //       } catch (error) {
  //         console.error("Backend authentication error:", error);
  //         setIsBackendAuthenticated(false);
  //       } finally {
  //         setIsCheckingAuth(false);
  //       }
  //     },
  //     [checkUserMutation, signinMutation, signupMutation, isCheckingAuth]
  //   );

  //   // Listen to selectedAccount changes - only when address actually changes
  //   useEffect(() => {
  //     if (selectedAccount?.publicKey.toBase58()) {
  //       handleBackendAuth(selectedAccount);
  //     } else {
  //       // Clear the last processed wallet when no account
  //     //   lastProcessedWalletRef.current = null;
  //       setIsBackendAuthenticated(false);
  //     }
  //   }, [selectedAccount?.publicKey.toBase58()]);

  // Manual signup function (called from UI)
  const signupWithBackend = useCallback(
    async (
      publicKey: string,
      signature: string,
      payload: string,
      userData: { name: string; email: string }
    ) => {
      await signupMutation.mutateAsync({
        publicKey,
        signature,
        payload,
        userData,
      });
    },

    [signupMutation]
  );

  // Manual signin function (called from UI)
  const signinWithBackend = useCallback(
    async (publicKey: string, signature: string, payload: string) => {
      await signinMutation.mutateAsync({ publicKey, signature, payload });
    },
    [signinMutation]
  );

  return {
    isBackendAuthenticated,
    isCheckingTokens,
    signupWithBackend,
    signinWithBackend,
    refreshTokens,
    jwtTokens,
    isSigningUp: signupMutation.isPending,
    isSigningIn: signinMutation.isPending,
    isCheckingUser: checkUserMutation.isPending,
  };
}
