import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { getMyFamilies } from '@/services/families';
import { createFamilyInvite, InviteCreatedError, InviteRole } from '@/services/family-invites';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const roleOptions: {
  value: InviteRole;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}[] = [
  {
    value: 'adult',
    title: 'Felnőtt',
    description: 'Események és közös tartalmak kezelése',
    icon: 'person',
    color: colors.primary,
  },
  {
    value: 'dependent',
    title: 'Gyermek',
    description: 'Korlátozott, gondviselő által kezelt profil',
    icon: 'happy',
    color: colors.warning,
  },
  {
    value: 'viewer',
    title: 'Megtekintő',
    description: 'Csak a megosztott információk elérése',
    icon: 'eye',
    color: colors.teal,
  },
];

export default function InviteMemberScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const params = useLocalSearchParams<{ familyId?: string; familyName?: string }>();
  const paramFamilyId = typeof params.familyId === 'string' ? params.familyId : '';
  const paramFamilyName = typeof params.familyName === 'string' ? params.familyName : '';
  const [fallbackFamily, setFallbackFamily] = useState<{ id: string; name: string } | null>(null);

  // Ha a képernyőt paraméterek nélkül nyitják (pl. a "Több" menüből), az első családi kört használjuk.
  useEffect(() => {
    if (paramFamilyId) return;
    let active = true;
    void getMyFamilies()
      .then((families) => {
        const first = families[0];
        if (active && first) setFallbackFamily({ id: first.id, name: first.name });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [paramFamilyId]);

  const familyId = paramFamilyId || fallbackFamily?.id || '';
  const familyName = paramFamilyName || fallbackFamily?.name || 'Családi kör';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('adult');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = familyId.length > 0 && normalizedEmail.includes('@') && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await createFamilyInvite(familyId, normalizedEmail, role);
      setEmailSent(true);
      setSuccess(true);
    } catch (error) {
      if (error instanceof InviteCreatedError) {
        setEmailSent(false);
        setSuccess(true);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'A meghívás létrehozása sikertelen.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setEmail('');
    setRole('adult');
    setErrorMessage(null);
    setSuccess(false);
    setEmailSent(true);
  }

  if (success) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={styles.successScreen}>
          <View
            style={[
              styles.successHalo,
              {
                backgroundColor: isDark ? '#0B3B3533' : '#E3F7F2',
                borderColor: isDark ? '#176B5F' : '#B7E7DC',
              },
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: emailSent ? colors.success : colors.warning }]}>
              <Ionicons name={emailSent ? 'checkmark' : 'mail-unread'} size={36} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.successTitle, { color: palette.textPrimary }]}>Meghívás rögzítve</Text>
          <Text style={[styles.successDescription, { color: palette.textMuted }]}>
            {emailSent
              ? `A meghívás elkészült ${normalizedEmail} számára e-mailben és 7 napig érvényes.`
              : `A meghívás rögzítve lett ${normalizedEmail} számára, de az e-mail küldése most sikertelen.`}
          </Text>
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: isDark ? '#10233F' : palette.primarySoft,
                borderColor: isDark ? '#2A456C' : palette.border,
              },
            ]}
          >
            <Ionicons name="information-circle" size={20} color={palette.primary} />
            <Text style={[styles.infoText, { color: palette.textSecondary }]}>
              {emailSent
                ? 'A meghívás értesítésként és e-mailben is elküldésre kerül.'
                : 'A meghívás alkalmazáson belül továbbra is megjelenik, ha a meghívott már regisztrált.'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={reset}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.primary },
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>További családtag meghívása</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.textButton}>
            <Text style={[styles.textButtonText, { color: palette.primary }]}>Vissza a főoldalra</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ['#5530B8', '#5530B800'] : [palette.primarySoft, '#FFFFFF00']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glow}
        />

        <View style={styles.header}>
          <ScreenCloseButton
            accessibilityLabel="Meghívó bezárása"
            disabled={submitting}
            onPress={() => !submitting && router.replace('/')}
          />
          <Text style={[styles.headerTitle, { color: palette.textSecondary }]}>Új családtag</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatar, styles.avatarBack, { borderColor: palette.background }]}>
                <Ionicons name="people" size={26} color="#FFFFFF" />
              </View>
              <View style={[styles.avatar, styles.avatarFront, { borderColor: palette.background }]}>
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Kit szeretnél meghívni?</Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Meghívás a(z) <Text style={[styles.familyName, { color: palette.primary }]}>{familyName}</Text> családi
              körbe.
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>E-mail-cím</Text>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: errorMessage ? palette.danger : palette.border,
                },
              ]}
            >
              <View style={styles.mailIcon}>
                <Ionicons name="mail-outline" size={20} color={palette.primary} />
              </View>
              <TextInput
                accessibilityLabel="Meghívott e-mail-címe"
                autoCapitalize="none"
                autoComplete="email"
                editable={!submitting}
                inputMode="email"
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={() => void submit()}
                placeholder="csaladtag@email.hu"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                selectionColor={palette.primary}
                style={[styles.input, { color: palette.textPrimary }]}
                value={email}
              />
            </View>

            <Text style={[styles.label, styles.roleLabel, { color: palette.textSecondary }]}>Szerepkör</Text>
            <View style={styles.roleList}>
              {roleOptions.map((option) => {
                const selected = option.value === role;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    disabled={submitting}
                    key={option.value}
                    onPress={() => setRole(option.value)}
                    style={({ pressed }) => [
                      styles.roleCard,
                      {
                        backgroundColor: selected ? `${option.color}1A` : palette.surfaceElevated,
                        borderColor: selected ? option.color : palette.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        { backgroundColor: selected ? option.color : `${option.color}22` },
                      ]}
                    >
                      <Ionicons name={option.icon} size={19} color={selected ? '#FFFFFF' : option.color} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.roleTitle, { color: palette.textPrimary }]}>{option.title}</Text>
                      <Text style={[styles.roleDescription, { color: palette.textMuted }]}>{option.description}</Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? option.color : palette.borderStrong,
                          backgroundColor: selected ? option.color : 'transparent',
                        },
                      ]}
                    >
                      {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {errorMessage ? (
              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                    borderColor: isDark ? '#7F2439' : '#F8C8D0',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={palette.danger} />
                <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#A52A3A' }]}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={14} color={colors.purple} style={styles.privacyIcon} />
            <Text style={[styles.privacyText, { color: palette.textMuted }]}>
              A meghívott csak az engedélyezett családi adatokat érheti majd el.
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: isDark ? '#071123F2' : palette.glassBackground,
              borderTopColor: palette.border,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: canSubmit ? palette.primary : isDark ? '#263753' : palette.surfaceMuted },
              !canSubmit && styles.primaryButtonDisabled,
              pressed && canSubmit && styles.primaryButtonPressed,
            ]}
          >
            {submitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryButtonText}>Meghívás mentése…</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="paper-plane" size={18} color={canSubmit ? '#FFFFFF' : palette.textMuted} />
                <Text style={[styles.primaryButtonText, !canSubmit && { color: palette.textMuted }]}>
                  Meghívás létrehozása
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '72%',
    height: 220,
    opacity: 0.15,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 14, fontWeight: '800' },
  headerSpacer: { width: 40 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  avatarStack: { width: 96, height: 72, marginBottom: spacing.sm },
  avatar: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...shadows.card,
  },
  avatarBack: {
    left: 2,
    top: 1,
    backgroundColor: '#2F6BFF',
    transform: [{ rotate: '-7deg' }],
  },
  avatarFront: {
    right: 2,
    bottom: 0,
    backgroundColor: colors.purple,
    transform: [{ rotate: '7deg' }],
  },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  familyName: { fontWeight: '800' },
  formCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  label: { fontSize: 13, fontWeight: '800' },
  roleLabel: { marginTop: spacing.md },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  mailIcon: { width: 46, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 56,
    paddingRight: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
  roleList: { gap: spacing.sm },
  roleCard: {
    minHeight: 68,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { fontSize: 14, fontWeight: '900' },
  roleDescription: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  flex: { flex: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  errorBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  privacyRow: {
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  privacyIcon: { marginTop: 2 },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    ...shadows.floating,
  },
  primaryButtonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textButtonText: { fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  successScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  successHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  successDescription: { maxWidth: 330, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  infoBox: {
    maxWidth: 350,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});