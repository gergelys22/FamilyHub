import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';

const SECURITY_ENABLED_KEY = 'familyhub-security-enabled';
const BIOMETRIC_ENABLED_KEY = 'familyhub-biometric-enabled';
const PIN_KEY = 'familyhub-security-pin';
const OFFLINE_CACHE_PREFIX = '@familyhub/offline-cache/';
const PENDING_QUEUE_KEY = '@familyhub/pending-sync';

type SecurityContextValue = {
  isLocked: boolean;
  securityEnabled: boolean;
  biometricEnabled: boolean;
  isOnline: boolean;
  setSecurityEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlock: () => Promise<boolean>;
  cacheOfflineData: (key: string, value: unknown) => Promise<void>;
  readOfflineData: (key: string) => Promise<unknown | null>;
  enqueuePendingSync: (operation: string, payload: unknown) => Promise<void>;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({ children }: PropsWithChildren) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [securityEnabled, setSecurityEnabledState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [lockError, setLockError] = useState('');

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(SECURITY_ENABLED_KEY),
      AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY),
    ]).then(([security, biometric]) => {
      setSecurityEnabledState(security === 'true');
      setBiometricEnabledState(biometric === 'true');
      if (security === 'true') setIsLocked(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    void NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!securityEnabled) {
      setIsLocked(false);
      return;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        setIsLocked(true);
        setPinEntry('');
        setLockError('');
      }
    });
    return () => subscription.remove();
  }, [securityEnabled]);

  async function setSecurityEnabled(enabled: boolean) {
    setSecurityEnabledState(enabled);
    await AsyncStorage.setItem(SECURITY_ENABLED_KEY, String(enabled));
    if (!enabled) setIsLocked(false);
  }

  async function setBiometricEnabled(enabled: boolean) {
    if (enabled) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        throw new Error('Ezen az eszközön nincs beállított biometrikus feloldás.');
      }
    }
    setBiometricEnabledState(enabled);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
  }

  async function setPin(pin: string) {
    if (!/^\d{4,8}$/.test(pin)) {
      throw new Error('A PIN legyen 4–8 számjegy.');
    }
    await SecureStore.setItemAsync(PIN_KEY, pin);
  }

  async function unlock() {
    if (!securityEnabled) {
      setIsLocked(false);
      return true;
    }
    if (biometricEnabled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Feloldás a FamilyHubban',
        cancelLabel: 'PIN használata',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
        setLockError('');
        return true;
      }
    }
    return false;
  }

  async function unlockWithPin() {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (!stored) {
      setLockError('Még nincs beállítva PIN.');
      return;
    }
    if (pinEntry === stored) {
      setPinEntry('');
      setLockError('');
      setIsLocked(false);
      return;
    }
    setLockError('Hibás PIN.');
  }

  async function cacheOfflineData(key: string, value: unknown) {
    await AsyncStorage.setItem(
      OFFLINE_CACHE_PREFIX + key,
      JSON.stringify({ value, cachedAt: new Date().toISOString() }),
    );
  }

  async function readOfflineData(key: string) {
    const stored = await AsyncStorage.getItem(OFFLINE_CACHE_PREFIX + key);
    if (!stored) return null;
    try {
      return (JSON.parse(stored) as { value: unknown }).value;
    } catch {
      return null;
    }
  }

  async function enqueuePendingSync(operation: string, payload: unknown) {
    const stored = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
    const queue = stored ? (JSON.parse(stored) as unknown[]) : [];
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      operation,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
  }

  const value = useMemo<SecurityContextValue>(
    () => ({
      isLocked,
      securityEnabled,
      biometricEnabled,
      isOnline,
      setSecurityEnabled,
      setBiometricEnabled,
      setPin,
      unlock,
      cacheOfflineData,
      readOfflineData,
      enqueuePendingSync,
    }),
    [isLocked, securityEnabled, biometricEnabled, isOnline],
  );

  return (
    <SecurityContext.Provider value={value}>
      {children}
      {securityEnabled && isLocked ? (
        <Modal transparent={false} visible animationType="fade" statusBarTranslucent>
          <View style={[styles.lockScreen, { backgroundColor: palette.background }]}>
            <View style={[styles.lockIcon, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name="lock-closed" size={34} color={palette.primary} />
            </View>
            <Text style={[styles.lockTitle, { color: palette.textPrimary }]}>FamilyHub lezárva</Text>
            <Text style={[styles.lockText, { color: palette.textSecondary }]}>
              Írd be a PIN-t vagy használj biometrikus feloldást.
            </Text>
            {biometricEnabled ? (
              <Pressable onPress={() => void unlock()} style={[styles.lockButton, { backgroundColor: palette.primary }]}>
                <Ionicons name="finger-print" size={22} color={colors.white} />
                <Text style={styles.lockButtonText}>Biometrikus feloldás</Text>
              </Pressable>
            ) : null}
            <TextInput
              value={pinEntry}
              onChangeText={(value) => {
                setPinEntry(value.replace(/\D/g, '').slice(0, 8));
                setLockError('');
              }}
              placeholder="PIN"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              style={[styles.pinInput, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
            />
            {lockError ? <Text style={[styles.lockError, { color: palette.danger }]}>{lockError}</Text> : null}
            <Pressable onPress={() => void unlockWithPin()} style={[styles.pinButton, { borderColor: palette.primary }]}>
              <Text style={{ color: palette.primary, fontWeight: '900' }}>Feloldás PIN-nel</Text>
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('A useSecurity csak SecurityProvider belül használható.');
  return context;
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  lockIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: { marginTop: spacing.lg, fontSize: 24, fontWeight: '900' },
  lockText: { marginTop: spacing.sm, maxWidth: 300, textAlign: 'center', lineHeight: 20 },
  lockButton: {
    marginTop: spacing.lg,
    minWidth: 220,
    minHeight: 48,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  lockButtonText: { color: colors.white, fontWeight: '900' },
  pinInput: {
    width: 220,
    minHeight: 52,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 18,
  },
  lockError: { marginTop: spacing.sm, fontSize: 12, fontWeight: '800' },
  pinButton: {
    minWidth: 220,
    minHeight: 48,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
