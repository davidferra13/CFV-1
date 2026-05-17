'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ShortcutBinding, CommandEntry, CustomShortcut } from './shortcut-types'

// ---------------------------------------------------------------------------
// 1. Default shortcut bindings (pure, no DB)
// ---------------------------------------------------------------------------

export async function getDefaultShortcuts(): Promise<ShortcutBinding[]> {
  return [
    // Navigation (G + key sequences)
    { id: 'nav-dashboard', key: 'd', modifiers: [], action: 'nav:dashboard', label: 'Go to Dashboard', category: 'navigation', scope: 'global', enabled: true },
    { id: 'nav-events', key: 'e', modifiers: [], action: 'nav:events', label: 'Go to Events', category: 'navigation', scope: 'global', enabled: true },
    { id: 'nav-clients', key: 'c', modifiers: [], action: 'nav:clients', label: 'Go to Clients', category: 'navigation', scope: 'global', enabled: true },
    { id: 'nav-menus', key: 'm', modifiers: [], action: 'nav:menus', label: 'Go to Menus', category: 'navigation', scope: 'global', enabled: true },
    { id: 'nav-recipes', key: 'r', modifiers: [], action: 'nav:recipes', label: 'Go to Recipes', category: 'navigation', scope: 'global', enabled: true },
    // Actions
    { id: 'act-new', key: 'n', modifiers: [], action: 'action:new', label: 'New Item', category: 'actions', scope: 'page', enabled: true },
    { id: 'act-edit', key: 'e', modifiers: [], action: 'action:edit', label: 'Edit', category: 'actions', scope: 'page', enabled: true },
    { id: 'act-save', key: 's', modifiers: ['ctrl'], action: 'action:save', label: 'Save', category: 'actions', scope: 'page', enabled: true },
    // Search
    { id: 'search-open', key: '/', modifiers: [], action: 'search:open', label: 'Open Search', category: 'search', scope: 'global', enabled: true },
    { id: 'search-close', key: 'Escape', modifiers: [], action: 'search:close', label: 'Close Search', category: 'search', scope: 'modal', enabled: true },
  ]
}

// ---------------------------------------------------------------------------
// 2. Get chef custom shortcut overrides
// ---------------------------------------------------------------------------

export async function getCustomShortcuts(): Promise<CustomShortcut[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('custom_shortcuts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    action: row.action,
    key: row.key,
    modifiers: Array.isArray(row.modifiers) ? row.modifiers : JSON.parse(row.modifiers ?? '[]'),
    createdAt: row.created_at,
  })) as CustomShortcut[]
}

// ---------------------------------------------------------------------------
// 3. Save / upsert a custom shortcut binding
// ---------------------------------------------------------------------------

export async function saveCustomShortcut(
  action: string,
  key: string,
  modifiers: string[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Upsert on (tenant_id, action)
  const { error } = await db
    .from('custom_shortcuts')
    .upsert(
      {
        tenant_id: user.tenantId!,
        action,
        key,
        modifiers: JSON.stringify(modifiers),
      },
      { onConflict: 'tenant_id,action' }
    )

  if (error) throw error
}

// ---------------------------------------------------------------------------
// 4. Delete a custom shortcut override
// ---------------------------------------------------------------------------

export async function deleteCustomShortcut(action: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('custom_shortcuts')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('action', action)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// 5. Search command palette entries (fuzzy match on label + keywords)
// ---------------------------------------------------------------------------

export async function searchCommands(query: string): Promise<CommandEntry[]> {
  const all = await getCommandPaletteEntries()
  if (!query.trim()) return all

  const q = query.toLowerCase()
  return all.filter((cmd) => {
    if (cmd.label.toLowerCase().includes(q)) return true
    if (cmd.description.toLowerCase().includes(q)) return true
    return cmd.keywords.some((kw) => kw.toLowerCase().includes(q))
  })
}

// ---------------------------------------------------------------------------
// 6. All command palette entries grouped by category
// ---------------------------------------------------------------------------

export async function getCommandPaletteEntries(): Promise<CommandEntry[]> {
  await requireChef()

  return [
    // Navigation
    { id: 'cmd-dashboard', label: 'Go to Dashboard', description: 'Open the main dashboard', action: 'nav:dashboard', keywords: ['home', 'overview'], category: 'navigation', shortcut: 'G D' },
    { id: 'cmd-events', label: 'Go to Events', description: 'View all events', action: 'nav:events', keywords: ['dinners', 'calendar'], category: 'navigation', shortcut: 'G E' },
    { id: 'cmd-clients', label: 'Go to Clients', description: 'View client list', action: 'nav:clients', keywords: ['guests', 'contacts'], category: 'navigation', shortcut: 'G C' },
    { id: 'cmd-menus', label: 'Go to Menus', description: 'View all menus', action: 'nav:menus', keywords: ['courses', 'dishes'], category: 'navigation', shortcut: 'G M' },
    { id: 'cmd-recipes', label: 'Go to Recipes', description: 'View recipe library', action: 'nav:recipes', keywords: ['cookbook', 'ingredients'], category: 'navigation', shortcut: 'G R' },
    // Actions
    { id: 'cmd-new', label: 'Create New', description: 'Create a new item in current context', action: 'action:new', keywords: ['add', 'create'], category: 'actions', shortcut: 'N' },
    { id: 'cmd-edit', label: 'Edit Current', description: 'Edit the currently selected item', action: 'action:edit', keywords: ['modify', 'change'], category: 'actions', shortcut: 'E' },
    { id: 'cmd-save', label: 'Save', description: 'Save current changes', action: 'action:save', keywords: ['submit', 'update'], category: 'actions', shortcut: 'Ctrl+S' },
    // Search
    { id: 'cmd-search', label: 'Search', description: 'Open global search', action: 'search:open', keywords: ['find', 'lookup', 'filter'], category: 'search', shortcut: '/' },
    // Views
    { id: 'cmd-calendar', label: 'Calendar View', description: 'Switch to calendar view', action: 'view:calendar', keywords: ['schedule', 'week', 'month'], category: 'views' },
    { id: 'cmd-list', label: 'List View', description: 'Switch to list view', action: 'view:list', keywords: ['table', 'rows'], category: 'views' },
  ]
}
