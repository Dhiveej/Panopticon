/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crimson: '#ff003c',
        cyan: '#00d1ff',
        'deep-black': '#050505',
        'panel-bg': 'rgba(10, 10, 10, 0.70)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 209, 255, 0.4)',
        'neon-crimson': '0 0 15px rgba(255, 0, 60, 0.5)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'pulse-crimson': {
          '0%, 100%': { boxShadow: 'inset 0 0 5px #ff003c', backgroundColor: 'rgba(255, 0, 60, 0.08)' },
          '50%': { boxShadow: 'inset 0 0 20px #ff003c', backgroundColor: 'rgba(255, 0, 60, 0.2)' },
        },
        'glow-text': {
          '0%, 100%': { textShadow: '0 0 8px #ff003c' },
          '50%': { textShadow: '0 0 20px #ff003c, 0 0 40px #ff003c' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-crimson': 'pulse-crimson 1.5s ease-in-out infinite',
        'glow-text': 'glow-text 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
