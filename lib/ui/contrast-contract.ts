export type ContrastRole =
  | 'activeSurface'
  | 'activeForeground'
  | 'statusInfo'
  | 'statusWarning'
  | 'statusSuccess'
  | 'statusDanger'
  | 'mutedFunctional'
  | 'disabledFunctional'
  | 'ctaForeground'

export const CHEF_PORTAL_CONTRAST_ROLE_MAP: Record<ContrastRole, string> = {
  activeSurface: 'bg-brand-100 dark:bg-brand-950/70',
  activeForeground: 'text-brand-900 dark:text-brand-100',
  statusInfo:
    'bg-brand-100 text-brand-900 ring-brand-300 dark:bg-brand-950/70 dark:text-brand-100 dark:ring-brand-800',
  statusWarning:
    'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950/70 dark:text-amber-100 dark:ring-amber-800',
  statusSuccess:
    'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-100 dark:ring-emerald-800',
  statusDanger:
    'bg-red-100 text-red-900 ring-red-300 dark:bg-red-950/70 dark:text-red-100 dark:ring-red-800',
  mutedFunctional: 'text-stone-300 dark:text-stone-300',
  disabledFunctional: 'text-stone-400 dark:text-stone-400',
  ctaForeground: 'text-white',
}

export type ContrastTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'muted'

export const STATUS_BADGE_CONTRAST_CLASSES: Record<ContrastTone, string> = {
  neutral:
    'bg-stone-200 text-stone-800 ring-1 ring-inset ring-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-600',
  info: `ring-1 ring-inset ${CHEF_PORTAL_CONTRAST_ROLE_MAP.statusInfo}`,
  warning: `ring-1 ring-inset ${CHEF_PORTAL_CONTRAST_ROLE_MAP.statusWarning}`,
  success: `ring-1 ring-inset ${CHEF_PORTAL_CONTRAST_ROLE_MAP.statusSuccess}`,
  danger: `ring-1 ring-inset ${CHEF_PORTAL_CONTRAST_ROLE_MAP.statusDanger}`,
  muted:
    'bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-300 dark:bg-stone-800/80 dark:text-stone-300 dark:ring-stone-700',
}

export const CTA_CONTRAST_CLASSES = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 focus-visible:ring-brand-500 shadow-sm hover:shadow-md',
  secondary:
    'bg-[var(--surface-2)] text-stone-100 border border-stone-600/80 hover:bg-[var(--surface-3)] hover:text-stone-50 hover:border-stone-500 active:bg-[var(--surface-4)] focus-visible:ring-stone-400 shadow-sm hover:shadow-md',
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-500 shadow-sm hover:shadow-md',
  ghost:
    'bg-transparent text-stone-300 hover:bg-[var(--surface-2)] hover:text-stone-50 active:bg-[var(--surface-3)] focus-visible:ring-stone-400',
} as const

type Rgb = { r: number; g: number; b: number }

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function parseCssColor(color: string): Rgb | null {
  const value = color.trim()
  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1]
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((char) => char + char)
            .join('')
        : raw
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    }
  }

  const rgb = value.match(/^rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i)
  if (!rgb) return null
  return {
    r: clampChannel(Number(rgb[1])),
    g: clampChannel(Number(rgb[2])),
    b: clampChannel(Number(rgb[3])),
  }
}

function channelToLinear(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b)
  )
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function resolveReadableForeground(
  backgroundColor: string,
  options: { light?: string; dark?: string; minimumRatio?: number } = {}
): { color: string; contrastRatio: number; passes: boolean } {
  const background = parseCssColor(backgroundColor)
  const light = parseCssColor(options.light ?? '#ffffff')
  const dark = parseCssColor(options.dark ?? '#1c1917')
  const minimumRatio = options.minimumRatio ?? 4.5

  if (!background || !light || !dark) {
    return { color: options.dark ?? '#1c1917', contrastRatio: 0, passes: false }
  }

  const lightRatio = contrastRatio(background, light)
  const darkRatio = contrastRatio(background, dark)
  const useLight = lightRatio >= darkRatio
  const ratio = useLight ? lightRatio : darkRatio

  return {
    color: useLight ? (options.light ?? '#ffffff') : (options.dark ?? '#1c1917'),
    contrastRatio: Number(ratio.toFixed(2)),
    passes: ratio >= minimumRatio,
  }
}
