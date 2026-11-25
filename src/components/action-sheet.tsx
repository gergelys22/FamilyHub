import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

export type SheetAction = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  onPress: () => void;
};

/** Saját, témázott alsó műveleti lap (mobilon és weben is egyformán működik, az Alert.alert helyett). */
export function ActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
  palette,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
  palette: Palette;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Bezárás" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, borderColor: palette.border, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
            shadows.floating,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text numberOfLines={2} style={[styles.subtitle, { color: palette.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {actions.map((action) => {
              const color = action.destructive ? palette.danger : palette.textPrimary;
              const tint = action.destructive ? palette.danger : palette.primary;
              return (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: palette.surfaceMuted },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.iconTile, { backgroundColor: `${tint}22` }]}>
                    <Ionicons name={action.icon} size={20} color={tint} />
                  </View>
                  <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, { borderColor: palette.border }, pressed && styles.pressed]}
          >
            <Text style={[styles.cancelText, { color: palette.textSecondary }]}>Mégse</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Saját megerősítő ablak (Alert.alert helyett). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Törlés',
  destructive = true,
  onConfirm,
  onCancel,
  palette,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  palette: Palette;
}) {
  const accent = destructive ? palette.danger : palette.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, styles.overlayCenter]}>
        <Pressable accessibilityLabel="Bezárás" onPress={onCancel} style={StyleSheet.absoluteFill} />
        <View style={[styles.dialog, { backgroundColor: palette.surface, borderColor: palette.border }, shadows.floating]}>
          <View style={[styles.dialogIcon, { backgroundColor: `${accent}22` }]}>
            <Ionicons name={destructive ? 'trash-outline' : 'help-circle-outline'} size={26} color={accent} />
          </View>
          <Text style={[styles.dialogTitle, { color: palette.textPrimary }]}>{title}</Text>
          <Text style={[styles.dialogMessage, { color: palette.textMuted }]}>{message}</Text>
          <View style={styles.dialogButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.dialogButton, { borderColor: palette.border, borderWidth: 1 }, pressed && styles.pressed]}
            >
              <Text style={[styles.dialogButtonText, { color: palette.textSecondary }]}>Mégse</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.dialogButton, { backgroundColor: accent }, pressed && styles.pressed]}
            >
              <Text style={[styles.dialogButtonText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7, 17, 35, 0.5)' },
  overlayCenter: { justifyContent: 'center', padding: spacing.xl },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { marginTop: -4, fontSize: 13, fontWeight: '600' },
  actions: { marginTop: spacing.xs, gap: spacing.sm },
  action: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  iconTile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '800' },
  cancel: {
    minHeight: 48,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  dialog: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dialogIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28 },
  dialogTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  dialogMessage: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  dialogButtons: { alignSelf: 'stretch', marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  dialogButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  dialogButtonText: { fontSize: 14, fontWeight: '900' },
});