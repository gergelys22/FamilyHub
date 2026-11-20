import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = '@familyhub/theme';
const LARGE_TEXT_STORAGE_KEY = '@familyhub/large-text';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  largeText: boolean;
  setLargeText: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  const [largeText, setLargeTextState] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedMode) => {
      if (mounted && (storedMode === 'light' || storedMode === 'dark')) {
        setMode(storedMode);
      }
    });
    void AsyncStorage.getItem(LARGE_TEXT_STORAGE_KEY).then((storedValue) => {
      if (mounted) setLargeTextState(storedValue === 'true');
    });
    return () => {
      mounted = false;
    };
  }, []);

  function setDarkMode(enabled: boolean) {
    const nextMode: ThemeMode = enabled ? 'dark' : 'light';
    setMode(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }

  function setLargeText(enabled: boolean) {
    setLargeTextState(enabled);
    void AsyncStorage.setItem(LARGE_TEXT_STORAGE_KEY, String(enabled));
  }

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      setDarkMode,
      toggleDarkMode: () => setDarkMode(mode !== 'dark'),
      largeText,
      setLargeText,
    }),
    [largeText, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
