
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useSecurity } from '@/providers/security-provider';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Palette = typeof colors | typeof darkColors;

function SettingRow({
  icon,
  title,
  description,
  right,
  onPress,
  palette,
  largeText,
  last = false,
}: {
  icon: IconName;
  title: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  palette: Palette;
  largeText: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress && !right}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={21} color={palette.primary} />
      </View>

      <View style={styles.rowContent}>
        <Text style={[
          styles.rowTitle,
          { color: palette.textPrimary, fontSize: largeText ? 16 : 14 },
        ]}>
          {title}
        </Text>
        {!!description && (
          <Text style={[
            styles.rowDescription,
            { color: palette.textMuted, fontSize: largeText ? 13 : 12 },
          ]}>
            {description}
          </Text>
        )}
      </View>

      {right ?? (
        <Ionicons name="chevron-forward" size={19} color={palette.textMuted} />
      )}
    </Pressable>
  );
}

function Section({
  title,
  icon,
  children,
  palette,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name={icon} size={15} color={palette.primary} />
        </View>
        <Text style={[styles.section, { color: palette.textMuted }]}>
          {title}
        </Text>
      </View>
      <View style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}>
        {children}
      </View>
    </View>
  );
}

function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  palette,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  palette: Palette;
  isDark: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[
        styles.modalOverlay,
        { backgroundColor: isDark ? 'rgba(2,8,23,0.82)' : 'rgba(15,23,42,0.42)' },
      ]}>
        <View style={[
          styles.modal,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}>
          <View style={styles.modalHandle} />

          <View style={[styles.modalIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="shield-checkmark-outline" size={27} color={palette.primary} />
          </View>

          <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
            {title}
          </Text>

          {subtitle ? (
            <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}

          {children}
        </View>
      </View>
    </Modal>
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
  const [pinBusy, setPinBusy] = React.useState(false);
  const [signOutBusy, setSignOutBusy] = React.useState(false);

  const clearMfaSetup = React.useCallback(() => {
    setMfaVisible(false);
    setMfaCode('');
    setMfaSecret('');
    setMfaUri('');
    setMfaFactorId(null);
  }, []);

  React.useEffect(() => {
    let active = true;

    supabase.auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (active && !error) {
          setMfaEnabled(
            data?.totp?.some(factor => factor.status === 'verified') ?? false,
          );
        }
      })
      .catch(() => {
        if (active) setMfaEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function openMfaSetup(enabled: boolean) {
    if (mfaBusy) return;

    setMfaBusy(true);

    try {
      if (!enabled) {
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
        return;
      }

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
        enabled ? 'MFA beállítása sikertelen' : 'MFA kikapcsolása sikertelen',
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
      const challenge = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challenge.error) throw challenge.error;

      const verified = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verified.error) throw verified.error;

      setMfaEnabled(true);
      clearMfaSetup();

      Alert.alert('Sikeres aktiválás', 'A kétlépcsős azonosítás bekapcsolva.');
    } catch (caught) {
      Alert.alert(
        'MFA ellenőrzése sikertelen',
        caught instanceof Error ? caught.message : 'A kód nem helyes vagy lejárt.',
      );
    } finally {
      setMfaBusy(false);
    }
  }

  function cancelMfaSetup() {
    const factorId = mfaFactorId;
    clearMfaSetup();

    // A még nem hitelesített faktort ne hagyjuk függőben.
    if (factorId) {
      void supabase.auth.mfa.unenroll({ factorId }).catch(() => undefined);
    }
  }

  async function savePin() {
    if (pin.length < 4 || pin.length > 8) {
      Alert.alert('Hibás PIN', 'A PIN-kód 4–8 számjegyből álljon.');
      return;
    }

    if (pinBusy) return;
    setPinBusy(true);

    try {
      await setPinCode(pin);
      await setSecurityEnabled(true);

      setPinVisible(false);
      setPinValue('');
    } catch (caught) {
      Alert.alert(
        'Hibás PIN',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    } finally {
      setPinBusy(false);
    }
  }

  async function signOutOthers() {
    setSignOutBusy(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;

      Alert.alert('Sikeres művelet', 'A többi eszköz munkamenete megszűnt.');
    } catch (caught) {
      Alert.alert(
        'Sikertelen művelet',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    } finally {
      setSignOutBusy(false);
    }
  }

  function signOutAll() {
    Alert.alert(
      'Minden eszköz kiléptetése',
      'Az összes munkamenet megszűnik, és újra be kell jelentkezned.',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Kiléptetés',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut({ scope: 'global' });

            if (error) {
              Alert.alert('Sikertelen művelet', error.message);
            } else {
              router.replace('/sign-in?mode=login');
            }
          },
        },
      ],
    );
  }

  const toggleSecurity = (enabled: boolean) => {
    if (enabled) {
      setPinVisible(true);
    } else {
      Alert.alert(
        'Képernyőzár kikapcsolása',
        'Biztosan ki szeretnéd kapcsolni az automatikus képernyőzárat?',
        [
          { text: 'Mégse', style: 'cancel' },
          {
            text: 'Kikapcsolás',
            style: 'destructive',
            onPress: () => {
              void setSecurityEnabled(false).catch(caught => {
                Alert.alert(
                  'Hiba',
                  caught instanceof Error ? caught.message : 'Próbáld újra.',
                );
              });
            },
          },
        ],
      );
    }
  };

  const switchProps = {
    trackColor: {
      false: palette.border,
      true: palette.primaryLight,
    },
    thumbColor: isDark ? '#FFFFFF' : '#FFFFFF',
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ScreenCloseButton />
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Beállítások
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
            FamilyHub személyre szabása
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="settings-outline" size={21} color={palette.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.welcomeCard, { backgroundColor: palette.primary }]}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeEyebrow}>FAMILYHUB</Text>
            <Text style={styles.welcomeTitle}>Minden a helyén.</Text>
            <Text style={styles.welcomeDescription}>
              Személyre szabhatod az alkalmazás működését és biztonságát.
            </Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Ionicons name="options-outline" size={35} color="#FFFFFF" />
          </View>
          <View style={styles.welcomeDecoration} />
        </View>

        <Section title="Megjelenés" icon="color-palette-outline" palette={palette}>
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="moon-outline"
            title="Sötét mód"
            description={isDark ? 'Sötét megjelenés aktív' : 'Világos megjelenés aktív'}
            right={
              <Switch
                {...switchProps}
                value={isDark}
                onValueChange={setDarkMode}
              />
            }
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="text-outline"
            title="Nagyobb betűméret"
            description="Könnyebben olvasható szövegek"
            right={
              <Switch
                {...switchProps}
                value={largeText}
                onValueChange={setLargeText}
              />
            }
            last
          />
        </Section>

        <Section title="Biztonság" icon="shield-checkmark-outline" palette={palette}>
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="lock-closed-outline"
            title="Automatikus képernyőzár"
            description={securityEnabled ? 'PIN-védelem bekapcsolva' : 'Védelem háttérbe váltáskor'}
            right={
              <Switch
                {...switchProps}
                value={securityEnabled}
                onValueChange={toggleSecurity}
              />
            }
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="finger-print-outline"
            title="Biometrikus feloldás"
            description={biometricEnabled ? 'Biometrikus védelem aktív' : 'Arcfelismerés vagy ujjlenyomat'}
            right={
              <Switch
                {...switchProps}
                value={biometricEnabled}
                onValueChange={enabled => {
                  void setBiometricEnabled(enabled).catch(caught => {
                    Alert.alert(
                      'Biometria nem elérhető',
                      caught instanceof Error ? caught.message : 'Ez az eszköz nem támogatja.',
                    );
                  });
                }}
              />
            }
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="shield-outline"
            title="Kétlépcsős azonosítás"
            description={mfaBusy ? 'Feldolgozás folyamatban…' : mfaEnabled ? 'Fiók extra védelemmel ellátva' : 'További védelem a fiókodnak'}
            right={
              <Switch
                {...switchProps}
                disabled={mfaBusy}
                value={mfaEnabled}
                onValueChange={enabled => void openMfaSetup(enabled)}
              />
            }
            last
          />
        </Section>

        <Section title="Fiók és adatvédelem" icon="person-circle-outline" palette={palette}>
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="phone-portrait-outline"
            title="Megbízható eszközök"
            description="Bejelentkezett eszközök kezelése"
            onPress={() => setDevicesVisible(true)}
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="lock-closed-outline"
            title="Adatvédelem"
            description="Adatkezelési tájékoztató"
            onPress={() => router.push('/privacy')}
            last
          />
        </Section>

        <Section title="Alkalmazás" icon="apps-outline" palette={palette}>
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
            title={isOnline ? 'Online kapcsolat' : 'Offline mód'}
            description={isOnline ? 'Az adatok szinkronizálhatók' : 'Helyi gyorsítótár használata'}
            right={
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? colors.success : colors.warning },
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: isOnline ? colors.success : colors.warning },
                ]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            }
            onPress={() => Alert.alert(
              isOnline ? 'Online kapcsolat' : 'Offline mód',
              isOnline
                ? 'Az internetkapcsolat elérhető, a FamilyHub adatai szinkronizálhatók.'
                : 'Nincs elérhető internetkapcsolat. A korábban betöltött adatok továbbra is elérhetők lehetnek.',
            )}
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="notifications-outline"
            title="Értesítések"
            description="Értesítési beállítások"
            onPress={() => router.push('/notifications')}
          />
          <SettingRow
            palette={palette}
            largeText={largeText}
            icon="language-outline"
            title="Nyelv"
            description="Magyar"
            onPress={() => setLanguageVisible(true)}
            last
          />
        </Section>

        <View style={styles.footer}>
          <View style={[styles.footerLogo, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="heart" size={15} color={palette.primary} />
          </View>
          <Text style={[styles.footerName, { color: palette.textPrimary }]}>
            FamilyHub
          </Text>
          <Text style={[styles.versionText, { color: palette.textMuted }]}>
            Verzió 1.0.0 · Minden család egy helyen
          </Text>
        </View>
      </ScrollView>

      {/* MFA MODAL */}
      <AppModal
        visible={mfaVisible}
        onClose={cancelMfaSetup}
        title="Kétlépcsős azonosítás"
        subtitle="Add hozzá a FamilyHub fiókodat egy hitelesítő alkalmazáshoz."
        palette={palette}
        isDark={isDark}
      >
        {mfaSecret ? (
          <View style={[styles.secretBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <Text style={[styles.secretLabel, { color: palette.textMuted }]}>
              Kézi beállítási kulcs
            </Text>
            <Text selectable style={[styles.secretText, { color: palette.textPrimary }]}>
              {mfaSecret}
            </Text>
          </View>
        ) : null}

        {mfaUri ? (
          <Text selectable style={[styles.uriText, { color: palette.textMuted }]}>
            {mfaUri}
          </Text>
        ) : null}

        <TextInput
          value={mfaCode}
          onChangeText={value => setMfaCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          style={[
            styles.pinInput,
            {
              backgroundColor: palette.background,
              color: palette.textPrimary,
              borderColor: palette.border,
            },
          ]}
        />

        <View style={styles.modalActions}>
          <Pressable onPress={cancelMfaSetup} style={styles.cancelButton}>
            <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
              Mégse
            </Text>
          </Pressable>
          <Pressable
            disabled={mfaBusy}
            onPress={() => void verifyMfaCode()}
            style={[styles.primaryButton, { backgroundColor: palette.primary, opacity: mfaBusy ? 0.6 : 1 }]}
          >
            <Text style={styles.primaryButtonText}>
              {mfaBusy ? 'Ellenőrzés…' : 'Aktiválás'}
            </Text>
          </Pressable>
        </View>
      </AppModal>

      {/* PIN MODAL */}
      <AppModal
        visible={pinVisible}
        onClose={() => {
          setPinVisible(false);
          setPinValue('');
        }}
        title="Automatikus képernyőzár"
        subtitle="Állíts be egy biztonságos, 4–8 számjegyű PIN-kódot."
        palette={palette}
        isDark={isDark}
      >
        <TextInput
          value={pin}
          onChangeText={value => setPinValue(value.replace(/\D/g, '').slice(0, 8))}
          placeholder="••••••"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          style={[
            styles.pinInput,
            {
              backgroundColor: palette.background,
              color: palette.textPrimary,
              borderColor: palette.border,
            },
          ]}
        />

        <View style={styles.modalActions}>
          <Pressable
            onPress={() => {
              setPinVisible(false);
              setPinValue('');
            }}
            style={styles.cancelButton}
          >
            <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
              Mégse
            </Text>
          </Pressable>

          <Pressable
            disabled={pinBusy}
            onPress={() => void savePin()}
            style={[
              styles.primaryButton,
              { backgroundColor: palette.primary, opacity: pinBusy ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {pinBusy ? 'Mentés…' : 'Bekapcsolás'}
            </Text>
          </Pressable>
        </View>
      </AppModal>

      {/* DEVICES MODAL */}
      <AppModal
        visible={devicesVisible}
        onClose={() => setDevicesVisible(false)}
        title="Megbízható eszközök"
        subtitle="A fiókodhoz kapcsolódó munkamenetek kezelése."
        palette={palette}
        isDark={isDark}
      >
        <View style={[
          styles.deviceRow,
          { backgroundColor: palette.background, borderColor: palette.border },
        ]}>
          <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={palette.primary} />
          </View>

          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
              Aktuális eszköz
            </Text>
            <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
              {Platform.OS === 'ios' ? 'iPhone / iPad' : Platform.OS === 'android' ? 'Android eszköz' : 'Web'}
            </Text>
          </View>

          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>

        {session?.expires_at ? (
          <Text style={[styles.sessionInfo, { color: palette.textMuted }]}>
            Munkamenet lejárata:{'\n'}
            {new Date(session.expires_at * 1000).toLocaleString('hu-HU')}
          </Text>
        ) : null}

        <Pressable
          disabled={signOutBusy}
          onPress={() => void signOutOthers()}
          style={[styles.secondaryButton, { borderColor: palette.border, opacity: signOutBusy ? 0.6 : 1 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={palette.primary} />
          <Text style={[styles.secondaryButtonText, { color: palette.primary }]}>
            {signOutBusy ? 'Feldolgozás…' : 'Többi eszköz kiléptetése'}
          </Text>
        </Pressable>

        <Pressable
          onPress={signOutAll}
          style={[styles.dangerButton, { backgroundColor: palette.danger }]}
        >
          <Ionicons name="power-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            Minden eszköz kiléptetése
          </Text>
        </Pressable>

        <Pressable onPress={() => setDevicesVisible(false)} style={styles.cancelButton}>
          <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
            Bezárás
          </Text>
        </Pressable>
      </AppModal>

      {/* LANGUAGE MODAL */}
      <AppModal
        visible={languageVisible}
        onClose={() => setLanguageVisible(false)}
        title="Nyelv"
        subtitle="Válaszd ki az alkalmazás nyelvét."
        palette={palette}
        isDark={isDark}
      >
        <View style={[
          styles.deviceRow,
          { backgroundColor: palette.background, borderColor: palette.primary },
        ]}>
          <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="language-outline" size={22} color={palette.primary} />
          </View>

          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
              Magyar
            </Text>
            <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
              Aktív nyelv
            </Text>
          </View>

          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>

        <Text style={[styles.sessionInfo, { color: palette.textMuted }]}>
          Jelenleg a FamilyHub csak magyar nyelven érhető el.
        </Text>

        <Pressable
          onPress={() => setLanguageVisible(false)}
          style={[styles.primaryButton, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.primaryButtonText}>Bezárás</Text>
        </Pressable>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },

  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 42,
    gap: 22,
  },

  welcomeCard: {
    minHeight: 150,
    padding: 21,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },

  welcomeContent: {
    flex: 1,
    zIndex: 2,
  },

  welcomeEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 9,
  },

  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  welcomeDescription: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 235,
  },

  welcomeIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    zIndex: 2,
  },

  welcomeDecoration: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 78,
    right: -52,
    top: -75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  sectionContainer: {
    gap: 11,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 3,
  },

  sectionIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  card: {
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
  },

  row: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowContent: {
    flex: 1,
    gap: 4,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  rowDescription: {
    fontSize: 11,
    lineHeight: 16,
  },

  pressed: {
    opacity: 0.65,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(66,199,170,0.09)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 10,
    gap: 6,
  },

  footerLogo: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },

  footerName: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  versionText: {
    fontSize: 10,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modal: {
    width: '100%',
    maxWidth: 390,
    padding: 23,
    borderRadius: 27,
    borderWidth: 1,
    gap: 16,
    ...shadows.card,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    alignSelf: 'center',
    opacity: 0.4,
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  modalSubtitle: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  pinInput: {
    minHeight: 57,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 16,
    textAlign: 'center',
    letterSpacing: 9,
    fontSize: 22,
    fontWeight: '800',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },

  cancelButton: {
    minHeight: 45,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    minHeight: 49,
    paddingHorizontal: 21,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  secretBox: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    gap: 8,
  },

  secretLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  secretText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },

  uriText: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  deviceRow: {
    minHeight: 72,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 17,
  },

  sessionInfo: {
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'center',
  },

  secondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },

  dangerButton: {
    minHeight: 49,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
});
