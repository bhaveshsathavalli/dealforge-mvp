'use client'
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';

export type Theme = 'light' | 'dark';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };
const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({children}:{children: React.ReactNode}) {
  const [theme, setTheme] = useState<Theme>('light');

  // initial theme from localStorage or system
  useEffect(() => {
    // Force light mode for now
    setTheme('light');
  }, []);

  // write to <html data-theme> + persist
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('df-theme', theme);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
export default ThemeProvider;