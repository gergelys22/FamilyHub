import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

type DetailRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
  palette: Palette;
  last?: boolean;
};

const profileTypeLabels = {
  account: 'Fióktulajdonos',
  dependent: 'Családtag',
  ancestor: 'Ős',
} as const;

function DetailRow({ icon, color, label, value, palette, last }: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        !last && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.detailIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>{label}</Text>
        <Text selectable style={[styles.detailValue, { color: palette.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile, profileError, session, signOut } = useAuth();
  const displayName = profile?.display_name || 'Felhasználó';
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const emailConfirmed = session?.user.email_confirmed_at ? 'Megerősítve' : 'Nincs megerősítve';
  const profileType = profile ? profileTypeLabels[profile.profile_type] : 'Betöltés alatt';
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let active = true;
    if (!profile?.avatar_path) {
      return () => {
        active = false;
      };
    }

    void supabase.storage
      .from('avatars')
      .createSignedUrl(profile.avatar_path, 300)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAvatarUri(null);
          return;
        }
        setAvatarUri(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [profile?.avatar_path]);

  async function handlePickAvatar() {
    if (!profile || uploadingAvatar) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Hozzáférés szükséges',
        'A profilkép feltöltéséhez engedélyezned kell a fotókönyvtár hozzáférését.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = asset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      const path = `${profile.id}/avatar-${Date.now()}.${extension}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(path, 300);
      if (signedUrlError) throw signedUrlError;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      setAvatarUri(signedUrl.signedUrl);
      Alert.alert('Sikeres feltöltés', 'A profilképed frissült.');
    } catch (caught) {
      Alert.alert(
        'Sikertelen feltöltés',
        caught instanceof Error ? caught.message : 'A profilkép feltöltése nem sikerült.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    const error = await signOut();
    if (!error) router.replace('/sign-in?mode=login');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Profil</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil szerkesztése"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="create-outline" size={22} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.identityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['#1B4FC4', '#12307A'] : ['#2F6BFF', '#1B3FD8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerCircleLarge} />
            <View style={styles.bannerCircleSmall} />
          </LinearGradient>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilkép kiválasztása"
            disabled={uploadingAvatar}
            onPress={() => void handlePickAvatar()}
            style={({ pressed }) => [
              styles.avatar,
              { backgroundColor: palette.primary, borderColor: palette.surface },
              pressed && styles.pressed,
            ]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
            <View style={[styles.avatarBadge, { borderColor: palette.surface, backgroundColor: palette.primary }]}>
              <Ionicons name={uploadingAvatar ? 'hourglass-outline' : 'camera'} size={13} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.identityBody}>
            <Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text>
            <View style={[styles.rolePill, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name="people-outline" size={14} color={palette.primary} />
              <Text style={[styles.roleText, { color: palette.primary }]}>{profileType}</Text>
            </View>
            <Text style={[styles.email, { color: palette.textMuted }]}>
              {session?.user.email ?? 'Nincs e-mail-cím'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: isDark ? '#0B302F' : '#E9FBF6',
              borderColor: isDark ? '#17544D' : '#CBEADF',
            },
          ]}
        >
          <View style={[styles.statusIcon, { backgroundColor: isDark ? '#0C4A45' : '#D2F6EC' }]}>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: isDark ? '#D1FAE5' : '#117C6C' }]}>Fiókod védett</Text>
            <Text style={[styles.statusText, { color: isDark ? '#93C5B5' : '#3F8A7D' }]}>
              A családi adataid biztonságban vannak.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Fiókadatok</Text>
            <Ionicons name="person-circle-outline" size={22} color={palette.primary} />
          </View>
          <DetailRow
            icon="person-outline"
            color={colors.primary}
            label="Megjelenített név"
            value={displayName}
            palette={palette}
          />
          <DetailRow
            icon="mail-outline"
            color={colors.purple}
            label="E-mail-cím"
            value={session?.user.email ?? 'Nincs megadva'}
            palette={palette}
          />
          <DetailRow
            icon="checkmark-circle-outline"
            color={emailConfirmed === 'Megerősítve' ? colors.success : colors.warning}
            label="E-mail állapota"
            value={emailConfirmed}
            palette={palette}
          />
          <DetailRow
            icon="ribbon-outline"
            color={colors.pink}
            label="Profiltípus"
            value={profileType}
            palette={palette}
            last
          />
        </View>

        {profileError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                borderColor: isDark ? '#7F2439' : '#F9C5CC',
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FDA4AF' : '#C64052'} />
            <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#C64052' }]}>
              A profiladatok betöltése sikertelen: {profileError}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [
            styles.signOutButton,
            {
              borderColor: isDark ? '#7F2439' : '#FFD7DE',
              backgroundColor: isDark ? '#3B1622' : '#FFF0F3',
            },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={21} color={isDark ? '#FDA4AF' : '#C33D52'} />
          <Text style={[styles.signOutText, { color: isDark ? '#FDA4AF' : '#C33D52' }]}>Kijelentkezés</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 21, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  identityCard: {
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  banner: { width: '100%', height: 104, overflow: 'hidden' },
  bannerCircleLarge: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerCircleSmall: {
    position: 'absolute',
    bottom: -30,
    left: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 108,
    height: 108,
    marginTop: -54,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    ...shadows.card,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 54 },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 3,
  },
  avatarText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900' },
  identityBody: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  name: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
  },
  roleText: { fontSize: 12, fontWeight: '900' },
  email: { marginTop: 2, fontSize: 13 },
  statusCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statusIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  statusContent: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 14, fontWeight: '900' },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  detailRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: { flex: 1, gap: 3 },
  detailLabel: { fontSize: 11, fontWeight: '700' },
  detailValue: { fontSize: 15, fontWeight: '700' },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  signOutText: { fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.7 },
});