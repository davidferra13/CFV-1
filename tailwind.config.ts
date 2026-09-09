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
      /* Typography families. Governed by design-system/tokens/tokens.json ->
         typography.families. Two visible families plus a functional monospace:
           font-sans    system interface stack, no webfont, zero network cost
           font-display Playfair Display, the editorial brand voice (h1/h2/hero/metric)
           font-mono    functional only: code, IDs, hashes, fixed-width data
         font-ui is an explicit alias for the interface stack. */
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
        ui: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        /* 2026-09-09: font-display previously resolved to the same system stack as
           font-sans, making the utility a no-op across 124 headings while
           .font-display-serif carried the brand voice on a handful of others.
           Mapped to the Playfair stack so the display voice is consistent.
           Revert: replace the array below with the `ui` array above. */
        display: ['var(--font-playfair)', 'Georgia', '"Times New Roman"', 'serif'],
        serif: ['var(--font-playfair)', 'Georgia', '"Times New Roman"', 'serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      spacing: {
        section: '3rem',
        'section-lg': '4rem',
        'card-grid': '1.25rem',
      },
      // === GENERATED:design-system-scales - do not edit by hand. Run npm run tokens:build ===
      borderRadius: {
        field: '8px',
        control: '8px',
        card: '12px',
        sheet: '16px',
        pill: '9999px',
        avatar: '9999px',
        media: '12px',
      },
      zIndex: {
        below: '-1',
        base: '0',
        raised: '10',
        sticky: '20',
        subnav: '25',
        chrome: '30',
        'page-bar': '32',
        'mobile-header': '35',
        nav: '40',
        island: '42',
        'fab-secondary': '44',
        fab: '45',
        status: '46',
        offline: '48',
        overlay: '50',
        dialog: '60',
        float: '70',
        'context-menu': '72',
        command: '74',
        spotlight: '78',
        toast: '80',
        'system-overlay': '85',
        tooltip: '90',
        max: '9999',
      },
      transitionDuration: {
        instant: '75ms',
        fast: '100ms',
        normal: '200ms',
        slow: '350ms',
        enter: '220ms',
        exit: '150ms',
        deliberate: '500ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      minHeight: {
        touch: '44px',
        'control-sm': '44px',
        'control-md': '44px',
        'control-lg': '48px',
      },
      minWidth: {
        touch: '44px',
      },
      maxWidth: {
        content: '72rem',
        prose: '42rem',
        form: '36rem',
        settings: '48rem',
      },
      boxShadow: {
        card: 'var(--elevation-card)',
        'card-hover': 'var(--elevation-card-hover)',
        overlay: 'var(--elevation-overlay)',
      },
      // === END GENERATED:design-system-scales ===
      keyframes: {
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { borderLeftColor: 'rgb(239 68 68)' },
          '50%': { borderLeftColor: 'rgb(239 68 68 / 0.4)' },
        },
      },
      animation: {
        'scale-in': 'scale-in 200ms var(--ease-spring) both',
        shimmer: 'loading-shimmer 1.7s var(--ease-spring) infinite',
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-down': 'slide-down 180ms var(--ease-spring) both',
        'slide-up-out': 'slide-up-out 140ms ease-in both',
        'count-up': 'count-up 400ms var(--ease-spring) both',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
