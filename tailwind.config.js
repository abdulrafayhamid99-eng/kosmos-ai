/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kosmos: {
          950: '#030712',
          900: '#090d16',
          850: '#0d1322',
          800: '#131b2e',
          700: '#1e293b',
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-flow': 'glowFlow 6s ease infinite',
        'scanline': 'scanline 4s linear infinite',
      },
      keyframes: {
        glowFlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 25px rgba(139,92,246,0.5))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};