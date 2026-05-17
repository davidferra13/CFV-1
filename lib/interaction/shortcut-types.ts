export interface ShortcutBinding {
  id: string
  key: string
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  action: string
  label: string
  category: ShortcutCategory
  scope: 'global' | 'page' | 'modal'
  enabled: boolean
}

export type ShortcutCategory = 'navigation' | 'editing' | 'actions' | 'search' | 'views'

export interface CommandEntry {
  id: string
  label: string
  description: string
  action: string
  keywords: string[]
  category: ShortcutCategory
  icon?: string
  shortcut?: string
}

export interface CustomShortcut {
  id: string
  tenantId: string
  action: string
  key: string
  modifiers: string[]
  createdAt: string
}
