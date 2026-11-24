import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { getMyFamilies } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type Palette = typeof colors | typeof darkColors;

export function usePalette() {
  const { isDark } = useTheme();
  return { isDark, palette: (isDark ? darkColors : colors) as Palette };
}

/** Az első családi kör azonosítója (az alkalmazás jelenleg egy családdal dolgozik). */
export function useFamilyId() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getMyFamilies()
      .then((families) => {
        if (active) setFamilyId(families[0]?.id ?? null);
      })
      .catch(() => {
        // A lista üres állapotban jelenik meg.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { familyId, loading };
}

export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'most';
  if (minutes < 60) return `${minutes} perce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} napja`;
  return new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ['#D6B38D', '#F3C7B3', '#C9D8E5', '#EAC9A8', '#BFE3D5', '#D9C9F2'];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const index = name.length ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AVATAR_COLORS[index],
      }}
    >
      <Text style={{ color: '#243447', fontSize: size * 0.42, fontWeight: '900' }}>
        {(name.trim().charAt(0) || '?').toLocaleUpperCase('hu-HU')}
      </Text>
    </View>
  );
}

export function EmptyBlock({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { palette } = usePalette();
  return (
    <View
      style={[
        sharedStyles.empty,
        { backgroundColor: palette.surface, borderColor: palette.borderStrong },
      ]}
    >
      <View style={[sharedStyles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text style={[sharedStyles.emptyTitle, { color: palette.textPrimary }]}>{title}</Text>
      {text ? <Text style={[sharedStyles.emptyText, { color: palette.textMuted }]}>{text}</Text> : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            sharedStyles.emptyAction,
            { backgroundColor: palette.primary },
            pressed && sharedStyles.pressed,
          ]}
        >
          <Text style={sharedStyles.emptyActionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Alulról felcsúszó ablak: húzófül, ikonos fejléc, billentyűzetet követő tartalom. */
export function Sheet({
  visible,
  onClose,
  title,
  icon,
  children,
  maxHeight = '92%',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: IconName;
  children: ReactNode;
  maxHeight?: `${number}%`;
}) {
  const { isDark, palette } = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          sharedStyles.overlay,
          { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.45)' },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ablak bezárása"
          onPress={onClose}
          style={sharedStyles.backdrop}
        />
        <View
          style={[
            sharedStyles.sheet,
            {
              maxHeight,
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={[sharedStyles.grabber, { backgroundColor: palette.borderStrong }]} />
          <View style={sharedStyles.sheetHeader}>
            <View style={[sharedStyles.sheetIcon, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name={icon} size={20} color={palette.primary} />
            </View>
            <Text style={[sharedStyles.sheetTitle, { color: palette.textPrimary }]} numberOfLines={2}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Bezárás" hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sharedStyles.sheetBody}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FormInput({ multiline, style, ...rest }: TextInputProps) {
  const { palette } = usePalette();
  return (
    <TextInput
      placeholderTextColor={palette.textMuted}
      multiline={multiline}
      style={[
        sharedStyles.input,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          color: palette.textPrimary,
        },
        multiline && sharedStyles.textArea,
        style,
      ]}
      {...rest}
    />
  );
}

export function FormLabel({ children }: { children: ReactNode }) {
  const { palette } = usePalette();
  return <Text style={[sharedStyles.label, { color: palette.textSecondary }]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  busy,
  icon,
  tone,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  icon?: IconName;
  tone?: string;
}) {
  const { palette } = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.primaryButton,
        { backgroundColor: tone ?? palette.primary },
        busy && sharedStyles.disabled,
        pressed && sharedStyles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text style={sharedStyles.primaryButtonText}>{busy ? 'Egy pillanat…' : label}</Text>
    </Pressable>
  );
}

export const sharedStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  sheetHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: '900' },
  sheetBody: { padding: spacing.xl, gap: spacing.md },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  textArea: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  label: { fontSize: 12, fontWeight: '900' },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyAction: { marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 11, borderRadius: radius.round },
  emptyActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
