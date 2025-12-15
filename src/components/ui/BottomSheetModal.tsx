import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

export interface BottomSheetButton {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: "default" | "outline";
}

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  buttons: BottomSheetButton[];
  showHandleBar?: boolean;
  children?: React.ReactNode; // Custom content between description and buttons
}

export function BottomSheetModal({
  visible,
  onClose,
  title,
  description,
  buttons,
  showHandleBar = true,
  children,
}: BottomSheetModalProps) {
  const getButtonStyle = (button: BottomSheetButton) => {
    const baseStyle = "flex-1 rounded-xl py-4";
    
    if (button.style === "outline") {
      return `${baseStyle} bg-gray-100 border border-gray-200`;
    }

    switch (button.variant) {
      case "danger":
        return baseStyle;
      case "primary":
        return baseStyle;
      case "secondary":
      default:
        return `${baseStyle} bg-gray-100 border border-gray-200`;
    }
  };

  const getButtonTextStyle = (button: BottomSheetButton) => {
    if (button.style === "outline") {
      return "text-gray-700";
    }

    switch (button.variant) {
      case "danger":
        return "text-white";
      case "primary":
        return "text-white";
      case "secondary":
      default:
        return "text-gray-700";
    }
  };

  const getButtonBackgroundColor = (button: BottomSheetButton) => {
    if (button.style === "outline") {
      return undefined;
    }

    switch (button.variant) {
      case "danger":
        return "rgba(239, 68, 68, 0.9)"; // red-500/90
      case "primary":
        return "#8b5cf6"; // purple-600
      case "secondary":
      default:
        return undefined;
    }
  };

  const getButtonTextColor = (button: BottomSheetButton) => {
    if (button.variant === "danger" && !button.style) {
      return "#ffffff";
    }
    if (button.variant === "primary" && !button.style) {
      return "#ffffff";
    }
    return undefined;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {/* Handle Bar */}
            {showHandleBar && (
              <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />
            )}

            {/* Title */}
            <Text className="text-black text-xl font-better-semi-bold mb-3">
              {title}
            </Text>

            {/* Description */}
            {description && (
              <Text className="text-gray-600 text-base font-better-regular mb-6">
                {description}
              </Text>
            )}

            {/* Custom Content */}
            {children && (
              <View className="mb-6">
                {children}
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={button.onPress}
                  className={getButtonStyle(button)}
                  disabled={button.disabled || button.loading}
                  style={{
                    backgroundColor: getButtonBackgroundColor(button),
                    opacity: button.disabled || button.loading ? 0.5 : 1,
                  }}
                >
                  {button.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        button.variant === "danger"
                          ? "#ef4444"
                          : button.variant === "primary"
                          ? "#ffffff"
                          : "#6b7280"
                      }
                    />
                  ) : (
                    <Text
                      className={`text-center font-better-semi-bold ${getButtonTextStyle(button)}`}
                      style={{ color: getButtonTextColor(button) }}
                    >
                      {button.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Shadow for Android
    elevation: 16,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
});

