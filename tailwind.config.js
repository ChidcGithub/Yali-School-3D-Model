/** @type {import('tailwindcss').Config} */

// Metro dark theme — pure black canvas, flat solid tiles, single amber accent.
// Typography commits to Segoe UI (the canonical Metro typeface) with Consolas
// for technical readouts. No serif, no mono-display duality: one geometric
// sans family carries everything, differentiated by weight and case.

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          950: "#000000", // canvas
          900: "#0A0A0A",
          800: "#1A1A1A", // tile surface
          700: "#262626", // tile surface elevated
          600: "#333333", // hairline / divider
        },
        amber: {
          DEFAULT: "#E8A33D", // single accent
          soft: "#F0BC6B",
          dim: "#8A6326",
        },
        fog: "#BFBFBF", // secondary text on black
      },
      fontFamily: {
        display: ['"Segoe UI"', '"Segoe UI Variable Display"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Segoe UI"', '"Segoe UI Variable Text"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.2em',
        metro: '0.12em',
      },
      animation: {
        'spin-slow': 'spin 14s linear infinite',
        'metro-rise': 'metroRise 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'metro-fade': 'metroFade 0.4s ease forwards',
        'amber-pulse': 'amberPulse 2.4s ease-in-out infinite',
      },
      keyframes: {
        metroRise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        metroFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        amberPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
    },
  },
  plugins: [],
};
