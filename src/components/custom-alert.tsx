
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Palette = typeof colors | typeof darkColors;

export type CustomAlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export type CustomAlertButton = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
};

const alertConfig: Record<
  CustomAlertType,
  {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
  }
> = {
  success: {
    icon: 'checkmark-circle',
    color: '#16A34A',
  },
  error: {
    icon: 'close-circle',
    color: '#E5384F',
  },
  warning: {
    icon: 'warning',
    color: '#F59E0B',
  },
  info: {
    icon: 'information-circle',
    color: '#3B82F6',
  },
  confirm: {
    icon: 'help-circle',
    color: '#8B5CF6',
  },
};

export function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onClose,
  palette,
}: {
  visible: boolean;
  title: string;
  message?: string;
  type?: CustomAlertType;
  buttons?: CustomAlertButton[];
  onClose: () => void;
  palette: Palette;
}) {
  const config = alertConfig[type];

  const alertButtons: CustomAlertButton[] = buttons ?? [
    {
      label: 'Rendben',
      variant: 'primary',
    },
  ];

  function handleButtonPress(button: CustomAlertButton) {
    onClose();
    button.onPress?.();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Háttérre kattintva bezárás */}
        <Pressable
          accessibilityLabel="Bezárás"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View
          style={[
            styles.dialog,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
            shadows.floating,
          ]}
        >
          {/* Ikon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.color}20` },
            ]}
          >
            <Ionicons name={config.icon} size={30} color={config.color} />
          </View>

          {/* Cím */}
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {title}
          </Text>

          {/* Üzenet */}
          {message ? (
            <Text style={[styles.message, { color: palette.textMuted }]}>
              {message}
            </Text>
          ) : null}

          {/* Gombok */}
          <View style={styles.buttons}>
            {alertButtons.map((button, index) => {
              const variant = button.variant ?? 'primary';
              const isDestructive = variant === 'destructive';
              const isPrimary = variant === 'primary';

              const buttonBackground = isDestructive
                ? palette.danger
                : isPrimary
                  ? palette.primary
                  : palette.surfaceMuted;

              const buttonTextColor =
                isPrimary || isDestructive
                  ? '#FFFFFF'
                  : palette.textSecondary;

              return (
                <Pressable
                  key={`${button.label}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={button.label}
                  onPress={() => handleButtonPress(button)}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: buttonBackground,
                      borderColor: palette.border,
                      borderWidth: variant === 'secondary' ? 1 : 0,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: buttonTextColor },
                    ]}
                  >
                    {button.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(7, 17, 35, 0.55)',
  },

  dialog: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },

  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },

  title: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },

  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  buttons: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
