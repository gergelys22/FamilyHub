
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, darkColors, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

function EyeIcon({ visible, isDark }: { visible: boolean; isDark: boolean }) {
  return (
    <SymbolView
      name={
        visible
          ? { ios: 'eye.fill', android: 'visibility', web: 'visibility' }
          : { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' }
      }
      size={21}
      tintColor={visible ? colors.primaryLight : isDark ? '#A1A1AA' : '#8A8FA0'}
      type="hierarchical"
      weight={{ ios: 'semibold', android: medium }}
      style={{ width: 25, height: 25 }}
    />
  );
}

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isRegistration = mode === 'register';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit() {
    if (submitting) return;

    setMessage(null);
    setIsError(false);

    if (!email.trim() || !password) {
      setMessage('Add meg az e-mail-címedet és a jelszavadat.');
      setIsError(true);
      return;
    }

    if (isRegistration && !displayName.trim()) {
      setMessage('Add meg a megjelenítendő nevedet.');
      setIsError(true);
      return;
    }

    if (password.length < 8) {
      setMessage('A jelszó legalább 8 karakter hosszú legyen.');
      setIsError(true);
      return;
    }

    if (isRegistration && !confirmPassword) {
      setMessage('Erősítsd meg a jelszavadat.');
      setIsError(true);
      return;
    }

    if (isRegistration && password !== confirmPassword) {
      setMessage('A két jelszó nem egyezik.');
      setIsError(true);
      return;
    }

    setSubmitting(true);

    try {
      if (isRegistration) {
        const result = await signUp(displayName.trim(), email.trim(), password);

        if (result.error) {
          setMessage(result.error);
          setIsError(true);
        } else if (result.needsEmailConfirmation) {
          setMessage(
            'Elküldtük a megerősítő levelet. Belépés előtt erősítsd meg az e-mail-címedet.',
          );
        } else {
          router.replace('/');
        }

        return;
      }

      const error = await signIn(email.trim(), password);

      if (error) {
        setMessage(error);
        setIsError(true);
        return;
      }

      router.replace('/');
    } catch {
      setMessage('Váratlan hiba történt. Kérjük, próbáld újra.');
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    router.setParams({ mode: isRegistration ? 'login' : 'register' });
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setMessage(null);
    setIsError(false);
  }

  const inputStyle = [
    styles.input,
    {
      color: palette.textPrimary,
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.border,
    },
  ];

  function renderPasswordField(
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    visible: boolean,
    toggleVisible: () => void,
    autoComplete: 'new-password' | 'current-password',
    submitOnEnter = false,
  ) {
    return (
      <View
        style={[
          styles.passwordField,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          onChangeText={onChangeText}
          onSubmitEditing={submitOnEnter ? () => void submit() : undefined}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={!visible}
          style={[styles.passwordInput, { color: palette.textPrimary }]}
          value={value}
          returnKeyType={submitOnEnter ? 'go' : 'next'}
        />

        <Pressable
          accessibilityLabel={visible ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={toggleVisible}
          style={({ pressed }) => [
            styles.visibilityButton,
            pressed && styles.pressedIcon,
          ]}
        >
          <EyeIcon visible={visible} isDark={isDark} />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.brand}>
              <View style={styles.logoShadow}>
                <View style={styles.logo}>
                  <SymbolView
                    name={{
                      ios: 'house.fill',
                      android: 'home',
                      web: 'home',
                    }}
                    size={34}
                    tintColor="#FFFFFF"
                    type="hierarchical"
                  />
                </View>
              </View>

              <Text style={[styles.title, { color: palette.textPrimary }]}>
                CsaládTér
              </Text>

              <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                {isRegistration
                  ? 'Hozd létre a saját családi teredet.'
                  : 'Minden, ami a családodhoz tartozik.'}
              </Text>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                  {isRegistration ? 'Üdvözlünk!' : 'Örülünk, hogy újra itt vagy!'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: palette.textMuted }]}>
                  {isRegistration
                    ? 'Töltsd ki az adatokat a fiókod létrehozásához.'
                    : 'Jelentkezz be a családi tered eléréséhez.'}
                </Text>
              </View>

              {isRegistration && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                    Megjelenítendő név
                  </Text>
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="name"
                    onChangeText={setDisplayName}
                    placeholder="Pl. Kovács Anna"
                    placeholderTextColor={palette.textMuted}
                    style={inputStyle}
                    value={displayName}
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                  E-mail-cím
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  inputMode="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="pelda@email.com"
                  placeholderTextColor={palette.textMuted}
                  style={inputStyle}
                  value={email}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                  Jelszó
                </Text>
                {renderPasswordField(
                  password,
                  setPassword,
                  'Legalább 8 karakter',
                  passwordVisible,
                  () => setPasswordVisible((value) => !value),
                  isRegistration ? 'new-password' : 'current-password',
                  !isRegistration,
                )}
              </View>

              {isRegistration && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                    Jelszó megerősítése
                  </Text>
                  {renderPasswordField(
                    confirmPassword,
                    setConfirmPassword,
                    'Írd be újra a jelszavadat',
                    confirmPasswordVisible,
                    () => setConfirmPasswordVisible((value) => !value),
                    'new-password',
                    true,
                  )}
                </View>
              )}

              {message && (
                <View
                  style={[
                    styles.messageBox,
                    {
                      backgroundColor: isError
                        ? isDark ? 'rgba(244,63,94,0.12)' : '#FFF1F2'
                        : isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                      borderColor: isError ? '#F43F5E' : '#10B981',
                    },
                  ]}
                >
                  <SymbolView
                    name={isError
                      ? { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }
                      : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    size={18}
                    tintColor={isError ? '#F43F5E' : '#10B981'}
                  />
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[
                      styles.messageText,
                      { color: isError ? '#F43F5E' : '#10B981' },
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  submitting && styles.disabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {isRegistration ? 'Fiók létrehozása' : 'Bejelentkezés'}
                    </Text>
                    <SymbolView
                      name={{
                        ios: 'arrow.right',
                        android: 'arrow_forward',
                        web: 'arrow_forward',
                      }}
                      size={18}
                      tintColor="#FFFFFF"
                    />
                  </>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={[styles.switchText, { color: palette.textMuted }]}>
                  {isRegistration ? 'Már van fiókod?' : 'Még nincs fiókod?'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={switchMode}
                  hitSlop={8}
                >
                  <Text style={[styles.secondaryButtonText, { color: palette.primaryLight }]}>
                    {isRegistration ? 'Bejelentkezés' : 'Regisztráció'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.footer, { color: palette.textMuted }]}>
              Egy hely, ahol a család mindig közel van. ❤️
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  logoShadow: {
    borderRadius: 24,
    ...shadows.floating,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderRadius: 26,
    ...shadows.card,
  },
  cardHeading: {
    gap: 6,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 15,
    fontSize: 15,
  },
  passwordField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    fontSize: 15,
  },
  visibilityButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderRadius: 13,
  },
  pressedIcon: {
    opacity: 0.6,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 13,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  switchText: {
    fontSize: 13,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
