import { useState, useCallback, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useAuthorization } from "../../hooks/solana/useAuthorization";
import {
  useMobileWallet,
  WALLET_CANCELLED_ERROR,
} from "../../hooks/useMobileWallet";
import { useToast } from "@/contexts";
import { Chain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { generateSecureSignInPayload, WALLET_ALREADY_REGISTERED_ERROR } from "@/utils";
import { useBackendAuth } from "src/hooks/useBackendAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "src/utils/constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ENABLE_NETWORK_TOGGLE } from "src/config/featureFlags";

const { height: screenHeight } = Dimensions.get("window");
const DEFAULT_CHAIN: Chain = (ENABLE_NETWORK_TOGGLE ? "solana:devnet" : "solana:mainnet-beta") as Chain;
const resolveChain = (chain?: Chain) => chain ?? DEFAULT_CHAIN;

// Login Drawer Component
export function SignupDrawer({
  isVisible,
  onClose,
  selectedChain,
  preSignedData,
}: {
  isVisible: boolean;
  onClose: () => void;
  selectedChain: Chain;
  preSignedData?: {
    publicKey: string;
    signature: string;
    payload: string;
  };
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [nameError, setNameError] = useState("");
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { selectedAccount, clearAuthorization } = useAuthorization();
  const { isBackendAuthenticated } = useBackendAuth();

  // Close drawer only after backend authentication (JWT issued),
  // not merely when a wallet is connected
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setName("");
    setEmail("");
    setNameTouched(false);
    setNameError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isBackendAuthenticated && !isSigningIn) {
      handleClose();
    }
  }, [isBackendAuthenticated, isSigningIn, handleClose]);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleSignupConflict = useCallback(async () => {
    try {
      await clearAuthorization();
    } catch (err) {
      console.warn("Failed to clear authorization after signup conflict", err);
    }
    handleClose();
  }, [clearAuthorization, handleClose]);

  const validateName = (value: string) => {
    if (!value.trim()) {
      return "Name is required";
    }
    if (value.trim().length < 3) {
      return "Name must be at least 3 characters";
    }
    return "";
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameTouched) {
      setNameError(validateName(value));
    }
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    setNameError(validateName(name));
  };

  const isFormValid = name.trim().length >= 3 && !nameError;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/70 z-10 w-full h-full"
        activeOpacity={1}
        onPress={handleClose}
      />
      {/* Drawer */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl px-6 pt-6 pb-10 z-50"
        style={{
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Handle bar */}
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 2,
            alignSelf: "center",
            marginBottom: 24,
          }}
        />

        {/* Title */}
        <Text className="text-white text-2xl font-better-bold text-center mb-10 mt-4">
          Join BetrWeather
        </Text>

        {/* Name Input */}
        <View className="mb-8">
          <Text className="text-white font-better-medium text-sm mb-2">
            Name <Text className="text-red-400">*</Text> (min 3 characters)
          </Text>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            className={`bg-white/10 border rounded-lg px-4 py-3 text-white font-better-medium ${
              nameTouched && nameError ? "border-red-400" : "border-white/20"
            }`}
            style={{ fontSize: 16 }}
          />
          {
            <Text
              className={`text-red-400 text-xs mt-1 font-better-medium ${
                nameTouched && nameError ? "opacity-100" : "opacity-0"
              }`}
            >
              {nameError}
            </Text>
          }
        </View>

        {/* Email Input */}
        <View className="mb-8">
          <Text className="text-white font-better-medium text-sm mb-2">
            Email <Text className="text-gray-400">(optional)</Text>
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-better-medium"
            style={{ fontSize: 16 }}
          />
        </View>

        {/* Sign In Button */}
        <View className="items-center mb-1 mt-3 z-50">
          <DrawerSignUpButton
            selectedChain={selectedChain}
            disabled={!isFormValid}
            userData={{ name: name.trim(), email: email.trim() }}
            onSignupConflict={handleSignupConflict}
            preSignedData={preSignedData}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

