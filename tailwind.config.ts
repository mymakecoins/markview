import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--color-bg)',
        'theme-text': 'var(--color-text)',
        'theme-border': 'var(--color-border)',
        'theme-code-bg': 'var(--color-code-bg)',
      },
    },
  },
  plugins: [],
};

export default config;
