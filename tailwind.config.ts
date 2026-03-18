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
          // Contrast ratios against white (#fff):
          //   brand-600: 3.29:1 (fails WCAG AA normal text, OK for large text/icons)
          //   brand-700: 4.74:1 (passes WCAG AA normal text at 4.5:1)
          //   brand-800: 6.66:1 (passes WCAG AAA)
          // Use brand-700+ for body/link text on white/light backgrounds.
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
      fontSize: {
        '4xs': '7px',
        '3xs': '8px',
        '2xs': '9px',
        xxs: '10px',
        'xs-tight': '11px',
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