// Modified Sign In Button for the drawer
function DrawerSignUpButton({
  selectedChain,
  disabled,
  userData,
  onSignupConflict,
  preSignedData,
}: {
  selectedChain: Chain;
  disabled: boolean;
  userData: { name: string; email: string };
  onSignupConflict?: () => void;
  preSignedData?: {
    publicKey: string;
    signature: string;
    payload: string;
  };
}) {
  const { signMessage } = useMobileWallet();
  const { signupWithBackend } = useBackendAuth();
  const [signInInProgress, setSignInInProgress] = useState(false);
  const { toast } = useToast();

  const handleSignUp = useCallback(async () => {
    try {
      if (signInInProgress || disabled) {
        return;
      }
      setSignInInProgress(true);

      let publicKey: string;
      let signature: string;
      let payload: string;

      // Use pre-signed data if available, otherwise sign new message
      if (preSignedData) {
        publicKey = preSignedData.publicKey;
        signature = preSignedData.signature;
        payload = preSignedData.payload;
      } else {
        // Generate secure sign-in payload
        const securePayload = await generateSecureSignInPayload();

        if (!securePayload) {
          throw new Error("Failed to get sign in payload from server");
        }

        const signed = await signMessage(
          Buffer.from(JSON.stringify(securePayload)),
          selectedChain
        );
        signature = bs58.encode(signed.signature);
        publicKey = signed.publicKey;
        payload = JSON.stringify(securePayload);
      }

      await signupWithBackend(
        publicKey,
        signature,
        payload,
        userData
      );
    } catch (err: any) {
      if (err instanceof Error && err.name === WALLET_CANCELLED_ERROR) {
        toast.info("Wallet request cancelled");
        return;
      }
      if (err instanceof Error && err.name === WALLET_ALREADY_REGISTERED_ERROR) {
        toast.info(
          "Wallet already registered",
          "Looks like this wallet already has an account. Please sign in instead."
        );
        onSignupConflict?.();
        return;
      }
      const message =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      toast.error("Error during signup", message);
    } finally {
      setSignInInProgress(false);
    }
  }, [
    signInInProgress,
    selectedChain,
    signMessage,
    signupWithBackend,
    disabled,
    userData,
    onSignupConflict,
    toast,
    preSignedData,
  ]);

  return (
    <TouchableOpacity
      onPress={handleSignUp}
      disabled={signInInProgress || disabled}
      activeOpacity={disabled ? 1 : 0.8}
      className={`relative overflow-hidden flex items-center justify-center rounded-lg border p-4 ${
        !disabled
          ? "border-gray-600 bg-gray-800"
          : "border-white/30 bg-white/10"
      }`}
    >
      <Text
        className={`font-better-medium text-base ${
          disabled ? "text-gray-400" : "text-white"
        }`}
      >
        {signInInProgress ? "Signing in..." : "Sign in with Wallet"}
      </Text>
    </TouchableOpacity>
  );
}

// Login Button that uses ConnectButton functionality
export function LoginButton({ selectedChain }: { selectedChain: Chain }) {
  const { signMessage, disconnect } = useMobileWallet();
  const { selectedAccount } = useAuthorization();
  const { signinWithBackend } = useBackendAuth();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  const { toast } = useToast();

  const handleLoginPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);

      if (selectedAccount) {
        console.log("disconnecting", selectedAccount);
        await disconnect();
      }

      const securePayload = await generateSecureSignInPayload();

      if (!securePayload) {
        throw new Error("Failed to get sign in payload from server");
      }

      const { signature, publicKey } = await signMessage(
        Buffer.from(JSON.stringify(securePayload)),
        selectedChain
      );
      const signEndcoded = bs58.encode(signature);

      await signinWithBackend(
        publicKey,
        signEndcoded,
        JSON.stringify(securePayload)
      );
    } catch (err: any) {
      if (err instanceof Error && err.name === WALLET_CANCELLED_ERROR) {
        toast.info("Wallet request cancelled");
      } else {
        const message =
          err instanceof Error ? err.message : "Login failed. Please try again.";
        toast.error("Error during login", message);
      }
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [
    authorizationInProgress,
    selectedChain,
    toast,
    signMessage,
    disconnect,
    selectedAccount,
    signinWithBackend,
  ]);

  return (
    <TouchableOpacity
      onPress={handleLoginPress}
      disabled={authorizationInProgress}
      activeOpacity={0.8}
      className="relative overflow-hidden w-[120px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
    >
      <Text className="font-better-medium text-white text-base text-nowrap">
        {authorizationInProgress ? "Connecting..." : "Login"}
      </Text>
    </TouchableOpacity>
  );
}

export function ConnectButton({ selectedChain }: { selectedChain?: Chain }) {
  return <LoginButton selectedChain={resolveChain(selectedChain)} />;
}

export function SignInButton({ selectedChain }: { selectedChain?: Chain }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const resolvedChain = resolveChain(selectedChain);

  return (
    <>
      <TouchableOpacity
        onPress={() => setDrawerVisible(true)}
        activeOpacity={0.8}
        className="relative overflow-hidden w-[120px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
      >
        <Text className="font-better-medium text-white text-base text-nowrap">
          Sign up
        </Text>
      </TouchableOpacity>
      <SignupDrawer
        isVisible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        selectedChain={resolvedChain}
      />
    </>
  );
}

