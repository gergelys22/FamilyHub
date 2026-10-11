import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color?: string;
  onPress: () => void;
  palette: typeof colors | typeof darkColors;
};

function MenuItem({ icon, label, color = colors.primary, onPress, palette }: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={23} color={color} />
      <Text style={[styles.menuLabel, { color: palette.textPrimary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textPrimary} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: palette.textPrimary }]}>Több</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil megnyitása"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: palette.surface },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>G</Text>
          </View>
          <View style={styles.profileContent}>
            <Text style={[styles.profileName, { color: palette.textPrimary }]}>Gergely</Text>
            <Text style={[styles.profileRole, { color: palette.textSecondary }]}>Családszervező</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.primary} />
        </Pressable>

        <View style={styles.menu}>
          <MenuItem
            icon="people-outline"
            label="Családtagok"
            onPress={() => router.push('/invite-member')}
            palette={palette}
          />
          <MenuItem
            icon="git-network-outline"
            label="Családfa"
            onPress={() => router.push('/family-tree')}
            palette={palette}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Páncélterem"
            onPress={() => router.push('/vault')}
            palette={palette}
          />
          <MenuItem
            icon="medkit-outline"
            label="Gyógyszerek"
            color={colors.danger}
            onPress={() => router.push('/medications')}
            palette={palette}
          />
          <MenuItem
            icon="alarm-outline"
            label="Emlékeztetők"
            onPress={() => router.push('/reminders')}
            palette={palette}
          />
          <MenuItem
            icon="checkbox-outline"
            label="Teendők és bevásárlás"
            onPress={() => router.push('/tasks' as never)}
            palette={palette}
          />
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="Üzenetek"
            onPress={() => router.push('/messages')}
            palette={palette}
          />
          <MenuItem
            icon="location-outline"
            label="Helymegosztás"
            onPress={() => router.push('/location-sharing')}
            palette={palette}
          />
          <MenuItem
            icon="settings-outline"
            label="Beállítások"
            onPress={() => router.push('/settings')}
            palette={palette}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/privacy')}
          style={({ pressed }) => [
            styles.securityCard,
            { backgroundColor: isDark ? '#123D48' : '#E9FBF6' },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark" size={27} color="#20BFA7" />
          </View>
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Adatvédelem és biztonság</Text>
            <Text style={styles.securityText}>Adatkezelési tájékoztató</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#20BFA7" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FBFF' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 36, gap: spacing.md },
  title: {
    paddingTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  profileCard: {
    minHeight: 104,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#EEF4FF',
    ...shadows.card,
  },
  avatar: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    backgroundColor: '#D6B38D',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarText: { color: '#5F351D', fontSize: 26, fontWeight: '900' },
  profileContent: { flex: 1, gap: 3 },
  profileName: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  profileRole: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  menu: { gap: 2, paddingVertical: spacing.xs },
  menuItem: {
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  menuLabel: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '800' },
  securityCard: {
    minHeight: 84,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#E9FBF6',
  },
  securityIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#D2F6EC',
  },
  securityContent: { flex: 1, gap: 4 },
  securityTitle: { color: '#117C6C', fontSize: 13, fontWeight: '900' },
  securityText: { color: '#4B9E90', fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
