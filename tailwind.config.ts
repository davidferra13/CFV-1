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
        surface: {
          DEFAULT: '#1c1917',
          muted: '#292524',
          accent: '#292524',
          page: '#0c0a09',
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
      },
      animation: {
        'fade-slide-up': 'fade-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
