import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
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
      <View pointerEvents="none" style={[styles.thickness, { opacity: 0.18 }]} />
      {shimmer && (
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, shimmerStyle]}
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
    // borderWidth: 1.5, // Remove border
    // borderColor: 'rgba(255,255,255,0.25)',
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
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
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