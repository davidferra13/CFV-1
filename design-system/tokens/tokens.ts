/**
 * GENERATED FILE - do not edit by hand.
 * Source: design-system/tokens/tokens.json
 * Regenerate with: npm run tokens:build
 *
 * Import these instead of hardcoding numbers in JS. Reading window.innerWidth
 * to branch layout is a design-system violation; use BREAKPOINTS or a Tailwind prefix.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/** The widths every UI change must be verified at. */
export const VERIFY_WIDTHS = [375, 768, 1024, 1440] as const

export const MEDIA = {
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  belowMd: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  belowLg: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  coarsePointer: '(pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const

export const LAYER = {
  below: -1,
  base: 0,
  raised: 10,
  sticky: 20,
  subnav: 25,
  chrome: 30,
  'page-bar': 32,
  'mobile-header': 35,
  nav: 40,
  island: 42,
  'fab-secondary': 44,
  fab: 45,
  status: 46,
  offline: 48,
  overlay: 50,
  dialog: 60,
  float: 70,
  'context-menu': 72,
  command: 74,
  spotlight: 78,
  toast: 80,
  'system-overlay': 85,
  tooltip: 90,
  max: 9999,
} as const

export const DURATION = {
  instant: '75ms',
  fast: '100ms',
  normal: '200ms',
  slow: '350ms',
  enter: '220ms',
  exit: '150ms',
  deliberate: '500ms',
} as const

export const EASING = {
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const TOUCH_TARGET_MIN_PX = 44
export const MOUSE_TARGET_MIN_PX = 24

/** Hard interface maximums. Exceeding one is a design defect, not a preference. */
export const LIMITS = {
  topLevelNavItems: 6,
  dashboardHeroMetrics: 2,
  dashboardSupportingMetrics: 5,
  formFieldsPerVisibleSection: 7,
  tableColumnsDefault: 7,
  buttonsPerToolbar: 5,
  simultaneousToasts: 2,
  tabsPerPage: 6,
  primaryButtonsPerScreen: 1,
  accentColorsPerView: 2,
} as const

/** Status roles. Meaning is global; the silhouette is local. */
export const STATUS_ROLES = ['success', 'warning', 'danger', 'info', 'neutral'] as const
export type StatusRole = (typeof STATUS_ROLES)[number]

/** Loading indicator thresholds in ms. */
export const LOADING_THRESHOLDS = {
  skeletonAfter: 1000,
  progressAfter: 2000,
  backgroundAfter: 10000,
} as const

export const TOAST_DURATION = { confirmation: 3000, warning: 5000, error: 0 } as const
