import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
};

const profileTypeLabels = {
  account: 'Fióktulajdonos',
  dependent: 'Családtag',
  ancestor: 'Ős',
} as const;

function DetailRow({ icon, color, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text selectable style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, profileError, session, signOut } = useAuth();
  const displayName = profile?.display_name || 'Felhasználó';
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const emailConfirmed = session?.user.email_confirmed_at
    ? 'Megerősítve'
    : 'Nincs megerősítve';
  const profileType = profile ? profileTypeLabels[profile.profile_type] : 'Betöltés alatt';
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      setAvatarUri(`${publicUrl.publicUrl}?v=${Date.now()}`);
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Vissza"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil szerkesztése"
          onPress={() => Alert.alert('Profil szerkesztése', 'A profil szerkesztése hamarosan elérhető.')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <View pointerEvents="none" style={styles.identityGlow} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilkép kiválasztása"
            disabled={uploadingAvatar}
            onPress={() => void handlePickAvatar()}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            {avatarUri || profile?.avatar_path ? (
              <Image
                source={{
                  uri:
                    avatarUri ||
                    supabase.storage.from('avatars').getPublicUrl(profile?.avatar_path ?? '').data
                      .publicUrl,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons
                name={uploadingAvatar ? 'hourglass-outline' : 'camera'}
                size={13}
                color={colors.white}
              />
            </View>
          </Pressable>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.rolePill}>
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={styles.roleText}>{profileType}</Text>
          </View>
          <Text style={styles.email}>{session?.user.email ?? 'Nincs e-mail-cím'}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Fiókod védett</Text>
            <Text style={styles.statusText}>A családi adataid biztonságban vannak.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.success} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fiókadatok</Text>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
          </View>
          <DetailRow
            icon="person-outline"
            color={colors.primary}
            label="Megjelenített név"
            value={displayName}
          />
          <DetailRow
            icon="mail-outline"
            color={colors.purple}
            label="E-mail-cím"
            value={session?.user.email ?? 'Nincs megadva'}
          />
          <DetailRow
            icon="checkmark-circle-outline"
            color={emailConfirmed === 'Megerősítve' ? colors.success : colors.warning}
            label="E-mail állapota"
            value={emailConfirmed}
          />
          <DetailRow
            icon="ribbon-outline"
            color={colors.pink}
            label="Profiltípus"
            value={profileType}
          />
        </View>

        {profileError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              A profiladatok betöltése sikertelen: {profileError}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={21} color={colors.danger} />
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
    ...shadows.card,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  identityCard: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#EEF4FF',
    ...shadows.card,
  },
  identityGlow: {
    position: 'absolute',
    top: -100,
    right: -45,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#C7D9FF',
    opacity: 0.7,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6B38D',
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarText: { color: '#3B2415', fontSize: 39, fontWeight: '900' },
  name: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  rolePill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
    backgroundColor: colors.white,
  },
  roleText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  email: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 13 },
  statusCard: {
    minHeight: 76,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#E9FBF6',
  },
  statusIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#D2F6EC',
  },
  statusContent: { flex: 1, gap: 3 },
  statusTitle: { color: '#117C6C', fontSize: 13, fontWeight: '900' },
  statusText: { color: '#4B9E90', fontSize: 11, fontWeight: '700' },
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  detailRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderColor: '#FFD7DE',
    backgroundColor: '#FFF0F3',
  },
  signOutText: { color: '#C33D52', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.7 },
});
