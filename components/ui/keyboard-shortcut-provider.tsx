'use client'

import { ShortcutProvider } from '@/components/keyboard/shortcut-provider'
import { ShortcutHelp } from '@/components/keyboard/shortcut-help'

/**
 * Combines the shortcut listener and the help overlay.
 * Kept as a thin wrapper so the chef layout import stays unchanged.
 */
export function KeyboardShortcutProvider({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      {children}
      <ShortcutHelp />
    </ShortcutProvider>
  )
}
