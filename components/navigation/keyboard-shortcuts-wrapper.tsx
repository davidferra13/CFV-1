'use client'

import { KeyboardShortcutProvider } from '@/components/ui/keyboard-shortcut-provider'

/**
 * Thin client-side wrapper that activates the global keyboard shortcut system
 * for all chef portal pages. Lives in the server-rendered chef layout as a
 * client island that wraps only the shortcut provider — not the entire layout.
 */
export function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  return <KeyboardShortcutProvider>{children}</KeyboardShortcutProvider>
}
