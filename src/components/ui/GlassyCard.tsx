import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';

interface GlassyCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number; // Blur intensity
  shimmer?: boolean; // Enable shimmer effect
}

// Glassmorphism + shimmer + device motion
const GlassyCard: React.FC<GlassyCardProps> = ({
  children,
  style,
  intensity = 40,
  shimmer = true,
}) => {
  // No device motion
  // shimmerStyle is now static
  const shimmerStyle = { opacity: shimmer ? 0.10 : 0 };

  return (
    <View style={[styles.outer, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassBg} />
      {/* Simulated thickness: static inner shadow/gradient */}
      <View style={[styles.thickness, { opacity: 0.18, pointerEvents: 'none' as any }]} />
      {shimmer && (
        <Animated.View
          style={[styles.shimmer, shimmerStyle, { pointerEvents: 'none' as any }]}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    marginVertical: 8,
    marginHorizontal: 0,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,30,0.32)', // even darker, more neutral tint
  },
  thickness: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    // Simulate thickness with a subtle inner shadow using shadow props
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 6px 16px rgba(0,0,0,0.18)' as any }
      : { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16 }),
    // For Android
    elevation: 8,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)', // much lighter shimmer overlay
    borderRadius: 20,
    // Simulate a moving light/shimmer
  },
  content: {
    position: 'relative',
    zIndex: 2,
    padding: 16,
  },
});

export default GlassyCard; 