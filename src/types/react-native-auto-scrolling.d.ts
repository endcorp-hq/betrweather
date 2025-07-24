declare module 'react-native-auto-scrolling' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  interface AutoScrollingProps {
    style?: ViewStyle;
    endPaddingWidth?: number;
    duration?: number;
    delay?: number;
    isLTR?: boolean;
    isVertical?: boolean;
    children: React.ReactNode;
  }

  const AutoScrolling: ComponentType<AutoScrollingProps>;
  export default AutoScrolling;
} 