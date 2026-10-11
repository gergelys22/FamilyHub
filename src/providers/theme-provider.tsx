import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = '@familyhub/theme';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedMode) => {
      if (mounted && (storedMode === 'light' || storedMode === 'dark')) {
        setMode(storedMode);
      }
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

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      setDarkMode,
      toggleDarkMode: () => setDarkMode(mode !== 'dark'),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
