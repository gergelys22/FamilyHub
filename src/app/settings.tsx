import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SettingRow({
  icon,
  title,
  description,
  right,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={21} color={palette.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{title}</Text>
        {description ? (
          <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, setDarkMode } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [largeText, setLargeText] = React.useState(false);
  const [twoFactor, setTwoFactor] = React.useState(false);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: palette.surface }]}>
          <Ionicons name="chevron-back" size={25} color={palette.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Beállítások</Text>
        <Ionicons name="settings-outline" size={22} color={palette.primary} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: palette.textMuted }]}>Megjelenés</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon="moon-outline"
            title="Sötét mód"
            description="Sötét színséma használata"
            right={
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
          <SettingRow
            icon="accessibility-outline"
            title="Akadálymentesség"
            description="Nagyobb szöveg és kontraszt"
            right={
              <Switch
                value={largeText}
                onValueChange={setLargeText}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
        </View>
        <Text style={[styles.section, { color: palette.textMuted }]}>Biztonság</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon="shield-checkmark-outline"
            title="Kétlépcsős azonosítás"
            description={twoFactor ? 'Bekapcsolva' : 'Nincs bekapcsolva'}
            right={
              <Switch
                value={twoFactor}
                onValueChange={setTwoFactor}
                trackColor={{ false: palette.border, true: '#42C7AA' }}
                thumbColor={twoFactor ? colors.success : undefined}
              />
            }
          />
          <SettingRow
            icon="phone-portrait-outline"
            title="Megbízható eszközök"
            description="Az aktuális eszköz munkamenete"
            onPress={() =>
              Alert.alert(
                'Megbízható eszközök',
                'A FamilyHub nem tárol külön eszközlistát. A bejelentkezett munkamenetet a kijelentkezés gombbal zárhatod le.',
              )
            }
          />
          <SettingRow
            icon="lock-closed-outline"
            title="Adatvédelem"
            description="Adatkezelési tájékoztató"
            onPress={() => router.push('/privacy')}
          />
        </View>
        <Text style={[styles.section, { color: palette.textMuted }]}>Alkalmazás</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon="notifications-outline"
            title="Értesítések"
            description="Értesítési beállítások"
            onPress={() => router.push('/notifications')}
          />
          <SettingRow
            icon="language-outline"
            title="Nyelv"
            description="Magyar"
            onPress={() =>
              Alert.alert('Nyelv', 'Jelenleg csak a magyar nyelv érhető el.')
            }
          />
        </View>
        <View style={styles.version}>
          <Text style={[styles.versionText, { color: palette.textMuted }]}>FamilyHub · 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
  section: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  card: { borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  row: {
    minHeight: 70,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  rowDescription: { color: colors.textMuted, fontSize: 11 },
  version: { alignItems: 'center', padding: spacing.lg },
  versionText: { color: colors.textMuted, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
