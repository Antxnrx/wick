import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        signal: '#22c55e',
        noise: '#ef4444',
        organic: '#94a3b8',
        surface: '#0f1117',
        panel: '#161b22',
        border: '#21262d',
      },
    },
  },
  plugins: [],
};

export default config;
