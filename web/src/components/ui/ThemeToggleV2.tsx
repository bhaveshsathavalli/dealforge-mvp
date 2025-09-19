'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

export function ThemeToggleV2() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                 bg-[var(--surface)] hover:bg-[var(--surface-alt)] border-[var(--border)]
                 focus:outline-none"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
