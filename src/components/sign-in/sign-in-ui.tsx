import { useState, useCallback } from "react";
import { Text, TouchableOpacity, Animated } from "react-native";
import { alertAndLog } from "../../utils/alertAndLog";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { LinearGradient } from "expo-linear-gradient";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from "react-native-reanimated";
import { useEffect } from "react";

export function ConnectButton() {
  const { authorizeSession } = useAuthorization();
  const { connect } = useMobileWallet();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  
  // Shimmer animation
  const shimmerValue = useSharedValue(0);
  
  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-200, 200]
    );
    
    return {
      transform: [{ translateX }],
    };
  });

  const handleConnectPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);
      await connect();
    } catch (err: any) {
      alertAndLog(
        "Error during connect",
        err instanceof Error ? err.message : err
      );
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [authorizationInProgress, authorizeSession]);

  return (
    <TouchableOpacity
      onPress={handleConnectPress}
      disabled={authorizationInProgress}
      activeOpacity={0.8}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
        paddingVertical: 12,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Shimmer overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: '100%',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>
      
      {/* Button text */}
      <Text
        style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
          zIndex: 1,
        }}
        className="font-better-medium"
      >
        {authorizationInProgress ? 'Connecting...' : 'Connect'}
      </Text>
    </TouchableOpacity>
  );
}

export function SignInButton() {
  const { authorizeSession } = useAuthorization();
  const { signIn } = useMobileWallet();
  const [signInInProgress, setSignInInProgress] = useState(false);
  
  // Shimmer animation
  const shimmerValue = useSharedValue(0);
  
  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-200, 200]
    );
    
    return {
      transform: [{ translateX }],
    };
  });

  const handleConnectPress = useCallback(async () => {
    try {
      if (signInInProgress) {
        return;
      }
      setSignInInProgress(true);
      await signIn({
        domain: "yourdomain.com",
        statement: "Sign into Expo Template App",
        uri: "https://yourdomain.com",
      });
    } catch (err: any) {
      alertAndLog(
        "Error during sign in",
        err instanceof Error ? err.message : err
      );
    } finally {
      setSignInInProgress(false);
    }
  }, [signInInProgress, authorizeSession]);

  return (
    <TouchableOpacity
      onPress={handleConnectPress}
      disabled={signInInProgress}
      activeOpacity={0.8}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
        flex: 1,
      }}
    >
      {/* Shimmer overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: '100%',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>
      
      {/* Button text */}
      <Text
        style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
          zIndex: 1,
        }}
      >
        {signInInProgress ? 'Signing in...' : 'Sign in'}
      </Text>
    </TouchableOpacity>
  );
}
