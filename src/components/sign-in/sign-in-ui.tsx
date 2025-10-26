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

const { height: screenHeight } = Dimensions.get("window");

// Login Drawer Component
export function SignupDrawer({
  isVisible,
  onClose,
  selectedChain,
}: {
  isVisible: boolean;
  onClose: () => void;
  selectedChain: Chain;
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
}: {
  selectedChain: Chain;
  disabled: boolean;
  userData: { name: string; email: string };
  onSignupConflict?: () => void;
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

      // Generate secure sign-in payload
      const securePayload = await generateSecureSignInPayload();

      if (!securePayload) {
        throw new Error("Failed to get sign in payload from server");
      }

      const { signature, publicKey } = await signMessage(
        Buffer.from(JSON.stringify(securePayload)),
        selectedChain
      );
      const signEndcoded = bs58.encode(signature);

      await signupWithBackend(
        publicKey,
        signEndcoded,
        JSON.stringify(securePayload),
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