// Unified Login Button - tries signin first, shows form if user doesn't exist
export function UnifiedLoginButton({ selectedChain }: { selectedChain: Chain }) {
  const { signMessage, disconnect } = useMobileWallet();
  const { selectedAccount } = useAuthorization();
  const { signinWithBackend, isBackendAuthenticated } = useBackendAuth();
  const { toast } = useToast();
  
  const [authState, setAuthState] = useState<
    "idle" | "signing" | "authenticating" | "signingUp"
  >("idle");
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [preSignedData, setPreSignedData] = useState<{
    publicKey: string;
    signature: string;
    payload: string;
  } | null>(null);
  const [signupDrawerVisible, setSignupDrawerVisible] = useState(false);

  // Close signup drawer and reset state when authenticated
  useEffect(() => {
    if (isBackendAuthenticated && authState !== "idle") {
      setShowSignupForm(false);
      setSignupDrawerVisible(false);
      setPreSignedData(null);
      setAuthState("idle");
    }
  }, [isBackendAuthenticated, authState]);

  const handleUnifiedLogin = useCallback(async () => {
    try {
      // Prevent multiple simultaneous attempts
      if (authState !== "idle") {
        return;
      }

      setAuthState("signing");

      // Step 1: Generate secure payload and get wallet signature
      // Note: We don't disconnect here because signMessage will handle
      // the wallet connection/authorization flow properly
      const securePayload = await generateSecureSignInPayload();
      if (!securePayload) {
        throw new Error("Failed to get sign in payload from server");
      }

      const { signature, publicKey } = await signMessage(
        Buffer.from(JSON.stringify(securePayload)),
        selectedChain
      );
      const signEncoded = bs58.encode(signature);
      const payloadString = JSON.stringify(securePayload);

      // Store signed data in case we need it for signup
      const signedData = {
        publicKey,
        signature: signEncoded,
        payload: payloadString,
      };
      setPreSignedData(signedData);

      // Step 2: Try signin first (show loader)
      setAuthState("authenticating");

      try {
        await signinWithBackend(publicKey, signEncoded, payloadString);
        // Success - user exists and is now logged in
        // isBackendAuthenticated will be set by the hook
        return;
      } catch (signinError: any) {
        // Check if this is a network error (no status code)
        const isNetworkError =
          !signinError?.status &&
          (signinError?.message?.toLowerCase().includes("network") ||
            signinError?.message?.toLowerCase().includes("fetch") ||
            signinError?.message?.toLowerCase().includes("connection") ||
            signinError?.name === "TypeError");

        if (isNetworkError) {
          const errorMessage =
            signinError instanceof Error
              ? signinError.message
              : "Network error. Please check your connection and try again.";
          toast.error("Connection error", errorMessage);
          setAuthState("idle");
          setPreSignedData(null);
          return;
        }

        // Check if error indicates user doesn't exist
        const status = signinError?.status;
        const message = signinError?.message || "";
        const isUserNotFound =
          status === 404 ||
          status === 401 ||
          (typeof message === "string" &&
            (message.toLowerCase().includes("not found") ||
              message.toLowerCase().includes("does not exist") ||
              message.toLowerCase().includes("user not found")));

        if (isUserNotFound) {
          // User doesn't exist - show signup form with pre-signed data
          setShowSignupForm(true);
          setSignupDrawerVisible(true);
          setAuthState("idle"); // Reset to idle so form can be used
          return;
        }

        // Handle 409 conflict (user created between signin attempt and now)
        if (status === 409 || message.toLowerCase().includes("already")) {
          // User was created - retry signin once
          try {
            await signinWithBackend(publicKey, signEncoded, payloadString);
            return;
          } catch (retryError) {
            // If retry also fails, show error
            const retryMessage =
              retryError instanceof Error
                ? retryError.message
                : "Authentication failed. Please try again.";
            toast.error("Authentication error", retryMessage);
            setAuthState("idle");
            setPreSignedData(null);
            return;
          }
        }

        // Other errors (network, server, etc.)
        const errorMessage =
          signinError instanceof Error
            ? signinError.message
            : "Login failed. Please check your connection and try again.";
        toast.error("Login failed", errorMessage);
        setAuthState("idle");
        setPreSignedData(null);
      }
    } catch (err: any) {
      if (err instanceof Error && err.name === WALLET_CANCELLED_ERROR) {
        toast.info("Wallet request cancelled");
      } else {
        const message =
          err instanceof Error
            ? err.message
            : "Authentication failed. Please try again.";
        toast.error("Error", message);
      }
      setAuthState("idle");
      setPreSignedData(null);
      setShowSignupForm(false);
      setSignupDrawerVisible(false);
    }
  }, [
    authState,
    selectedAccount,
    selectedChain,
    signMessage,
    disconnect,
    signinWithBackend,
    toast,
  ]);

  const handleSignupFormClose = useCallback(() => {
    setSignupDrawerVisible(false);
    setShowSignupForm(false);
    setPreSignedData(null);
    setAuthState("idle");
  }, []);

  const getButtonText = () => {
    switch (authState) {
      case "signing":
        return "Signing...";
      case "authenticating":
        return "Authenticating...";
      case "signingUp":
        return "Creating account...";
      default:
        return "Login";
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleUnifiedLogin}
        disabled={authState !== "idle"}
        activeOpacity={authState !== "idle" ? 1 : 0.8}
        className="relative overflow-hidden min-w-[160px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
      >
        {authState !== "idle" ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="white" />
            <Text className="font-better-medium text-white text-base text-nowrap">
              {getButtonText()}
            </Text>
          </View>
        ) : (
          <Text className="font-better-medium text-white text-base text-nowrap">
            {getButtonText()}
          </Text>
        )}
      </TouchableOpacity>

      {/* Signup Form Drawer (shown when user doesn't exist) */}
      {showSignupForm && preSignedData && (
        <SignupDrawer
          isVisible={signupDrawerVisible}
          onClose={handleSignupFormClose}
          selectedChain={selectedChain}
          preSignedData={preSignedData}
        />
      )}
    </>
  );
}

