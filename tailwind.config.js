/** @type {import('tailwindcss').Config} */

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
          950: "#0E0F13",
          900: "#15171D",
          800: "#1C1F27",
          700: "#262A33",
          600: "#3A3D44",
        },
        amber: {
          DEFAULT: "#E8A33D",
          soft: "#F0BC6B",
          dim: "#8A6326",
        },
        fog: "#A8A8AE",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        widest: '0.2em',
      },
      animation: {
        'spin-slow': 'spin 14s linear infinite',
        'fade-in': 'fadeIn 0.8s ease forwards',
        'rise': 'rise 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
