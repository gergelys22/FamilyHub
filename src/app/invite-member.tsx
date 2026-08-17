import { useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { createFamilyInvite, InviteRole } from '@/services/family-invites';

const roleOptions: { value: InviteRole; title: string; description: string; icon: string }[] = [
  { value: 'adult', title: 'Felnőtt', description: 'Események és közös tartalmak kezelése', icon: '●' },
  { value: 'dependent', title: 'Gyermek', description: 'Korlátozott, gondviselő által kezelt profil', icon: '★' },
  { value: 'viewer', title: 'Megtekintő', description: 'Csak a megosztott információk elérése', icon: '◉' },
];

export default function InviteMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ familyId?: string; familyName?: string }>();
  const familyId = typeof params.familyId === 'string' ? params.familyId : '';
  const familyName = typeof params.familyName === 'string' ? params.familyName : 'Családi kör';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('adult');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = familyId.length > 0 && normalizedEmail.includes('@') && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await createFamilyInvite(familyId, normalizedEmail, role);
      setSuccess(true);
    } catch (error) {
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
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.successScreen}>
          <View style={styles.successHalo}>
            <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
          </View>
          <Text style={styles.successTitle}>Meghívás rögzítve</Text>
          <Text style={styles.successDescription}>
            A meghívás elkészült {normalizedEmail} számára, és 7 napig érvényes.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>i</Text>
            <Text style={styles.infoText}>
              Az automatikus e-mail-küldést a saját SMTP beállításakor kapcsoljuk be.
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={reset} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>További családtag meghívása</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.textButton}>
            <Text style={styles.textButtonText}>Vissza a főoldalra</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View pointerEvents="none" style={styles.glow} />

        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Bezárás"
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Új családtag</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatar, styles.avatarBack]}><Text style={styles.avatarText}>⌂</Text></View>
              <View style={[styles.avatar, styles.avatarFront]}><Text style={styles.avatarText}>+</Text></View>
            </View>
            <Text style={styles.title}>Kit szeretnél meghívni?</Text>
            <Text style={styles.subtitle}>
              Meghívás a(z) <Text style={styles.familyName}>{familyName}</Text> családi körbe.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>E-mail-cím</Text>
            <View style={[styles.inputShell, errorMessage && styles.inputShellError]}>
              <Text style={styles.mailIcon}>@</Text>
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
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                selectionColor={colors.primaryLight}
                style={styles.input}
                value={email}
              />
            </View>

            <Text style={[styles.label, styles.roleLabel]}>Szerepkör</Text>
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
                    style={[styles.roleCard, selected && styles.roleCardSelected]}>
                    <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                      <Text style={[styles.roleIconText, selected && styles.roleIconTextSelected]}>{option.icon}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{option.title}</Text>
                      <Text style={styles.roleDescription}>{option.description}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {errorMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorMark}>!</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.privacyRow}>
            <Text style={styles.privacyIcon}>◆</Text>
            <Text style={styles.privacyText}>A meghívott csak az engedélyezett családi adatokat érheti majd el.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && canSubmit && styles.primaryButtonPressed,
              !canSubmit && styles.primaryButtonDisabled,
            ]}>
            {submitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryButtonText}>Meghívás mentése…</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonText}>Meghívás létrehozása</Text>
                <Text style={styles.buttonArrow}>→</Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  glow: {
    position: 'absolute', top: -120, right: -100, width: 280, height: 280,
    borderRadius: 140, backgroundColor: '#5530B8', opacity: 0.15,
  },
  header: {
    minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  closeButton: {
    width: 40, height: 40, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  closeText: { marginTop: -2, color: colors.textSecondary, fontSize: 26, fontWeight: '300' },
  headerTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '800' },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  avatarStack: { width: 92, height: 68, marginBottom: spacing.sm },
  avatar: {
    position: 'absolute', width: 58, height: 58, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background,
  },
  avatarBack: { left: 2, top: 1, backgroundColor: '#173B6D', transform: [{ rotate: '-7deg' }] },
  avatarFront: { right: 2, bottom: 0, backgroundColor: colors.purple, transform: [{ rotate: '7deg' }] },
  avatarText: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  familyName: { color: colors.primaryLight, fontWeight: '800' },
  formCard: {
    padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  roleLabel: { marginTop: spacing.md },
  inputShell: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong,
  },
  inputShellError: { borderColor: colors.danger },
  mailIcon: { width: 44, color: colors.primaryLight, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  input: { flex: 1, minHeight: 56, paddingRight: spacing.md, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  roleList: { gap: spacing.sm },
  roleCard: {
    minHeight: 64, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.md, backgroundColor: '#0D192D', borderWidth: 1, borderColor: colors.border,
  },
  roleCardSelected: { backgroundColor: '#11284A', borderColor: colors.primary },
  roleIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  roleIconSelected: { backgroundColor: '#1C4A83' },
  roleIconText: { color: colors.textMuted, fontSize: 14, fontWeight: '900' },
  roleIconTextSelected: { color: colors.primaryLight },
  roleTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  roleTitleSelected: { color: colors.textPrimary },
  roleDescription: { marginTop: 2, color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  flex: { flex: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  errorBox: {
    marginTop: spacing.sm, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, backgroundColor: '#3B1622', borderWidth: 1, borderColor: '#7F2439',
  },
  errorMark: {
    width: 20, height: 20, borderRadius: 10, color: '#FFFFFF', backgroundColor: colors.danger,
    textAlign: 'center', lineHeight: 20, fontSize: 12, fontWeight: '900',
  },
  errorText: { flex: 1, color: '#FDA4AF', fontSize: 12, lineHeight: 17 },
  privacyRow: { paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  privacyIcon: { marginTop: 2, color: colors.purple, fontSize: 11 },
  privacyText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: '#071123F2', borderTopWidth: 1, borderTopColor: colors.border,
  },
  primaryButton: {
    minHeight: 56, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, backgroundColor: colors.primary, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  primaryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { backgroundColor: '#263753', shadowOpacity: 0, elevation: 0, opacity: 0.68 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonArrow: { color: '#FFFFFF', fontSize: 20 },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textButtonText: { color: colors.primaryLight, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.7 },
  successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  successHalo: {
    width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0B3B3533', borderWidth: 1, borderColor: '#176B5F',
  },
  successIcon: {
    width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.success,
  },
  successCheck: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  successTitle: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  successDescription: { maxWidth: 330, color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  infoBox: {
    maxWidth: 350, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.md, backgroundColor: '#10233F', borderWidth: 1, borderColor: '#2A456C',
  },
  infoIcon: {
    width: 20, height: 20, borderRadius: 10, color: '#FFFFFF', backgroundColor: colors.primary,
    textAlign: 'center', lineHeight: 20, fontSize: 11, fontWeight: '900',
  },
  infoText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
});
