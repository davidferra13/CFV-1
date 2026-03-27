import colors from 'tailwindcss/colors'
import type { Config } from 'tailwindcss'

const variableScale = (prefix: string) => ({
  50: `rgb(var(--${prefix}-50) / <alpha-value>)`,
  100: `rgb(var(--${prefix}-100) / <alpha-value>)`,
  200: `rgb(var(--${prefix}-200) / <alpha-value>)`,
  300: `rgb(var(--${prefix}-300) / <alpha-value>)`,
  400: `rgb(var(--${prefix}-400) / <alpha-value>)`,
  500: `rgb(var(--${prefix}-500) / <alpha-value>)`,
  600: `rgb(var(--${prefix}-600) / <alpha-value>)`,
  700: `rgb(var(--${prefix}-700) / <alpha-value>)`,
  800: `rgb(var(--${prefix}-800) / <alpha-value>)`,
  900: `rgb(var(--${prefix}-900) / <alpha-value>)`,
  950: `rgb(var(--${prefix}-950) / <alpha-value>)`,
})

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
        brand: variableScale('brand'),
        stone: variableScale('stone'),
        zinc: variableScale('stone'),
        gray: variableScale('stone'),
        neutral: variableScale('stone'),
        slate: colors.slate,
        red: colors.red,
        amber: colors.amber,
        emerald: colors.emerald,
        green: colors.green,
        orange: colors.orange,
        teal: colors.teal,
        pink: colors.pink,
        purple: colors.purple,
        rose: colors.rose,
        yellow: colors.yellow,
        lime: colors.lime,
        surface: {
          DEFAULT: 'rgb(var(--surface-1-rgb) / <alpha-value>)',
          muted: 'rgb(var(--surface-0-rgb) / <alpha-value>)',
          accent: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
        },
      },
      fontSize: {
        '4xs': '8px',
        '3xs': '9px',
        '2xs': '10px',
        xxs: '11px',
        'xs-tight': '12px',
        /* Tailwind defaults overridden for better readability:
           xs: 0.75rem (12px) -> 0.8125rem (13px)
           sm: 0.875rem (14px) -> 0.9375rem (15px)
           base: 1rem (16px) stays the same */
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
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
