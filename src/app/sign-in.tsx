import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [isRegistration, setIsRegistration] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit() {
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

    setSubmitting(true);
    if (isRegistration) {
      const result = await signUp(displayName, email, password);
      setSubmitting(false);
      if (result.error) {
        setMessage(result.error);
        setIsError(true);
      } else if (result.needsEmailConfirmation) {
        setMessage('Elküldtük a megerősítő levelet. Belépés előtt erősítsd meg az e-mail-címedet.');
      }
      return;
    }

    const error = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setMessage(error);
      setIsError(true);
    }
  }

  function switchMode() {
    setIsRegistration((current) => !current);
    setMessage(null);
    setIsError(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>⌂</Text></View>
            <Text style={styles.title}>CsaládTér</Text>
            <Text style={styles.subtitle}>
              {isRegistration ? 'Hozd létre a saját családi teredet.' : 'Jelentkezz be a családi teredhez.'}
            </Text>
          </View>

          <View style={styles.card}>
            {isRegistration ? (
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={setDisplayName}
                placeholder="Megjelenítendő név"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={displayName}
              />
            ) : null}
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="E-mail-cím"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
              placeholder="Jelszó"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />

            {message ? (
              <Text accessibilityLiveRegion="polite" style={isError ? styles.error : styles.success}>{message}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.primaryButtonText}>{isRegistration ? 'Regisztráció' : 'Bejelentkezés'}</Text>
              )}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={switchMode} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {isRegistration ? 'Már van fiókom' : 'Új fiók létrehozása'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: { width: 58, height: 58, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  logoText: { color: colors.textPrimary, fontSize: 32, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  card: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl },
  input: { minHeight: 52, paddingHorizontal: spacing.lg, color: colors.textPrimary, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.primaryLight, fontSize: 14, fontWeight: '700' },
  error: { color: '#FDA4AF', fontSize: 12 },
  success: { color: '#6EE7B7', fontSize: 12 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
});
