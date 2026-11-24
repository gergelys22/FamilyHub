import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// A lebegő/üveg tabsáv magassága (a rendszersáv nélkül) + kis ráhagyás.
// Ha a sáv még mindig takarja az alját, növeld ezt az értéket.
const TAB_BAR_CLEARANCE = 96;

type Palette = typeof colors | typeof darkColors;

type MenuItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  accent: string;
  onPress: () => void;
  palette: Palette;
  last?: boolean;
};

function MenuItem({ icon, label, accent, onPress, palette, last }: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !last && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: palette.surfaceMuted },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: `${accent}24` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.menuLabel, { color: palette.textPrimary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
    </Pressable>
  );
}

function Section({ title, palette, children }: { title: string; palette: Palette; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{title}</Text>
      <View style={[styles.menu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const displayName = profile?.display_name ?? 'Profil';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: palette.textPrimary }]}>Több</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil megnyitása"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.avatarRing, { borderColor: palette.primarySoft }]}>
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <View style={styles.profileContent}>
            <Text style={[styles.profileName, { color: palette.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.profileRole, { color: palette.textSecondary }]}>Profil és fiók megnyitása</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.primary} />
        </Pressable>

        <Section title="Család" palette={palette}>
          <MenuItem
            icon="people-outline"
            label="Családtagok"
            accent="#3B82F6"
            onPress={() => router.push('/invite-member')}
            palette={palette}
          />
          <MenuItem
            icon="git-network-outline"
            label="Családfa"
            accent="#8B5CF6"
            onPress={() => router.push('/family-tree')}
            palette={palette}
          />
          <MenuItem
            icon="location-outline"
            label="Helymegosztás"
            accent="#14B8A6"
            onPress={() => router.push('/location-sharing')}
            palette={palette}
          />
          <MenuItem
            icon="happy-outline"
            label="Gyermekmodul"
            accent="#F59E0B"
            onPress={() => router.push('/school-children')}
            palette={palette}
            last
          />
        </Section>

        <Section title="Közösségi tér" palette={palette}>
          <MenuItem
            icon="heart-outline"
            label="Kedvencek"
            accent="#F43F5E"
            onPress={() => router.push('/favorites' as never)}
            palette={palette}
            last
          />
        </Section>

        <Section title="Szervezés" palette={palette}>
          <MenuItem
            icon="checkbox-outline"
            label="Teendők és bevásárlás"
            accent="#22A06B"
            onPress={() => router.push('/tasks' as never)}
            palette={palette}
          />
          <MenuItem
            icon="alarm-outline"
            label="Emlékeztetők"
            accent="#F97316"
            onPress={() => router.push('/reminders')}
            palette={palette}
          />
          <MenuItem
            icon="wallet-outline"
            label="Családi költségvetés"
            accent="#0EA5E9"
            onPress={() => router.push('/budget')}
            palette={palette}
          />
          <MenuItem
            icon="medkit-outline"
            label="Gyógyszerek"
            accent={palette.danger}
            onPress={() => router.push('/medications')}
            palette={palette}
            last
          />
        </Section>

        <Section title="Áttekintés és biztonság" palette={palette}>
          <MenuItem
            icon="speedometer-outline"
            label="Vezérlőpult"
            accent="#6366F1"
            onPress={() => router.push('/family-dashboard')}
            palette={palette}
          />
          <MenuItem
            icon="pulse-outline"
            label="Aktivitásnapló"
            accent="#EC4899"
            onPress={() => router.push('/activity-log')}
            palette={palette}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Páncélterem"
            accent="#10B981"
            onPress={() => router.push('/vault')}
            palette={palette}
          />
          <MenuItem
            icon="settings-outline"
            label="Beállítások"
            accent="#64748B"
            onPress={() => router.push('/settings')}
            palette={palette}
            last
          />
        </Section>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adatvédelem és biztonság megnyitása"
          onPress={() => router.push('/privacy')}
          style={({ pressed }) => [
            styles.securityCard,
            { backgroundColor: isDark ? '#123D48' : '#E9FBF6' },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.securityIcon, { backgroundColor: isDark ? '#0C4A45' : '#D2F6EC' }]}>
            <Ionicons name="shield-checkmark" size={26} color="#20BFA7" />
          </View>
          <View style={styles.securityContent}>
            <Text style={[styles.securityTitle, { color: isDark ? '#7EE7D3' : '#117C6C' }]}>
              Adatvédelem és biztonság
            </Text>
            <Text style={[styles.securityText, { color: isDark ? '#A6CEC7' : '#3F8A7D' }]}>
              Adatkezelési tájékoztató
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#20BFA7" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  title: {
    paddingTop: spacing.sm,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  profileCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  avatarRing: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: 34,
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  profileContent: { flex: 1, gap: 3 },
  profileName: { fontSize: 19, fontWeight: '900' },
  profileRole: { fontSize: 13, fontWeight: '700' },
  section: { gap: spacing.sm },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  menu: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  menuItem: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '800' },
  securityCard: {
    minHeight: 84,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  securityIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  securityContent: { flex: 1, gap: 4 },
  securityTitle: { fontSize: 14, fontWeight: '900' },
  securityText: { fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
