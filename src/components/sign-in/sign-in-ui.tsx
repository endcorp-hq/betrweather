import { useState, useCallback } from "react";
import { Text, TouchableOpacity } from "react-native";
import { useAuthorization, useMobileWallet } from "@/hooks";
import { useToast } from "@/contexts";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { generateSecureSignInPayload } from "@/utils";

export function ConnectButton({ selectedChain }: { selectedChain: Chain }) {
  const { authorizeSession } = useAuthorization();
  const { connect } = useMobileWallet();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  const { toast } = useToast();
  
  const handleConnectPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);

      await connect(selectedChain);
    } catch (err: any) {
      toast.error(
        "Error during connect",
        err instanceof Error ? err.message : err
      );
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [authorizationInProgress, authorizeSession, selectedChain, connect]); // Add selectedChain and connect
  
  return (
    <TouchableOpacity
      onPress={handleConnectPress}
      disabled={authorizationInProgress}
      activeOpacity={0.8}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        backgroundColor: "transparent",
        paddingHorizontal: 24,
        paddingVertical: 12,
        minWidth: 120,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Button text */}
      <Text
        style={{
          color: "white",
          fontSize: 16,
          fontWeight: "600",
          zIndex: 1,
        }}
        className="font-better-medium"
      >
        {authorizationInProgress ? "Connecting..." : "Connect"}
      </Text>
    </TouchableOpacity>
  );
}

export function SignInButton({ selectedChain }: { selectedChain: Chain }) {
  const { signIn } = useMobileWallet();
  const { toast } = useToast();
  const [signInInProgress, setSignInInProgress] = useState(false);

  const handleConnectPress = useCallback(async () => {
    let loadingToastId: string | undefined;

    try {
      if (signInInProgress) {
        return;
      }
      setSignInInProgress(true);

      // Generate secure sign-in payload
      const securePayload = generateSecureSignInPayload();
      await signIn(securePayload, selectedChain);
    } catch (err: any) {
      toast.error(
        "Error during sign in",
        err instanceof Error ? err.message : err,
        { id: loadingToastId }
      );
    } finally {
      setSignInInProgress(false);
    }
  }, [signInInProgress, selectedChain, signIn, toast]);

  return (
    <TouchableOpacity
      onPress={handleConnectPress}
      disabled={signInInProgress}
      activeOpacity={0.8}
      className="relative overflow-hidden w-[120px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
    >
      <Text className="font-better-medium text-white text-base text-nowrap">
        {signInInProgress ? "Signing in..." : "Sign in"}
      </Text>
    </TouchableOpacity>
  );
}
