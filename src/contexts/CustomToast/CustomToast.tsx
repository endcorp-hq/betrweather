import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition =
  | "top"
  | "bottom"
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface ToastConfig {
  id?: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
  onPress?: () => void;
  onDismiss?: () => void;
}

interface CustomToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const toastConfigs = {
  success: {
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    icon: "check-circle",
    iconColor: "#ffffff",
  },
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    icon: "alert-circle",
    iconColor: "#ffffff",
  },
  warning: {
    backgroundColor: "rgba(245, 158, 11, 0.95)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    icon: "alert",
    iconColor: "#ffffff",
  },
  info: {
    backgroundColor: "rgba(59, 130, 246, 0.95)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    icon: "information",
    iconColor: "#ffffff",
  },
  loading: {
    backgroundColor: "rgba(139, 92, 246, 0.95)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    icon: "loading",
    iconColor: "#ffffff",
  },
};

const getPositionStyle = (position: ToastPosition) => {
  const baseStyle = {
    position: "absolute" as const,
    zIndex: 999999,
  };

  switch (position) {
    case "top":
      return {
        ...baseStyle,
        top: 50,
        left: 20,
        right: 20,
        alignItems: "center" as const,
      };
    case "bottom":
      return {
        ...baseStyle,
        bottom: 100,
        left: 20,
        right: 20,
        alignItems: "center" as const,
      };
    case "center":
      return {
        ...baseStyle,
        top: screenHeight / 2 - 50,
        left: 20,
        right: 20,
        alignItems: "center" as const,
      };
    case "top-left":
      return {
        ...baseStyle,
        top: 50,
        left: 20,
        maxWidth: screenWidth * 0.8,
      };
    case "top-right":
      return {
        ...baseStyle,
        top: 50,
        right: 20,
        maxWidth: screenWidth * 0.8,
      };
    case "bottom-left":
      return {
        ...baseStyle,
        bottom: 100,
        left: 20,
        maxWidth: screenWidth * 0.8,
      };
    case "bottom-right":
      return {
        ...baseStyle,
        bottom: 100,
        right: 20,
        maxWidth: screenWidth * 0.8,
      };
    default:
      return {
        ...baseStyle,
        top: 50,
        left: 20,
        right: 20,
        alignItems: "center" as const,
      };
  }
};

export const CustomToast: React.FC<CustomToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 3000,
  position = "top",
  onPress,
  onDismiss,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const config = toastConfigs[type];
  const positionStyle = getPositionStyle(position);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide for non-loading toasts
      if (type !== "loading" && duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration, type]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  // Loading animation
  useEffect(() => {
    if (type === "loading" && visible) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.setValue(0);
    }
  }, [type, visible]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        positionStyle,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toast,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
          },
        ]}
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <Animated.View
            style={{
              transform: type === "loading" ? [{ rotate: spin }] : [],
            }}
          >
            <MaterialCommunityIcons
              name={config.icon as any}
              size={24}
              color={config.iconColor}
            />
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>

        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => {
              onDismiss();
              hideToast();
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 999999,
    minHeight: 60,
    maxWidth: screenWidth - 40,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 2,
  },
  message: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
