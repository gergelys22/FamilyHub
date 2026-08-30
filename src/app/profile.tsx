import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailRowProps = {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
};

const profileTypeLabels = {
  account: 'Fióktulajdonos',
  dependent: 'Családtag',
  ancestor: 'Ős',
} as const;

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <SymbolView
          name={icon}
          size={21}
          tintColor={colors.primaryLight}
          type="hierarchical"
          weight={{ ios: 'medium', android: medium }}
          style={styles.symbol}
        />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text selectable style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, profileError, session, signOut } = useAuth();
  const displayName = profile?.display_name || 'Felhasználó';
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const emailConfirmed = session?.user.email_confirmed_at ? 'Megerősítve' : 'Nincs megerősítve';

  async function handleSignOut() {
    const error = await signOut();
    if (!error) router.replace('/sign-in?mode=login');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Vissza"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={23}
            tintColor={colors.textPrimary}
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{session?.user.email ?? 'Nincs e-mail-cím'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fiókadatok</Text>
          <DetailRow
            icon={{ ios: 'person.fill', android: 'person', web: 'person' }}
            label="Megjelenített név"
            value={displayName}
          />
          <DetailRow
            icon={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
            label="E-mail-cím"
            value={session?.user.email ?? 'Nincs megadva'}
          />
          <DetailRow
            icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
            label="E-mail állapota"
            value={emailConfirmed}
          />
          <DetailRow
            icon={{ ios: 'person.badge.key.fill', android: 'badge', web: 'badge' }}
            label="Profiltípus"
            value={profile ? profileTypeLabels[profile.profile_type] : 'Betöltés alatt'}
          />
        </View>

        {profileError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>A profiladatok betöltése sikertelen: {profileError}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            size={21}
            tintColor="#FDA4AF"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
          <Text style={styles.signOutText}>Kijelentkezés</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerPlaceholder: { width: 42 },
  headerTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  identityCard: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6B38D',
    borderWidth: 4,
    borderColor: colors.surfaceElevated,
  },
  avatarText: { color: '#3B2415', fontSize: 35, fontWeight: '900' },
  name: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  email: { color: colors.textMuted, fontSize: 14 },
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: { marginBottom: spacing.xs, color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  detailRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
  },
  symbol: { width: 25, height: 25 },
  detailContent: { flex: 1, gap: 3 },
  detailLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  detailValue: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#3B1622' },
  errorText: { color: '#FDA4AF', fontSize: 12, lineHeight: 18 },
  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#7F2439',
    backgroundColor: '#3B1622',
  },
  signOutText: { color: '#FDA4AF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
