"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the expected size
    return (
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                   bg-df-lightMain hover:bg-gray-50 border-df-lightBorder
                   dark:bg-[var(--df-dark-card)] dark:hover:bg-[var(--df-dark-nav)]
                   dark:border-[var(--df-dark-border)]
                   focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2
                   focus:ring-offset-white dark:focus:ring-offset-[var(--df-dark-main)]"
        aria-label="Toggle dark mode"
      >
        <div className="h-4 w-4" />
        <span className="hidden sm:inline">Theme</span>
      </button>
    );
  }

  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                 bg-df-lightMain hover:bg-gray-50 border-df-lightBorder
                 dark:bg-[var(--df-dark-card)] dark:hover:bg-[var(--df-dark-nav)]
                 dark:border-[var(--df-dark-border)]
                 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2
                 focus:ring-offset-white dark:focus:ring-offset-[var(--df-dark-main)]"
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
