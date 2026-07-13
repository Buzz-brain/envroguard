import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { lightColors, darkColors } from '../constants/theme';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'envroguard_theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: typeof lightColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

function getStorage(): Storage | null {
  try {
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storage = getStorage();
        if (storage) {
          const saved = await storage.getItem(STORAGE_KEY);
          if (saved === 'dark' || saved === 'light') {
            setMode(saved);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((m: ThemeMode) => {
    try {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEY, m);
    } catch {}
  }, []);

  const isDark = mode === 'dark';
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      persist(next);
      return next;
    });
  }, [persist]);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setMode(m);
    persist(m);
  }, [persist]);

  const value = useMemo(() => ({ isDark, colors, toggleTheme, setThemeMode }), [isDark, colors, toggleTheme, setThemeMode]);

  if (!loaded) {
    // Render with light theme while loading preference to avoid flash
    return <ThemeContext.Provider value={{ isDark: false, colors: lightColors, toggleTheme, setThemeMode }}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeColors = () => useContext(ThemeContext);

export const useColors = () => useContext(ThemeContext).colors;
