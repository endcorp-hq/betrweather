import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  Button,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
// OLD WALLET ADAPTER IMPORTS - KEPT FOR FUTURE USE
// import { useAuthorization } from "../../hooks/solana/useAuthorization";
// import { tokenManager } from "../../utils/tokenManager";
// import { useBackendAuth } from "src/hooks/useBackendAuth";
import { DefaultBg, LogoLoader } from "../ui";
import { UnifiedLoginButton } from "./sign-in-ui";
import { useChainToggle } from "../../hooks/useChainToggle";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import React, { useState, useEffect } from "react";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePrivy } from "@privy-io/expo";
import { useLogin } from "@privy-io/expo/ui";
import { usePrivyProfileSetupContext } from "../../contexts/PrivyProfileSetupProvider";
import { useToast } from "@/contexts";
import {
  getCachedAuthState,
  isAccessTokenValid,
  shouldCheckRefreshToken,
  clearAuthCache,
  setCachedPrivyUserId,
  setCachedAuthState,
} from "../../utils/authCache";
import { getPrivyAccessToken } from "../../utils/privyAuth";

// Chain Toggle Component
function ChainToggle({
  selectedChain,
  onToggle,
}: {
  selectedChain: Chain;
  onToggle: () => void;
}) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const progress = React.useRef(
    new Animated.Value(selectedChain.includes("mainnet") ? 0 : 1)
  ).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: selectedChain.includes("mainnet") ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedChain]);

  const translateX = React.useMemo(() => {
    const half = containerWidth / 2;
    return progress.interpolate({ inputRange: [0, 1], outputRange: [0, half] });
  }, [progress, containerWidth]);

  return (
    <View className="mb-12">
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row bg-black rounded-full p-1 w-48 mx-auto"
      >
        <View
          className="flex-1 relative rounded-full border border-primary"
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Sliding background (Animated) */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 9999,
              transform: [{ translateX }],
            }}
          />

          {/* Labels */}
          <View className="flex-row">
            <View className="flex-1 py-2 px-1">
              <Text
                className={`text-center text-base font-better-medium ${
                  selectedChain.includes("mainnet")
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                Mainnet
              </Text>
            </View>
            <View className="flex-1 py-2 px-1">
              <Text
                className={`text-center text-base font-better-medium ${
                  selectedChain === "solana:devnet"
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                Devnet
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Info text */}
      {/* <Text className="text-gray-400 font-better-medium text-base text-center mt-4 px-4">
        {selectedChain.includes("mainnet")
          ? "Mainnet requires Seeker or Superteam NFT"
          : "Open access on Devnet"}
      </Text> */}
    </View>
  );
}

