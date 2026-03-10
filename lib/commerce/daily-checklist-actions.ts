'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ChecklistItem = {
  key: string
  title: string
  category: string
  isCustom: boolean
  completed: boolean
  completedAt: string | null
  completedBy: string | null
}

export type ChecklistProgress = {
  completed: number
  total: number
  percent: number
}

export type ChecklistHistoryEntry = {
  date: string
  openingCompleted: number
  openingTotal: number
  closingCompleted: number
  closingTotal: number
}

// ============================================
// DEFAULT CHECKLIST ITEMS
// ============================================

const DEFAULT_OPENING_ITEMS: { category: string; items: { key: string; title: string }[] }[] = [
  {
    category: 'Facility',
    items: [
      { key: 'open_unlock_doors', title: 'Unlock doors' },
      { key: 'open_lights', title: 'Turn on lights' },
      { key: 'open_thermostat', title: 'Set thermostat' },
      { key: 'open_restrooms', title: 'Check restrooms' },
    ],
  },
  {
    category: 'Kitchen',
    items: [
      { key: 'open_ovens', title: 'Turn on ovens/ranges' },
      { key: 'open_fryers', title: 'Start fryers' },
      { key: 'open_walkin_temps', title: 'Check walk-in temps' },
      { key: 'open_prep_list', title: 'Review prep list' },
    ],
  },
  {
    category: 'FOH',
    items: [
      { key: 'open_set_tables', title: 'Set tables' },
      { key: 'open_pos', title: 'Check POS system' },
      { key: 'open_reservations', title: 'Review reservations' },
      { key: 'open_bar', title: 'Stock bar' },
      { key: 'open_ice', title: 'Fill ice bins' },
    ],
  },
  {
    category: 'Staff',
    items: [
      { key: 'open_specials', title: 'Review daily specials' },
      { key: 'open_stations', title: 'Assign stations' },
      { key: 'open_attendance', title: 'Confirm staff present' },
      { key: 'open_preshift', title: 'Pre-shift meeting' },
    ],
  },
]

const DEFAULT_CLOSING_ITEMS: { category: string; items: { key: string; title: string }[] }[] = [
  {
    category: 'Kitchen',
    items: [
      { key: 'close_clean_stations', title: 'Clean all stations' },
      { key: 'close_store_prep', title: 'Cover and store prep' },
      { key: 'close_walkin_temps', title: 'Check walk-in temps' },
      { key: 'close_equipment', title: 'Turn off equipment' },
      { key: 'close_grease', title: 'Empty grease traps' },
    ],
  },
  {
    category: 'FOH',
    items: [
      { key: 'close_bus_tables', title: 'Bus all tables' },
      { key: 'close_wipe', title: 'Wipe down surfaces' },
      { key: 'close_condiments', title: 'Restock condiments' },
      { key: 'close_bar', title: 'Close bar' },
      { key: 'close_cash', title: 'Count cash drawer' },
    ],
  },
  {
    category: 'Facility',
    items: [
      { key: 'close_trash', title: 'Take out trash' },
      { key: 'close_mop', title: 'Mop floors' },
      { key: 'close_lock', title: 'Lock doors' },
      { key: 'close_alarm', title: 'Set alarm' },
      { key: 'close_restrooms', title: 'Check restrooms' },
    ],
  },
  {
    category: 'Admin',
    items: [
      { key: 'close_register', title: 'Close register' },
      { key: 'close_reconciliation', title: 'Run reconciliation' },
      { key: 'close_next_day', title: 'Review next day reservations' },
      { key: 'close_shift_notes', title: 'Submit shift notes' },
    ],
  },
]

// ============================================
// HELPERS
// ============================================

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

