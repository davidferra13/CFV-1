import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9f3',
          100: '#fcf0e0',
          200: '#f8ddc0',
          300: '#f3c596',
          400: '#eda86b',
          500: '#e88f47',
          600: '#d47530',
          700: '#b15c26',
          800: '#8e4a24',
          900: '#744021',
          950: '#3e200f',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        content: '72rem',
      },
      keyframes: {
        'fade-slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'mascot-peek': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'mascot-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'mascot-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        'mascot-hop': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'thinking-dot': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'remy-breathe': {
          '0%': { transform: 'scaleY(1) scaleX(1) translateY(0)' },
          '40%': { transform: 'scaleY(1.018) scaleX(0.994) translateY(-0.5px)' },
          '60%': { transform: 'scaleY(1.012) scaleX(0.997) translateY(-0.3px)' },
          '100%': { transform: 'scaleY(1) scaleX(1) translateY(0)' },
        },
        'remy-hat-wobble': {
          '0%': { transform: 'rotate(0deg) translateY(0)' },
          '25%': { transform: 'rotate(0.6deg) translateY(-0.3px)' },
          '50%': { transform: 'rotate(-0.4deg) translateY(0)' },
          '75%': { transform: 'rotate(0.2deg) translateY(-0.15px)' },
          '100%': { transform: 'rotate(0deg) translateY(0)' },
        },
        'mascot-wiggle': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '15%': { transform: 'rotate(-4deg) scale(0.97)' },
          '35%': { transform: 'rotate(3deg) scale(1.02)' },
          '55%': { transform: 'rotate(-2deg) scale(1)' },
          '75%': { transform: 'rotate(1deg) scale(1.005)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
        'mascot-hop': {
          '0%': { transform: 'translateY(0) scaleY(1) scaleX(1)' },
          '15%': { transform: 'translateY(1px) scaleY(0.92) scaleX(1.06)' },
          '40%': { transform: 'translateY(-10px) scaleY(1.05) scaleX(0.96)' },
          '65%': { transform: 'translateY(-8px) scaleY(1.02) scaleX(0.98)' },
          '85%': { transform: 'translateY(1px) scaleY(0.95) scaleX(1.04)' },
          '100%': { transform: 'translateY(0) scaleY(1) scaleX(1)' },
        },
      },
      animation: {
        'fade-slide-up': 'fade-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'mascot-peek': 'mascot-peek 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'mascot-bob': 'mascot-bob 3s ease-in-out infinite',
        'mascot-wiggle': 'mascot-wiggle 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'mascot-hop': 'mascot-hop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'thinking-dot': 'thinking-dot 0.6s ease-in-out infinite',
        'remy-breathe': 'remy-breathe 4s ease-in-out infinite',
        'remy-hat-wobble': 'remy-hat-wobble 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