// Wrapper component for Privy profile setup (no modal needed anymore)
function PrivyProfileSetupWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// GuardedScreen: renders children if wallet connected, else shows centered connect button
export default function GuardedScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  // OLD WALLET ADAPTER CODE - KEPT FOR FUTURE USE
  // const { selectedAccount, clearAuthorization } = useAuthorization();
  // const { jwtTokens } = useBackendAuth();
  const { selectedChain, toggleChain } = useChainToggle();
  const { isReady, user, logout: logoutWithPrivy } = usePrivy();
  const { login: loginWithPrivy } = useLogin();
  // Profile setup is handled by PrivyProfileSetupProvider - just read status here
  const { isSetupComplete, setupError, isLoading: isProfileSetupLoading } = usePrivyProfileSetupContext();
  const { toast } = useToast();

  // Cache-first auth state
  const [cacheAuthState, setCacheAuthState] = useState<'checking_cache' | 'authenticated' | 'unauthenticated' | 'verifying_session'>('checking_cache');
  const [hasCheckedCache, setHasCheckedCache] = useState(false);
  
  // Login handler with proper error handling
  const handleLogin = async () => {
    if (!isReady) {
      console.warn("Privy is not ready yet");
      toast.error("Not Ready", "Please wait for the app to initialize");
      return;
    }

    try {
      console.log("Login button pressed, attempting to login...");
      console.log("loginWithPrivy function:", typeof loginWithPrivy);
      
      if (!loginWithPrivy || typeof loginWithPrivy !== 'function') {
        throw new Error("Login function is not available. Please try refreshing the app.");
      }
      
      const session = await loginWithPrivy({
        loginMethods: ["google", "email", "twitter", "apple"],
      });
      console.log("User logged in successfully", session?.user);
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to login. Please try again.";
      toast.error("Login Failed", errorMessage);
    }
  };
  const effectiveSelectedChain: Chain = ENABLE_NETWORK_TOGGLE
    ? selectedChain
    : "solana:mainnet-beta";

  // Cache-first auth check: Read cache immediately on mount
  useEffect(() => {
    const checkCache = async () => {
      if (hasCheckedCache) return;
      
      try {
        const cached = await getCachedAuthState();
        
        // Scenario 1: No cache - show login immediately
        if (!cached.lastAuthState || !cached.privyUserId) {
          setCacheAuthState('unauthenticated');
          setHasCheckedCache(true);
          return;
        }

        // Scenario 2: Cache exists - check token validity
        const tokenValid = await isAccessTokenValid();
        const shouldCheckRefresh = await shouldCheckRefreshToken();

        if (tokenValid) {
          // Access token valid - show app content immediately
          setCacheAuthState('authenticated');
          setHasCheckedCache(true);
        } else if (!shouldCheckRefresh) {
          // Access token expired but refresh token probably still valid (< 25 days)
          // Show app content optimistically, refresh in background
          setCacheAuthState('authenticated');
          setHasCheckedCache(true);
        } else {
          // Last fetch > 25 days ago - need to verify refresh token
          // Show loading, then check Privy session
          setCacheAuthState('verifying_session');
          setHasCheckedCache(true);
        }
      } catch (error) {
        console.error('Error checking auth cache:', error);
        setCacheAuthState('unauthenticated');
        setHasCheckedCache(true);
      }
    };

    checkCache();
  }, [hasCheckedCache]);

  // Background verification: Check Privy session when ready
  useEffect(() => {
    const verifySession = async () => {
      // Only verify if we're in verifying_session state or if Privy is ready and we have cache
      if (!isReady) return;
      if (cacheAuthState !== 'verifying_session' && cacheAuthState !== 'authenticated') return;

      try {
        const cached = await getCachedAuthState();
        
        // Check if Privy user exists
        if (!user) {
          // No Privy user - session expired, clear cache and show login
          await clearAuthCache();
          setCacheAuthState('unauthenticated');
          return;
        }

        // Privy user exists - verify it matches cache
        if (cached.privyUserId && user.id !== cached.privyUserId) {
          // User ID mismatch - clear cache and show login
          await clearAuthCache();
          setCacheAuthState('unauthenticated');
          return;
        }

        // Try to get access token (Privy will refresh if needed)
        const token = await getPrivyAccessToken();
        if (!token) {
          // Failed to get token - session invalid
          await clearAuthCache();
          setCacheAuthState('unauthenticated');
          return;
        }

        // Session is valid - update cache and show app
        await setCachedPrivyUserId(user.id);
        await setCachedAuthState({ lastAuthState: 'authenticated' });
        setCacheAuthState('authenticated');
      } catch (error) {
        console.error('Error verifying session:', error);
        // On error, clear cache and show login
        await clearAuthCache();
        setCacheAuthState('unauthenticated');
      }
    };

    verifySession();
  }, [isReady, user, cacheAuthState]);

  // Handle errors: logout from Privy and show login screen
  const [hasHandledError, setHasHandledError] = useState(false);
  useEffect(() => {
    if (setupError && isReady && user && !hasHandledError) {
      console.error("Backend login failed, logging out from Privy:", setupError);
      setHasHandledError(true);
      // Clear cache on error before logout
      clearAuthCache().catch((err) => {
        console.error("Error clearing cache:", err);
      });
      // Logout from Privy to clear the session
      logoutWithPrivy().catch((err) => {
        console.error("Error logging out from Privy:", err);
      });
      toast.error('Login Failed', setupError);
    }
    // Reset error handling flag when error is cleared
    if (!setupError) {
      setHasHandledError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupError, isReady, user]);

  // Entrance animations - MUST be declared before any conditional returns
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoScale = React.useRef(new Animated.Value(0.8)).current;
  const titleOpacity = React.useRef(new Animated.Value(0)).current;
  const titleTranslateY = React.useRef(new Animated.Value(20)).current;
  const buttonOpacity = React.useRef(new Animated.Value(0)).current;
  const buttonTranslateY = React.useRef(new Animated.Value(20)).current;

  // Shimmer animation for login button
  const shimmerTranslateX = React.useRef(new Animated.Value(-200)).current;
  const shimmerAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);

  // Animation effect - only runs when showing login screen
  React.useEffect(() => {
    // Only animate if we're showing the login screen (not authenticated, not loading)
    const shouldAnimate = isReady && !user && !isSetupComplete;
    
    if (!shouldAnimate) {
      // Reset animations if not showing login screen
      logoOpacity.setValue(0);
      logoScale.setValue(0.8);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(20);
      buttonOpacity.setValue(0);
      buttonTranslateY.setValue(20);
      shimmerTranslateX.setValue(-200);
      if (shimmerAnimationRef.current) {
        shimmerAnimationRef.current.stop();
        shimmerAnimationRef.current = null;
      }
      return;
    }

    // Sequence: Logo → Title → Button
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Title animation (after logo)
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Button animation (after title)
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Shimmer animation - continuous loop (starts after button appears)
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslateX, {
          toValue: 500, // Move from left to right (enough to cover button)
          duration: 2500, // Slower, more elegant shimmer
          useNativeDriver: true,
        }),
        Animated.timing(shimmerTranslateX, {
          toValue: -200, // Reset to start
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    
    shimmerAnimationRef.current = shimmerAnimation;
    
    // Start shimmer after button animation completes
    setTimeout(() => {
      shimmerAnimation.start();
    }, 1600); // Start after logo + title + button animations

    return () => {
      shimmerAnimation.stop();
      shimmerAnimationRef.current = null;
    };
  }, [isReady, user, isSetupComplete, logoOpacity, logoScale, titleOpacity, titleTranslateY, buttonOpacity, buttonTranslateY, shimmerTranslateX]);
  // OLD AUTH CHECK - KEPT FOR FUTURE USE
  // const [hasValidAuth, setHasValidAuth] = useState(true);

  const handleDiscordPress = React.useCallback(() => {
    Linking.openURL("https://discord.gg/p4QBXFeJFx");
  }, []);
  const handleTwitterPress = React.useCallback(() => {
    Linking.openURL("https://x.com/betrweather");
  }, []);

  // OLD AUTH CHECK - KEPT FOR FUTURE USE WITH WALLET ADAPTER
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     if (!selectedAccount || !jwtTokens) {
  //       setHasValidAuth(false);
  //       return;
  //     }
  //     // console.log("jwtTokens", !!jwtTokens.refreshToken, jwtTokens.refreshTokenExpiresAt);
  //     const refreshTokenValid = tokenManager.isRefreshTokenValid(jwtTokens);
  //     if (!refreshTokenValid) {
  //       console.log("Refresh token invalid, logging out user");
  //       await clearAuthorization();
  //       setHasValidAuth(false);
  //       return;
  //     }

  //     const accessTokenValid =
  //       jwtTokens.accessToken &&
  //       Date.now() < new Date(jwtTokens.expiresAt).getTime();

  //     // If access token is invalid but refresh token is valid, try to refresh
  //     if (!accessTokenValid && refreshTokenValid) {
  //       console.log("Access token invalid, attempting refresh");
  //       const refreshSuccess = await tokenManager.refreshTokens();
  //       setHasValidAuth(refreshSuccess);
  //     } else {
  //       setHasValidAuth(!!accessTokenValid);
  //     }
  //   };

  //   checkAuth();
  // }, [selectedAccount, jwtTokens, clearAuthorization]);

  // Decision tree based on cache-first approach:
  
  // 1. Still checking cache - show loading (only briefly, <100ms)
  if (cacheAuthState === 'checking_cache') {
    return (
      <DefaultBg>
        <PrivyProfileSetupWrapper>
          <LogoLoader showMessage={false} />
        </PrivyProfileSetupWrapper>
      </DefaultBg>
    );
  }

  // 2. Verifying session (scenario 4: >30 days) - show loading
  if (cacheAuthState === 'verifying_session') {
    return (
      <DefaultBg>
        <PrivyProfileSetupWrapper>
          <LogoLoader showMessage={false} />
        </PrivyProfileSetupWrapper>
      </DefaultBg>
    );
  }

  // 3. Authenticated from cache - show app content immediately
  // (Background verification will update if needed)
  if (cacheAuthState === 'authenticated') {
    // If Privy is ready and user exists and setup is complete, show app
    if (isReady && user && isSetupComplete && !setupError) {
      return (
        <DefaultBg>
          <PrivyProfileSetupWrapper>
            {children}
          </PrivyProfileSetupWrapper>
        </DefaultBg>
      );
    }
    
    // If Privy is still initializing or setup is in progress, show loading
    if (!isReady || (user && isProfileSetupLoading && !setupError)) {
      return (
        <DefaultBg>
          <PrivyProfileSetupWrapper>
            <LogoLoader showMessage={false} />
          </PrivyProfileSetupWrapper>
        </DefaultBg>
      );
    }
  }

  // 4. Unauthenticated - show login screen
  // (This covers: no cache, cache invalid, or verification failed)

  // OLD AUTH CHECK - KEPT FOR FUTURE USE WITH WALLET ADAPTER
  // if (hasValidAuth) {
  //   return <DefaultBg>{children}</DefaultBg>;
  // }

  // Show login screen
  return (
    <DefaultBg>
      <View className="flex-1 justify-center items-center">
        <View className="items-center ">
          {/* Logo with entrance animation */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              width: 152,
              height: 152,
              borderRadius: 76, // Half of width/height for perfect circle
              borderWidth: 1,
              borderColor: "#e6e8ea",
              backgroundColor: "#ffffff",
              justifyContent: "center",
              alignItems: "center",
              // Shadow for 3D effect
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Image
              source={require("../../../assets/logo/betrCloud.png")}
              style={{ width: 132, height: 132 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title with entrance animation */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text className="text-black text-3xl font-better-semi-bold mb-4 mt-14">
              BetrWeather
            </Text>
          </Animated.View>

          {ENABLE_NETWORK_TOGGLE ? (
            <ChainToggle selectedChain={selectedChain} onToggle={toggleChain} />
          ) : null}
          <View className="flex-row gap-4 justify-center">
            {/* Login button with shimmer and entrance animation */}
            <Animated.View
              style={{
                opacity: buttonOpacity,
                transform: [{ translateY: buttonTranslateY }],
              }}
            >
              <TouchableOpacity
                className="relative overflow-hidden min-w-[160px] flex items-center justify-center rounded-full bg-[#8b5cf6] border border-[#dfdfdf] p-3 text-center"
                onPress={handleLogin}
                disabled={!isReady}
                activeOpacity={0.7}
              >
                {/* Shimmer overlay - 45 degree diagonal gradient moving left to right */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: -200,
                    left: 0,
                    width: 150,
                    height: 500,
                    transform: [
                      { translateX: shimmerTranslateX },
                      { rotate: "45deg" },
                    ],
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={[
                      "transparent",
                      "rgba(200, 200, 200, 0.2)", // Light grey
                      "rgba(255, 255, 255, 0.4)", // Bright silver/white (center)
                      "rgba(200, 200, 200, 0.2)", // Light grey
                      "transparent",
                    ]}
                    locations={[0, 0.3, 0.5, 0.7, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flex: 1,
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </Animated.View>
                <Text className="font-better-medium text-white text-base text-nowrap relative z-10">
                  Log in
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
        {/* <View className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mx-4 mt-10">
          <Text className="text-white text-sm font-better-regular text-center">
            BetrWeather predictions are currently in beta.
          </Text>
          <Text className="text-white text-sm font-better-regular text-center mt-2">
            Login to connect your wallet. If you're new, you'll be prompted to
            create an account.
          </Text>
          <Text className="text-white text-sm font-better-regular text-center mt-2">
            Solana Seeker or Superteam NFT required to gain access.
          </Text>
          <View className="flex-row justify-center gap-3 mt-4 flex-wrap">
            <TouchableOpacity
              onPress={handleDiscordPress}
              activeOpacity={0.8}
              className="flex-row items-center px-4 py-2 rounded-full border border-white/25 bg-white/10"
            >
              <MaterialCommunityIcons
                name="discord"
                size={20}
                color="#7289da"
              />
              <Text className="text-white text-sm font-better-medium ml-2">
                Join Discord
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTwitterPress}
              activeOpacity={0.8}
              className="flex-row items-center px-6 py-4 rounded-full border border-white/25 bg-white/10"
            >
              <MaterialCommunityIcons
                name="alpha-x-circle-outline"
                size={20}
                color="#38bdf8"
              />
              <Text className="text-white text-sm font-better-medium ml-2">
                Follow on X
              </Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </View>
    </DefaultBg>
  );
}
