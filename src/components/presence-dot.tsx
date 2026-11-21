import { useEffect, useState } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

type PresenceDotProps = {
  visible: boolean;
  size?: number;
  style?: ViewStyle;
};

export function PresenceDot({
  visible,
  size = 14,
  style,
}: PresenceDotProps) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, visible]);

  if (!visible) return null;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.18] }) }],
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
          },
          style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    backgroundColor: colors.success,
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.success,
  },
});
