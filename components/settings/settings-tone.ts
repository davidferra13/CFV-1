export type SettingsTone = 'brand' | 'neutral'

type SettingsToneStyles = {
  panel: string
  accentBar: string
  iconWrap: string
  pill: string
  divider: string
  summaryChip: string
  cta: string
}

export const SETTINGS_TONE_STYLES: Record<SettingsTone, SettingsToneStyles> = {
  brand: {
    panel: 'border-brand-200/70 bg-brand-50/60 dark:border-brand-900/80 dark:bg-brand-950/35',
    accentBar:
      'from-brand-300/95 via-brand-200/65 to-transparent dark:from-brand-500/60 dark:via-brand-400/25 dark:to-transparent',
    iconWrap:
      'border-brand-200/80 bg-brand-50 text-brand-700 dark:border-brand-900/70 dark:bg-brand-950/60 dark:text-brand-200',
    pill: 'border-brand-200/85 bg-brand-50/90 text-brand-800 dark:border-brand-900/75 dark:bg-brand-950/65 dark:text-brand-200',
    divider: 'border-brand-200/70 dark:border-brand-900/70',
    summaryChip:
      'border-brand-200/80 bg-white/80 text-brand-700 dark:border-brand-900/70 dark:bg-brand-950/50 dark:text-brand-200',
    cta: 'text-brand-700 dark:text-brand-200',
  },
  neutral: {
    panel: 'border-stone-200/80 bg-stone-50/60 dark:border-stone-700/60 dark:bg-stone-900/30',
    accentBar:
      'from-stone-300/60 via-stone-200/30 to-transparent dark:from-stone-600/30 dark:via-stone-700/15 dark:to-transparent',
    iconWrap:
      'border-stone-200/85 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
    pill: 'border-stone-200/85 bg-stone-50/90 text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400',
    divider: 'border-stone-200/70 dark:border-stone-700/60',
    summaryChip:
      'border-stone-200/80 bg-white/80 text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400',
    cta: 'text-stone-700 dark:text-stone-300',
  },
}
