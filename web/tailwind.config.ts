import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        subtle: 'var(--text-subtle)',
        border: 'var(--border)',
        divider: 'var(--divider)',
        primary: 'var(--primary)',
        'primary-weak': 'var(--primary-weak)',
        'primary-strong': 'var(--primary-strong)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        'accent-dashboard': 'var(--accent-dashboard)',
        'accent-competitors': 'var(--accent-competitors)',
        'accent-battlecards': 'var(--accent-battlecards)',
        'accent-updates': 'var(--accent-updates)',
        'accent-settings': 'var(--accent-settings)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
          xl: '2rem',
          '2xl': '2rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      ringColor: {
        DEFAULT: 'var(--primary)',
      },
    },
  },
  plugins: [],
} satisfies Config;
