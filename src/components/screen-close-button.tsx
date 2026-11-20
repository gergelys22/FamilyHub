import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, darkColors, radius, shadows } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

type ScreenCloseButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function ScreenCloseButton({
  onPress,
  disabled = false,
  style,
  accessibilityLabel = 'Képernyő bezárása',
}: ScreenCloseButtonProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  function close() {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={close}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
        style,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="close-outline" size={24} color={palette.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.round,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});