// export function ConnectButton({ selectedChain }: { selectedChain: Chain }) {
//   const { authorizeSession } = useAuthorization();
//   const { connect } = useMobileWallet();
//   const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
//   const { toast } = useToast();

//   const handleConnectPress = useCallback(async () => {
//     try {
//       if (authorizationInProgress) {
//         return;
//       }
//       setAuthorizationInProgress(true);

//       await connect(selectedChain);
//     } catch (err: any) {
//       toast.error(
//         "Error during connect",
//         err instanceof Error ? err.message : err
//       );
//     } finally {
//       setAuthorizationInProgress(false);
//     }
//   }, [authorizationInProgress, authorizeSession, selectedChain, connect]);

//   return (
//     <TouchableOpacity
//       onPress={handleConnectPress}
//       disabled={authorizationInProgress}
//       activeOpacity={0.8}
//       style={{
//         position: "relative",
//         overflow: "hidden",
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: "rgba(255, 255, 255, 0.3)",
//         backgroundColor: "transparent",
//         paddingHorizontal: 24,
//         paddingVertical: 12,
//         minWidth: 120,
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <Text
//         style={{
//           color: "white",
//           fontSize: 16,
//           fontWeight: "600",
//           zIndex: 1,
//         }}
//         className="font-better-medium"
//       >
//         {authorizationInProgress ? "Connecting..." : "Connect"}
//       </Text>
//     </TouchableOpacity>
//   );
// }

// export function SignInButton({ selectedChain }: { selectedChain: Chain }) {
//   const { signIn } = useMobileWallet();
//   const { toast } = useToast();
//   const [signInInProgress, setSignInInProgress] = useState(false);

//   const handleConnectPress = useCallback(async () => {
//     let loadingToastId: string | undefined;

//     try {
//       if (signInInProgress) {
//         return;
//       }
//       setSignInInProgress(true);

//       // Generate secure sign-in payload
//       const securePayload = await generateSecureSignInPayload();
//       if (!securePayload) {
//         toast.error(
//           "Error during sign in",
//           "Failed to get sign in payload from server"
//         );
//         return;
//       }
//       await signIn(securePayload, selectedChain);
//     } catch (err: any) {
//       toast.error(
//         "Error during sign in",
//         err instanceof Error ? err.message : err,
//         { id: loadingToastId }
//       );
//     } finally {
//       setSignInInProgress(false);
//     }
//   }, [signInInProgress, selectedChain, signIn, toast]);

//   return (
//     <TouchableOpacity
//       onPress={handleConnectPress}
//       disabled={signInInProgress}
//       activeOpacity={0.8}
//       className="relative overflow-hidden w-[120px] flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-3 text-center"
//     >
//       <Text className="font-better-medium text-white text-base text-nowrap">
//         {signInInProgress ? "Signing in..." : "Sign in"}
//       </Text>
//     </TouchableOpacity>
//   );
// }
