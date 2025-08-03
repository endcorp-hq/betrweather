import { ViewStyle, View, StyleSheet, Text, Modal, TouchableOpacity } from "react-native";

interface AppModalProps {
  children: React.ReactNode;
  title: string;
  hide: () => void;
  show: boolean;
  submit?: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
  contentContainerStyle?: ViewStyle;
}

export function AppModal({
  children,
  title,
  hide,
  show,
  submit,
  submitDisabled,
  submitLabel = "Save",
  contentContainerStyle,
}: AppModalProps) {
  return (
    <Modal
      visible={show}
      transparent={true}
      animationType="fade"
      onRequestClose={hide}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, contentContainerStyle]}>
          <Text style={styles.title}>{title}</Text>
          {children}
          <View style={styles.action}>
            <View style={styles.buttonGroup}>
              {submit && (
                <TouchableOpacity
                  onPress={submit}
                  disabled={submitDisabled}
                  style={[
                    styles.button,
                    styles.submitButton,
                    submitDisabled && styles.disabledButton
                  ]}
                >
                  <Text style={[styles.buttonText, styles.submitButtonText]}>
                    {submitLabel}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={hide}
                style={[styles.button, styles.closeButton]}
              >
                <Text style={[styles.buttonText, styles.closeButtonText]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 20,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 10,
    minWidth: 300,
    maxWidth: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: '#333',
  },
  action: {
    marginTop: 16,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#F2F2F7',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
  },
  closeButtonText: {
    color: '#007AFF',
  },
});
