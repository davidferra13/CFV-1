export type SettingsTone = 'brand' | 'sky' | 'emerald' | 'rose' | 'amber' | 'slate'

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
  sky: {
    panel: 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900/75 dark:bg-sky-950/30',
    accentBar:
      'from-sky-300/95 via-sky-200/65 to-transparent dark:from-sky-500/55 dark:via-sky-400/25 dark:to-transparent',
    iconWrap:
      'border-sky-200/85 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/60 dark:text-sky-200',
    pill: 'border-sky-200/85 bg-sky-50/90 text-sky-800 dark:border-sky-900/75 dark:bg-sky-950/65 dark:text-sky-200',
    divider: 'border-sky-200/70 dark:border-sky-900/70',
    summaryChip:
      'border-sky-200/80 bg-white/80 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-200',
    cta: 'text-sky-700 dark:text-sky-200',
  },
  emerald: {
    panel:
      'border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/75 dark:bg-emerald-950/30',
    accentBar:
      'from-emerald-300/95 via-emerald-200/65 to-transparent dark:from-emerald-500/55 dark:via-emerald-400/20 dark:to-transparent',
    iconWrap:
      'border-emerald-200/85 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-200',
    pill: 'border-emerald-200/85 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/75 dark:bg-emerald-950/65 dark:text-emerald-200',
    divider: 'border-emerald-200/70 dark:border-emerald-900/70',
    summaryChip:
      'border-emerald-200/80 bg-white/80 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200',
    cta: 'text-emerald-700 dark:text-emerald-200',
  },
  rose: {
    panel: 'border-rose-200/80 bg-rose-50/60 dark:border-rose-900/75 dark:bg-rose-950/30',
    accentBar:
      'from-rose-300/95 via-rose-200/60 to-transparent dark:from-rose-500/55 dark:via-rose-400/20 dark:to-transparent',
    iconWrap:
      'border-rose-200/85 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-200',
    pill: 'border-rose-200/85 bg-rose-50/90 text-rose-800 dark:border-rose-900/75 dark:bg-rose-950/65 dark:text-rose-200',
    divider: 'border-rose-200/70 dark:border-rose-900/70',
    summaryChip:
      'border-rose-200/80 bg-white/80 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-200',
    cta: 'text-rose-700 dark:text-rose-200',
  },
  amber: {
    panel: 'border-amber-200/80 bg-amber-50/65 dark:border-amber-900/75 dark:bg-amber-950/30',
    accentBar:
      'from-amber-300/95 via-amber-200/60 to-transparent dark:from-amber-500/55 dark:via-amber-400/20 dark:to-transparent',
    iconWrap:
      'border-amber-200/85 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-200',
    pill: 'border-amber-200/85 bg-amber-50/90 text-amber-800 dark:border-amber-900/75 dark:bg-amber-950/65 dark:text-amber-200',
    divider: 'border-amber-200/70 dark:border-amber-900/70',
    summaryChip:
      'border-amber-200/80 bg-white/80 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200',
    cta: 'text-amber-700 dark:text-amber-200',
  },
  slate: {
    panel: 'border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/30',
    accentBar:
      'from-slate-300/95 via-slate-200/60 to-transparent dark:from-slate-500/45 dark:via-slate-400/20 dark:to-transparent',
    iconWrap:
      'border-slate-200/85 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200',
    pill: 'border-slate-200/85 bg-slate-50/90 text-slate-800 dark:border-slate-800 dark:bg-slate-950/65 dark:text-slate-200',
    divider: 'border-slate-200/70 dark:border-slate-800',
    summaryChip:
      'border-slate-200/80 bg-white/80 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200',
    cta: 'text-slate-700 dark:text-slate-200',
  },
}
