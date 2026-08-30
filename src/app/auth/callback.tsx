import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type CallbackState = 'processing' | 'confirmed' | 'error';

function getCallbackParams(url: string) {
  const queryPart = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(queryPart);

  new URLSearchParams(hashPart).forEach((value, key) => {
    params.set(key, value);
  });

  return params;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const [state, setState] = useState<CallbackState>('processing');
  const [message, setMessage] = useState('Az e-mail-cím megerősítése folyamatban…');

  useEffect(() => {
    let active = true;

    async function completeConfirmation() {
      const params = getCallbackParams(incomingUrl ?? '');
      const errorDescription = params.get('error_description');

      if (errorDescription) {
        if (!active) return;
        setState('error');
        setMessage(errorDescription.replace(/\+/g, ' '));
        return;
      }

      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // A Supabase egyes megerősítési folyamatai a tokent már a
      // kiszolgálón feldolgozzák, és paraméterek nélkül irányítanak vissza.
      if (!code && !(accessToken && refreshToken)) {
        await supabase.auth.signOut({ scope: 'local' });
        if (!active) return;
        setState('confirmed');
        setMessage('Az e-mail-címed megerősítése sikerült. Átirányítunk a bejelentkezéshez…');
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          setState('error');
          setMessage(error.message);
          return;
        }
        await supabase.auth.signOut({ scope: 'local' });
        if (!active) return;
        setState('confirmed');
        setMessage('Az e-mail-címed megerősítése sikerült. Átirányítunk a bejelentkezéshez…');
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (error) {
          setState('error');
          setMessage(error.message);
          return;
        }
        await supabase.auth.signOut({ scope: 'local' });
        if (!active) return;
        setState('confirmed');
        setMessage('Az e-mail-címed megerősítése sikerült. Átirányítunk a bejelentkezéshez…');
        return;
      }

    }

    void completeConfirmation();

    return () => {
      active = false;
    };
  }, [incomingUrl, router]);

  useEffect(() => {
    if (state !== 'confirmed') return;

    const timeout = setTimeout(() => {
      router.replace({ pathname: '/sign-in', params: { mode: 'login' } });
    }, 1800);

    return () => clearTimeout(timeout);
  }, [router, state]);

  async function goToSignIn() {
    await supabase.auth.signOut({ scope: 'local' });
    router.replace({ pathname: '/sign-in', params: { mode: 'login' } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={[styles.iconHalo, state === 'error' && styles.iconHaloError]}>
          {state === 'processing' ? (
            <ActivityIndicator color={colors.primaryLight} size="large" />
          ) : (
            <Text style={[styles.icon, state === 'error' && styles.iconError]}>
              {state === 'confirmed' ? '✓' : '!'}
            </Text>
          )}
        </View>

        <Text style={styles.title}>
          {state === 'processing'
            ? 'Megerősítés folyamatban'
            : state === 'confirmed'
              ? 'E-mail megerősítve'
              : 'A megerősítés sikertelen'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {state !== 'processing' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void goToSignIn()}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Tovább a bejelentkezéshez</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  iconHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102855',
    borderWidth: 1,
    borderColor: '#2859A3',
  },
  iconHaloError: { backgroundColor: '#3B1622', borderColor: '#7F2439' },
  icon: { color: colors.success, fontSize: 42, fontWeight: '900' },
  iconError: { color: '#FDA4AF' },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  message: {
    maxWidth: 340,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.75 },
});
