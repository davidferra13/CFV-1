import type { Config } from 'tailwindcss'

const config: Config = {
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
          DEFAULT: '#ffffff',
          muted: '#faf9f7',
          accent: '#f5f3ef',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
}
export default config
