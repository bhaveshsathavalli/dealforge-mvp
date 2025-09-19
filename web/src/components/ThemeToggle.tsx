'use client'
import { useTheme } from '@/app/providers/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme" className="px-3 py-1 rounded-lg border border-border">
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}