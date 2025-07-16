import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import theme from '../../theme';

interface MaterialCardProps {
  children: React.ReactNode;
  elevation?: keyof typeof theme.elevation;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'filled' | 'outlined';
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  children,
  elevation = 'level1',
  style,
  variant = 'elevated',
}) => {
  const getCardBackground = () => {
    switch (variant) {
      case 'filled':
        return theme.colors.surfaceContainerHigh;
      case 'outlined':
        return theme.colors.surfaceContainer;
      case 'elevated':
      default:
        return theme.colors.surface;
    }
  };

  const getBorder = () => {
    if (variant === 'outlined') {
      return {
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
      };
    }
    return {};
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getCardBackground(), borderRadius: theme.borderRadius.lg },
        theme.elevation[elevation],
        getBorder(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    marginHorizontal: 0,
  },
});

export default MaterialCard; 