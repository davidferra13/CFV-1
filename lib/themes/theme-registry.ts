import type { EventTheme } from '@/lib/hub/types'

/**
 * Convert a theme to CSS custom properties for injection into a wrapper div.
 */
export function themeToCSSVars(theme: EventTheme): Record<string, string> {
  const vars: Record<string, string> = {
    '--hub-primary': theme.primary_color,
    '--hub-secondary': theme.secondary_color,
    '--hub-accent': theme.accent_color,
  }
  if (theme.background_gradient) {
    vars['--hub-bg'] = theme.background_gradient
  }
  if (theme.font_display) {
    vars['--hub-font-display'] = theme.font_display
  }
  return vars
}

/**
 * Category display labels.
 */
export const THEME_CATEGORY_LABELS: Record<string, string> = {
  celebration: 'Celebrations',
  corporate: 'Corporate',
  holiday: 'Holidays',
  seasonal: 'Seasonal',
  casual: 'Casual',
  formal: 'Formal',
}

/**
 * Group themes by category for display in the theme picker.
 */
export function groupThemesByCategory(
  themes: EventTheme[]
): { category: string; label: string; themes: EventTheme[] }[] {
  const groups: Record<string, EventTheme[]> = {}
  for (const theme of themes) {
    if (!groups[theme.category]) groups[theme.category] = []
    groups[theme.category].push(theme)
  }
  return Object.entries(groups).map(([category, items]) => ({
    category,
    label: THEME_CATEGORY_LABELS[category] ?? category,
    themes: items,
  }))
}
