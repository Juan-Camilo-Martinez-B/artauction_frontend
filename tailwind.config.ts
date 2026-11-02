import type { Config } from 'tailwindcss';

// Tokens del sistema de diseno: papel, tinta y oxido con tipografia editorial.
// Los componentes de src/components/ui los usan; las paginas no deberian
// inventar colores ni sombras propias.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#f3efe4', deep: '#ebe5d6' },
        surface: '#fbf8f1',
        ink: { DEFAULT: '#1b1814', soft: '#38322a' },
        muted: '#5e584e',
        line: { DEFAULT: '#d8d0c2', strong: '#b9ae9b' },
        oxide: { DEFAULT: '#7a2e24', deep: '#5e2019', tint: '#f3e3df' },
        moss: { DEFAULT: '#1e5c40', tint: '#e1efe6' },
        ochre: { DEFAULT: '#8a5a12', tint: '#f6ead3' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        field: '0.5rem',
        panel: '0.875rem',
      },
      boxShadow: {
        panel: '0 1px 2px rgb(27 24 20 / 0.06), 0 12px 32px -18px rgb(27 24 20 / 0.28)',
        lift: '0 18px 48px -20px rgb(27 24 20 / 0.45)',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
