import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { useSecurity } from '@/providers/security-provider';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SettingRow({
  icon,
  title,
  description,
  right,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { isDark, largeText } = useTheme();
  const palette = isDark ? darkColors : colors;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={21} color={palette.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            { color: palette.textPrimary, fontSize: largeText ? 15 : 13 },
          ]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[
              styles.rowDescription,
              { color: palette.textMuted, fontSize: largeText ? 13 : 11 },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, setDarkMode, largeText, setLargeText } = useTheme();
  const { session } = useAuth();
  const palette = isDark ? darkColors : colors;
  const {
    securityEnabled,
    biometricEnabled,
    isOnline,
    setSecurityEnabled,
    setBiometricEnabled,
    setPin: setPinCode,
  } = useSecurity();
  const [pinVisible, setPinVisible] = React.useState(false);
  const [pin, setPinValue] = React.useState('');
  const [devicesVisible, setDevicesVisible] = React.useState(false);
  const [languageVisible, setLanguageVisible] = React.useState(false);
  const [mfaVisible, setMfaVisible] = React.useState(false);
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaFactorId, setMfaFactorId] = React.useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = React.useState('');
  const [mfaUri, setMfaUri] = React.useState('');
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [mfaBusy, setMfaBusy] = React.useState(false);

  React.useEffect(() => {
    void supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        setMfaEnabled((data?.totp?.some((factor) => factor.status === 'verified') ?? false));
      })
      .catch(() => setMfaEnabled(false));
  }, []);

  async function openMfaSetup(enabled: boolean) {
    if (!enabled) {
      setMfaBusy(true);
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        for (const factor of data.totp ?? []) {
          if (factor.status === 'verified') {
            const { error: unenrollError } =
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
            if (unenrollError) throw unenrollError;
          }
        }
        setMfaEnabled(false);
      } catch (caught) {
        Alert.alert(
          'MFA kikapcsolása sikertelen',
          caught instanceof Error ? caught.message : 'Próbáld újra.',
        );
      } finally {
        setMfaBusy(false);
      }
      return;
    }

    setMfaBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `FamilyHub · ${Platform.OS}`,
      });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaSecret(data.totp.secret);
      setMfaUri(data.totp.uri);
      setMfaCode('');
      setMfaVisible(true);
    } catch (caught) {
      Alert.alert(
        'MFA beállítása sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifyMfaCode() {
    if (!mfaFactorId || !/^\d{6}$/.test(mfaCode)) {
      Alert.alert('Hibás kód', 'Adj meg egy 6 számjegyű hitelesítő kódot.');
      return;
    }
    setMfaBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });
      if (verified.error) throw verified.error;
      setMfaEnabled(true);
      setMfaVisible(false);
      setMfaCode('');
      setMfaSecret('');
      setMfaUri('');
      setMfaFactorId(null);
    } catch (caught) {
      Alert.alert(
        'MFA ellenőrzése sikertelen',
        caught instanceof Error ? caught.message : 'A kód nem helyes vagy lejárt.',
      );
    } finally {
      setMfaBusy(false);
    }
  }
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Beállítások</Text>
        <Ionicons name="settings-outline" size={22} color={palette.primary} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: palette.textMuted }]}>Megjelenés</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon="lock-closed-outline"
            title="Automatikus képernyőzár"
            description={securityEnabled ? 'Bekapcsolva' : 'Lezárás háttérbe váltáskor'}
            right={
              <Switch
                value={securityEnabled}
                onValueChange={(enabled) => {
                  if (enabled) setPinVisible(true);
                  else void setSecurityEnabled(false).catch(() => undefined);
                }}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
          <SettingRow
            icon="finger-print-outline"
            title="Biometrikus feloldás"
            description={biometricEnabled ? 'Bekapcsolva' : 'Arcfelismerés vagy ujjlenyomat'}
            right={
              <Switch
                value={biometricEnabled}
                onValueChange={(enabled) =>
                  void setBiometricEnabled(enabled).catch((caught) =>
                    Alert.alert(
                      'Biometria nem elérhető',
                      caught instanceof Error ? caught.message : 'Ez az eszköz nem támogatja.',
                    ),
                  )
                }
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
          <SettingRow
            icon="moon-outline"
            title="Sötét mód"
            description="Sötét színséma használata"
            right={
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
          <SettingRow
            icon="accessibility-outline"
            title="Akadálymentesség"
            description="Nagyobb szöveg és kontraszt"
            right={
              <Switch
                value={largeText}
                onValueChange={setLargeText}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
              />
            }
          />
        </View>
        <Text style={[styles.section, { color: palette.textMuted }]}>Biztonság</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon="shield-checkmark-outline"
            title="Kétlépcsős azonosítás"
            description={mfaEnabled ? 'Bekapcsolva' : 'Nincs bekapcsolva'}
            right={
              <Switch
                disabled={mfaBusy}
                value={mfaEnabled}
                onValueChange={(enabled) => void openMfaSetup(enabled)}
                trackColor={{ false: palette.border, true: '#42C7AA' }}
                thumbColor={mfaEnabled ? colors.success : undefined}
              />
            }
          />
          <SettingRow
            icon="phone-portrait-outline"
            title="Megbízható eszközök"
            description="Az aktuális eszköz munkamenete"
            onPress={() => setDevicesVisible(true)}
          />
          <SettingRow
            icon="lock-closed-outline"
            title="Adatvédelem"
            description="Adatkezelési tájékoztató"
            onPress={() => router.push('/privacy')}
          />
        </View>
        <Text style={[styles.section, { color: palette.textMuted }]}>Alkalmazás</Text>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <SettingRow
            icon={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
            title={isOnline ? 'Online kapcsolat' : 'Offline mód'}
            description={isOnline ? 'Az adatok szinkronizálhatók' : 'A helyi gyorsítótár használható'}
            onPress={() =>
              Alert.alert(
                isOnline ? 'Online kapcsolat' : 'Offline mód',
                isOnline
                  ? 'Az internetkapcsolat elérhető, a FamilyHub adatai szinkronizálhatók.'
                  : 'Nincs elérhető internetkapcsolat. A korábban betöltött adatok továbbra is elérhetők lehetnek.',
              )
            }
            right={
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isOnline ? colors.success : colors.warning,
                }}
              />
            }
          />
          <SettingRow
            icon="notifications-outline"
            title="Értesítések"
            description="Értesítési beállítások"
            onPress={() => router.push('/notifications')}
          />
          <SettingRow
            icon="language-outline"
            title="Nyelv"
            description="Magyar"
            onPress={() => setLanguageVisible(true)}
          />
        </View>
        <View style={styles.version}>
          <Text style={[styles.versionText, { color: palette.textMuted }]}>FamilyHub · 1.0.0</Text>
        </View>
      </ScrollView>
      <Modal
        visible={mfaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMfaVisible(false)}
      >
        <View style={[styles.pinOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.pinModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.pinTitle, { color: palette.textPrimary }]}>Kétlépcsős azonosítás</Text>
            <Text style={[styles.pinDescription, { color: palette.textSecondary }]}>
              Add hozzá a családi fiókot egy hitelesítő alkalmazáshoz a kézi kulccsal.
            </Text>
            {mfaSecret ? (
              <View style={[styles.secretBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                <Text style={[styles.secretLabel, { color: palette.textMuted }]}>Kézi kulcs</Text>
                <Text selectable style={[styles.secretText, { color: palette.textPrimary }]}>{mfaSecret}</Text>
              </View>
            ) : null}
            {mfaUri ? (
              <Text numberOfLines={2} selectable style={[styles.uriText, { color: palette.textMuted }]}>{mfaUri}</Text>
            ) : null}
            <TextInput
              value={mfaCode}
              onChangeText={(value) => setMfaCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 számjegyű kód"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              style={[styles.pinInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
            />
            <View style={styles.pinActions}>
              <Pressable onPress={() => setMfaVisible(false)} style={styles.pinCancel}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
              </Pressable>
              <Pressable disabled={mfaBusy} onPress={() => void verifyMfaCode()} style={[styles.pinSave, { backgroundColor: palette.primary }]}>
                <Text style={styles.pinSaveText}>{mfaBusy ? 'Ellenőrzés…' : 'Bekapcsolás'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={devicesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDevicesVisible(false)}
      >
        <View style={[styles.pinOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.pinModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.pinTitle, { color: palette.textPrimary }]}>Megbízható eszközök</Text>
            <View style={[styles.deviceRow, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
                <Ionicons name={Platform.OS === 'ios' ? 'phone-portrait-outline' : 'phone-portrait-outline'} size={21} color={palette.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Aktuális eszköz</Text>
                <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
                  {Platform.OS === 'ios' ? 'iPhone / iPad' : Platform.OS === 'android' ? 'Android eszköz' : 'Web'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            {session?.expires_at ? (
              <Text style={[styles.pinDescription, { color: palette.textMuted }]}>
                Munkamenet lejárata: {new Date(session.expires_at * 1000).toLocaleString('hu-HU')}
              </Text>
            ) : null}
            <View style={styles.pinActions}>
              <Pressable
                onPress={async () => {
                  const { error } = await supabase.auth.signOut({ scope: 'others' });
                  if (error) Alert.alert('Sikertelen művelet', error.message);
                  else Alert.alert('Kész', 'A többi eszköz munkamenete megszűnt.');
                }}
                style={[styles.pinSave, { backgroundColor: palette.primary }]}
              >
                <Text style={styles.pinSaveText}>Többi eszköz kiléptetése</Text>
              </Pressable>
            </View>
            <View style={styles.pinActions}>
              <Pressable onPress={() => setDevicesVisible(false)} style={styles.pinCancel}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Bezárás</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Minden eszköz kiléptetése',
                    'Az összes munkamenet megszűnik, és újra be kell jelentkezned.',
                    [
                      { text: 'Mégse', style: 'cancel' },
                      {
                        text: 'Kiléptetés',
                        style: 'destructive',
                        onPress: () => void supabase.auth.signOut({ scope: 'global' }).then(({ error }) => {
                          if (error) Alert.alert('Sikertelen művelet', error.message);
                          else router.replace('/sign-in?mode=login');
                        }),
                      },
                    ],
                  );
                }}
                style={[styles.pinSave, { backgroundColor: palette.danger }]}
              >
                <Text style={styles.pinSaveText}>Minden eszköz</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={languageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageVisible(false)}
      >
        <View style={[styles.pinOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.pinModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.pinTitle, { color: palette.textPrimary }]}>Nyelv</Text>
            <View style={[styles.deviceRow, { backgroundColor: palette.background, borderColor: palette.primary }]}>
              <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
                <Ionicons name="language-outline" size={21} color={palette.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Magyar</Text>
                <Text style={[styles.rowDescription, { color: palette.textMuted }]}>Aktív nyelv</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            <Text style={[styles.pinDescription, { color: palette.textMuted }]}>
              Jelenleg a FamilyHub csak magyar nyelven érhető el.
            </Text>
            <Pressable onPress={() => setLanguageVisible(false)} style={[styles.pinSave, { backgroundColor: palette.primary }]}>
              <Text style={styles.pinSaveText}>Bezárás</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={pinVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinVisible(false)}
      >
        <View style={[styles.pinOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.pinModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.pinTitle, { color: palette.textPrimary }]}>Automatikus képernyőzár</Text>
            <Text style={[styles.pinDescription, { color: palette.textSecondary }]}>
              Állíts be 4–8 számjegyből álló PIN-kódot.
            </Text>
            <TextInput
              value={pin}
              onChangeText={(value) => setPinValue(value.replace(/\D/g, '').slice(0, 8))}
              placeholder="PIN"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              style={[styles.pinInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
            />
            <View style={styles.pinActions}>
              <Pressable onPress={() => { setPinVisible(false); setPinValue(''); }} style={styles.pinCancel}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    await setPinCode(pin);
                    await setSecurityEnabled(true);
                    setPinVisible(false);
                    setPinValue('');
                  } catch (caught) {
                    Alert.alert(
                      'Hibás PIN',
                      caught instanceof Error ? caught.message : 'A PIN 4–8 számjegyből álljon.',
                    );
                  }
                }}
                style={[styles.pinSave, { backgroundColor: palette.primary }]}
              >
                <Text style={styles.pinSaveText}>Bekapcsolás</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
  section: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.card },
  row: {
    minHeight: 70,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  rowDescription: { color: colors.textMuted, fontSize: 11 },
  version: { alignItems: 'center', padding: spacing.lg },
  versionText: { color: colors.textMuted, fontSize: 11 },
  pressed: { opacity: 0.72 },
  pinOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  pinModal: { width: '100%', maxWidth: 380, padding: spacing.xl, borderWidth: 1, borderRadius: radius.xl, gap: spacing.md },
  pinTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  pinDescription: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pinInput: { minHeight: 52, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg, textAlign: 'center', letterSpacing: 8, fontSize: 18 },
  pinActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  pinCancel: { padding: spacing.md },
  pinSave: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  pinSaveText: { color: colors.white, fontWeight: '900' },
  secretBox: { padding: spacing.md, borderWidth: 1, borderRadius: radius.md, gap: spacing.xs },
  secretLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  secretText: { fontSize: 15, lineHeight: 22, letterSpacing: 1, fontWeight: '900', textAlign: 'center' },
  uriText: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
  deviceRow: { minHeight: 64, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
});