async function getCustomItems(supabase: any, chefId: string, type: 'opening' | 'closing') {
  const { data } = await supabase
    .from('daily_checklist_custom_items')
    .select('*')
    .eq('chef_id', chefId)
    .eq('checklist_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return data || []
}

async function getCompletions(
  supabase: any,
  chefId: string,
  date: string,
  type: 'opening' | 'closing'
) {
  const { data } = await supabase
    .from('daily_checklist_completions')
    .select('item_key, completed_at, completed_by')
    .eq('chef_id', chefId)
    .eq('checklist_date', date)
    .eq('checklist_type', type)

  const map = new Map<string, { completed_at: string; completed_by: string | null }>()
  for (const row of data || []) {
    map.set(row.item_key, {
      completed_at: row.completed_at,
      completed_by: row.completed_by,
    })
  }
  return map
}

function buildChecklist(
  defaults: { category: string; items: { key: string; title: string }[] }[],
  customItems: any[],
  completions: Map<string, { completed_at: string; completed_by: string | null }>
): ChecklistItem[] {
  const result: ChecklistItem[] = []

  for (const group of defaults) {
    for (const item of group.items) {
      const completion = completions.get(item.key)
      result.push({
        key: item.key,
        title: item.title,
        category: group.category,
        isCustom: false,
        completed: !!completion,
        completedAt: completion?.completed_at || null,
        completedBy: completion?.completed_by || null,
      })
    }
  }

  for (const custom of customItems) {
    const completion = completions.get(custom.id)
    result.push({
      key: custom.id,
      title: custom.title,
      category: custom.category || 'Custom',
      isCustom: true,
      completed: !!completion,
      completedAt: completion?.completed_at || null,
      completedBy: completion?.completed_by || null,
    })
  }

  return result
}

// ============================================
// ACTIONS
// ============================================

export async function getOpeningChecklist(date?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const d = date || todayStr()

  const [customItems, completions] = await Promise.all([
    getCustomItems(supabase, user.tenantId!, 'opening'),
    getCompletions(supabase, user.tenantId!, d, 'opening'),
  ])

  return buildChecklist(DEFAULT_OPENING_ITEMS, customItems, completions)
}

export async function getClosingChecklist(date?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const d = date || todayStr()

  const [customItems, completions] = await Promise.all([
    getCustomItems(supabase, user.tenantId!, 'closing'),
    getCompletions(supabase, user.tenantId!, d, 'closing'),
  ])

  return buildChecklist(DEFAULT_CLOSING_ITEMS, customItems, completions)
}

export async function toggleChecklistItem(
  date: string,
  itemKey: string,
  checklistType: 'opening' | 'closing'
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Check if already completed
  const { data: existing } = await supabase
    .from('daily_checklist_completions')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('checklist_date', date)
    .eq('checklist_type', checklistType)
    .eq('item_key', itemKey)
    .maybeSingle()

  if (existing) {
    // Un-check
    await supabase
      .from('daily_checklist_completions')
      .delete()
      .eq('id', existing.id)
      .eq('chef_id', user.tenantId!)

    revalidatePath('/stations/daily-ops')
    revalidatePath('/commerce/purchase-orders')
    return { completed: false }
  }

  // Check
  const { error } = await supabase.from('daily_checklist_completions').insert({
    chef_id: user.tenantId!,
    checklist_date: date,
    checklist_type: checklistType,
    item_key: itemKey,
  })

  if (error) {
    console.error('[daily-checklist] toggleChecklistItem error:', error)
    throw new Error('Failed to toggle checklist item')
  }

  revalidatePath('/stations/daily-ops')
  revalidatePath('/commerce/purchase-orders')
  return { completed: true }
}

export async function getChecklistProgress(
  date: string,
  type: 'opening' | 'closing'
): Promise<ChecklistProgress> {
  const checklist =
    type === 'opening' ? await getOpeningChecklist(date) : await getClosingChecklist(date)

  const completed = checklist.filter((i) => i.completed).length
  const total = checklist.length
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export async function addCustomChecklistItem(
  type: 'opening' | 'closing',
  title: string,
  category?: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get max sort order
  const { data: existing } = await supabase
    .from('daily_checklist_custom_items')
    .select('sort_order')
    .eq('chef_id', user.tenantId!)
    .eq('checklist_type', type)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('daily_checklist_custom_items')
    .insert({
      chef_id: user.tenantId!,
      checklist_type: type,
      title,
      category: category || 'Custom',
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[daily-checklist] addCustomChecklistItem error:', error)
    throw new Error('Failed to add custom checklist item')
  }

  revalidatePath('/stations/daily-ops')
  return data
}

export async function removeCustomChecklistItem(itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('daily_checklist_custom_items')
    .update({ is_active: false })
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[daily-checklist] removeCustomChecklistItem error:', error)
    throw new Error('Failed to remove checklist item')
  }

  revalidatePath('/stations/daily-ops')
}

export async function getChecklistHistory(days: number = 7) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  const { data: completions } = await supabase
    .from('daily_checklist_completions')
    .select('checklist_date, checklist_type, item_key')
    .eq('chef_id', user.tenantId!)
    .gte('checklist_date', startStr)
    .order('checklist_date', { ascending: false })

  // Get custom items count
  const { data: customOpening } = await supabase
    .from('daily_checklist_custom_items')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('checklist_type', 'opening')
    .eq('is_active', true)

  const { data: customClosing } = await supabase
    .from('daily_checklist_custom_items')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('checklist_type', 'closing')
    .eq('is_active', true)

  const openingTotal =
    DEFAULT_OPENING_ITEMS.reduce((s, g) => s + g.items.length, 0) + (customOpening?.length || 0)
  const closingTotal =
    DEFAULT_CLOSING_ITEMS.reduce((s, g) => s + g.items.length, 0) + (customClosing?.length || 0)

  // Group by date
  const byDate = new Map<string, { opening: number; closing: number }>()
  for (const c of completions || []) {
    const entry = byDate.get(c.checklist_date) || { opening: 0, closing: 0 }
    if (c.checklist_type === 'opening') entry.opening++
    else entry.closing++
    byDate.set(c.checklist_date, entry)
  }

  const history: ChecklistHistoryEntry[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const counts = byDate.get(dateStr) || { opening: 0, closing: 0 }
    history.push({
      date: dateStr,
      openingCompleted: counts.opening,
      openingTotal,
      closingCompleted: counts.closing,
      closingTotal,
    })
  }

  return history
}
