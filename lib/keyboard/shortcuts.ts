export interface ShortcutDef {
  keys: string[] // e.g., ['n', 'e'] for N then E chord
  label: string
  category: 'Create' | 'Go to' | 'Help'
  href?: string // for navigation shortcuts
  action?: string // custom action identifier (e.g., 'open-remy', 'show-help')
}

export const SHORTCUTS: ShortcutDef[] = [
  // Creation shortcuts (N + letter)
  { keys: ['n', 'e'], href: '/events/new', label: 'New Event', category: 'Create' },
  { keys: ['n', 'c'], href: '/clients/new', label: 'New Client', category: 'Create' },
  { keys: ['n', 'q'], href: '/quotes/new', label: 'New Quote', category: 'Create' },
  { keys: ['n', 'i'], href: '/inquiries/new', label: 'New Inquiry', category: 'Create' },
  { keys: ['n', 'r'], href: '/recipes/new', label: 'New Recipe', category: 'Create' },
  { keys: ['n', 'x'], href: '/expenses/new', label: 'New Expense', category: 'Create' },

  // Navigation shortcuts (G + letter)
  { keys: ['g', 'd'], href: '/dashboard', label: 'Dashboard', category: 'Go to' },
  { keys: ['g', 'e'], href: '/events', label: 'Events', category: 'Go to' },
  { keys: ['g', 'c'], href: '/clients', label: 'Clients', category: 'Go to' },
  { keys: ['g', 'i'], href: '/inquiries', label: 'Inquiries', category: 'Go to' },
  { keys: ['g', 'r'], href: '/recipes', label: 'Recipes', category: 'Go to' },
  { keys: ['g', 'f'], href: '/finance', label: 'Finance', category: 'Go to' },
  { keys: ['g', 's'], href: '/settings', label: 'Settings', category: 'Go to' },
  { keys: ['g', 'm'], href: '/culinary/menus', label: 'Menus', category: 'Go to' },

  // Utility
  { keys: ['?'], action: 'show-help', label: 'Show shortcuts', category: 'Help' },
]

/** Group shortcuts by category for display purposes. */
export function groupShortcutsByCategory(): Record<string, ShortcutDef[]> {
  const groups: Record<string, ShortcutDef[]> = {}
  for (const shortcut of SHORTCUTS) {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = []
    }
    groups[shortcut.category].push(shortcut)
  }
  return groups
}
