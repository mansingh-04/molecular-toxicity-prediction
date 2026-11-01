/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#05080d', 900: '#0a1018', 850: '#0e1621', 800: '#131c29', 700: '#1c2838', 600: '#2a3a4f', 500: '#3d5069' },
        lab: { 100: '#e7edf3', 200: '#c9d4df', 300: '#9fb0c2', 400: '#7489a0' },
        accent: { 300: '#7fe6e0', 400: '#3fd3cc', 500: '#18b8b3', 600: '#0f8f8c', 700: '#0b6a69' },
        warn: { 400: '#f2c14e', 500: '#e0a82e' },
        danger: { 400: '#f07a7a', 500: '#d95757' },
        ok: { 400: '#6fd39a', 500: '#43b67a' },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        scan: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: { fadeIn: 'fadeIn .25s ease-out both', scan: 'scan 1.6s linear infinite' },
    },
  },
  plugins: [],
};
