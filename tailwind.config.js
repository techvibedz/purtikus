/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-black': '#0a0a0f',
        'deep-purple': '#0d0b1a',
        'dark-purple': '#1a1333',
        'mid-purple': '#2d1f5e',
        'primary': '#7c3aed',
        'accent': '#06b6d4',
        'neon-blue': '#06b6d4',
        'neon-violet': '#7c3aed',
        'neon-purple': '#8b5cf6',
        'glass-border': 'rgba(124, 58, 237, 0.15)',
        'glass-bg': 'rgba(13, 11, 26, 0.6)',
        'glass-bg-light': 'rgba(45, 31, 94, 0.3)',
      },
      boxShadow: {
        'neon-blue': '0 0 15px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.1)',
        'neon-violet': '0 0 15px rgba(124, 58, 237, 0.3), 0 0 30px rgba(124, 58, 237, 0.1)',
        'neon-glow': '0 0 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(124, 58, 237, 0.1)',
        'orb-idle': '0 0 60px rgba(124, 58, 237, 0.2), 0 0 120px rgba(124, 58, 237, 0.05)',
        'orb-listen': '0 0 40px rgba(6, 182, 212, 0.4), 0 0 80px rgba(6, 182, 212, 0.15)',
        'orb-speak': '0 0 50px rgba(124, 58, 237, 0.5), 0 0 100px rgba(124, 58, 237, 0.2)',
        'orb-exec': '0 0 40px rgba(251, 191, 36, 0.4), 0 0 80px rgba(251, 191, 36, 0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
        'spin-slower': 'spin 20s linear infinite reverse',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.6), 0 0 40px rgba(124, 58, 237, 0.2)' },
        },
      },
    },
  },
  plugins: [],
}
