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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { createFamily } from '@/services/families';

const MAX_NAME_LENGTH = 80;

export default function CreateFamilyScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedName = name.trim();
  const canSubmit = normalizedName.length >= 2 && !submitting;
  const ownerName = profile?.display_name || 'Te';
  const ownerInitial = ownerName.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await createFamily(normalizedName);
      router.replace('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'A család létrehozása sikertelen. Próbáld újra.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <View pointerEvents="none" style={styles.glowTop} />
        <View pointerEvents="none" style={styles.glowSide} />

        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Bezárás"
            accessibilityRole="button"
            disabled={submitting}
            hitSlop={8}
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>

          <View style={styles.stepBadge}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>ÚJ CSALÁDI KÖR</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIconInner}>
                <Text style={styles.heroIcon}>⌂</Text>
              </View>
              <View style={styles.plusBadge}>
                <Text style={styles.plusText}>+</Text>
              </View>
            </View>

            <Text style={styles.title}>Hozd létre a családi tereteket</Text>
            <Text style={styles.description}>
              Egy biztonságos, közös hely a család eseményeinek, emlékeinek és fontos adatainak.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>A család neve</Text>
              <Text style={styles.counter}>{name.length}/{MAX_NAME_LENGTH}</Text>
            </View>

            <View style={[styles.inputShell, errorMessage && styles.inputShellError]}>
              <View style={styles.inputIcon}>
                <Text style={styles.inputIconText}>⌂</Text>
              </View>
              <TextInput
                accessibilityLabel="A család neve"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!submitting}
                maxLength={MAX_NAME_LENGTH}
                onChangeText={(value) => {
                  setName(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={() => void submit()}
                placeholder="Például: Sümegi család"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                selectionColor={colors.primaryLight}
                style={styles.input}
                value={name}
              />
            </View>

            <Text style={styles.hint}>Ezt a nevet minden meghívott családtag látni fogja.</Text>

            {errorMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerInitial}>{ownerInitial}</Text>
            </View>
            <View style={styles.ownerContent}>
              <Text style={styles.ownerEyebrow}>TULAJDONOS</Text>
              <Text numberOfLines={1} style={styles.ownerName}>{ownerName}</Text>
              <Text style={styles.ownerDescription}>Teljes hozzáféréssel és kezelési jogosultsággal</Text>
            </View>
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldIcon}>✓</Text>
            </View>
          </View>

          <View style={styles.privacyRow}>
            <Text style={styles.privacyIcon}>◆</Text>
            <Text style={styles.privacyText}>
              A családi kör privát. Később csak az általad meghívott személyek csatlakozhatnak.
            </Text>
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
                <Text style={styles.primaryButtonText}>Létrehozás…</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonText}>Családi kör létrehozása</Text>
                <Text style={styles.arrow}>→</Text>
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
  glowTop: {
    position: 'absolute', top: -120, right: -80, width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#173B8F', opacity: 0.22,
  },
  glowSide: {
    position: 'absolute', top: 240, left: -150, width: 280, height: 280,
    borderRadius: 140, backgroundColor: '#5523A6', opacity: 0.12,
  },
  header: {
    minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  closeButton: {
    width: 40, height: 40, borderRadius: radius.round, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  closeIcon: { marginTop: -2, color: colors.textSecondary, fontSize: 26, fontWeight: '300' },
  stepBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.round,
    backgroundColor: '#10254B', borderWidth: 1, borderColor: '#224276',
  },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  stepText: { color: colors.primaryLight, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  headerSpacer: { width: 40 },
  content: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    paddingBottom: spacing.xxl, gap: spacing.lg,
  },
  hero: { alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  heroIconOuter: {
    width: 84, height: 84, marginBottom: spacing.sm, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#102855',
    borderWidth: 1, borderColor: '#2859A3', transform: [{ rotate: '-4deg' }],
  },
  heroIconInner: {
    width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, transform: [{ rotate: '4deg' }],
  },
  heroIcon: { color: '#FFFFFF', fontSize: 31, fontWeight: '800' },
  plusBadge: {
    position: 'absolute', right: -7, bottom: -7, width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8B5CF6', borderWidth: 3, borderColor: colors.background,
    transform: [{ rotate: '4deg' }],
  },
  plusText: { color: '#FFFFFF', fontSize: 18, lineHeight: 19, fontWeight: '800' },
  title: {
    color: colors.textPrimary, fontSize: 27, lineHeight: 33,
    fontWeight: '900', textAlign: 'center',
  },
  description: {
    maxWidth: 330, color: colors.textMuted, fontSize: 14,
    lineHeight: 21, textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  counter: { color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  inputShell: {
    minHeight: 58, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong,
  },
  inputShellError: { borderColor: colors.danger },
  inputIcon: { width: 46, alignItems: 'center', justifyContent: 'center' },
  inputIconText: { color: colors.primaryLight, fontSize: 21, fontWeight: '700' },
  input: {
    flex: 1, minHeight: 58, paddingRight: spacing.md,
    color: colors.textPrimary, fontSize: 15, fontWeight: '600',
  },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  errorBox: {
    marginTop: spacing.xs, padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', gap: spacing.sm, borderRadius: radius.md,
    backgroundColor: '#3B1622', borderWidth: 1, borderColor: '#7F2439',
  },
  errorIcon: {
    width: 20, height: 20, borderRadius: 10, color: '#FFFFFF',
    backgroundColor: colors.danger, textAlign: 'center', lineHeight: 20,
    fontSize: 12, fontWeight: '900',
  },
  errorText: { flex: 1, color: '#FDA4AF', fontSize: 12, lineHeight: 17 },
  ownerCard: {
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, backgroundColor: '#0D1B31',
    borderWidth: 1, borderColor: colors.border,
  },
  ownerAvatar: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D6B38D', borderWidth: 2, borderColor: '#F2D0A7',
  },
  ownerInitial: { color: '#3B2415', fontSize: 16, fontWeight: '900' },
  ownerContent: { flex: 1, gap: 2 },
  ownerEyebrow: { color: colors.primaryLight, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  ownerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  ownerDescription: { color: colors.textMuted, fontSize: 10 },
  shieldBadge: {
    width: 28, height: 28, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#0B3B35',
  },
  shieldIcon: { color: colors.success, fontSize: 15, fontWeight: '900' },
  privacyRow: {
    paddingHorizontal: spacing.sm, flexDirection: 'row',
    alignItems: 'flex-start', gap: spacing.sm,
  },
  privacyIcon: { marginTop: 2, color: colors.purple, fontSize: 11 },
  privacyText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: '#071123F2', borderTopWidth: 1, borderTopColor: colors.border,
  },
  primaryButton: {
    minHeight: 56, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  primaryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: {
    backgroundColor: '#263753', shadowOpacity: 0, elevation: 0, opacity: 0.68,
  },
  buttonContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  arrow: { color: '#FFFFFF', fontSize: 21, lineHeight: 22, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
