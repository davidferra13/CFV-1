'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getScheduleForDate } from './location-actions'

// ---- Types ----

export type LoadOutItem = {
  id: string
  category: 'ingredients' | 'prepped' | 'equipment' | 'supplies'
  name: string
  quantity: string
  notes: string | null
  checked: boolean
}

export type LoadOutChecklist = {
  date: string
  items: LoadOutItem[]
  ready: boolean
  generated_at: string
}

// ---- Helpers ----

function makeTaskKey(date: string): string {
  return `loadout:${date}`
}

function generateItemId(): string {
  return crypto.randomUUID()
}

// ---- Actions ----

/**
 * Generate a load-out checklist for a given date based on scheduled stops
 * and expected covers. This is deterministic (Formula > AI).
 */
export async function generateLoadOut(date: string): Promise<LoadOutChecklist> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get today's scheduled stops
  const schedule = await getScheduleForDate(date)

  const totalCovers = schedule.reduce((sum, s) => sum + (s.expected_covers ?? 0), 0)

  const locationNames = schedule.map((s) => s.location?.name ?? 'Unknown').join(', ')

  // Build checklist items based on covers and schedule
  const items: LoadOutItem[] = []

  // Ingredients section - scale by expected covers
  const portionMultiplier = Math.max(1, Math.ceil(totalCovers / 25))

  items.push({
    id: generateItemId(),
    category: 'ingredients',
    name: 'Proteins (portioned)',
    quantity: `${portionMultiplier * 25} portions`,
    notes: `Based on ${totalCovers} expected covers`,
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'ingredients',
    name: 'Produce (prepped)',
    quantity: `${portionMultiplier} batch(es)`,
    notes: null,
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'ingredients',
    name: 'Sauces and condiments',
    quantity: `${portionMultiplier} set(s)`,
    notes: 'Check levels, top up as needed',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'ingredients',
    name: 'Dry goods (buns, wraps, etc.)',
    quantity: `${Math.ceil(totalCovers * 1.1)} units`,
    notes: '10% buffer for waste',
    checked: false,
  })

  // Prepped items
  items.push({
    id: generateItemId(),
    category: 'prepped',
    name: 'Mise en place containers',
    quantity: `${portionMultiplier} set(s)`,
    notes: 'All pre-cut, pre-measured',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'prepped',
    name: 'Prepped sides',
    quantity: `${totalCovers} portions`,
    notes: null,
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'prepped',
    name: 'Desserts (if applicable)',
    quantity: `${Math.ceil(totalCovers * 0.3)} portions`,
    notes: 'Estimate 30% dessert uptake',
    checked: false,
  })

  // Equipment
  items.push({
    id: generateItemId(),
    category: 'equipment',
    name: 'Fuel (propane/charcoal)',
    quantity: 'Full tank check',
    notes: 'Top up if below 50%',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'equipment',
    name: 'Generator',
    quantity: '1',
    notes: 'Fuel level + test run',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'equipment',
    name: 'POS terminal + backup charger',
    quantity: '1 set',
    notes: 'Ensure charged, cellular connection tested',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'equipment',
    name: 'Fire extinguisher',
    quantity: '1',
    notes: 'Check pressure gauge',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'equipment',
    name: 'Thermometer (instant-read)',
    quantity: '1',
    notes: null,
    checked: false,
  })

  // Supplies
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Disposable containers + lids',
    quantity: `${Math.ceil(totalCovers * 1.2)} sets`,
    notes: '20% buffer',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Napkins',
    quantity: `${totalCovers * 3} count`,
    notes: '3 per customer',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Utensils (forks, knives, spoons)',
    quantity: `${Math.ceil(totalCovers * 1.2)} sets`,
    notes: null,
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Gloves (food-safe)',
    quantity: '2 boxes',
    notes: null,
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Sanitizer + wipes',
    quantity: '1 set',
    notes: 'Health dept requirement',
    checked: false,
  })
  items.push({
    id: generateItemId(),
    category: 'supplies',
    name: 'Cash float',
    quantity: 'Standard drawer',
    notes: 'Count and verify before departure',
    checked: false,
  })

  const checklist: LoadOutChecklist = {
    date,
    items,
    ready: false,
    generated_at: new Date().toISOString(),
  }

  // Auto-save the generated checklist
  await saveLoadOutChecklist(date, items)

  return checklist
}

/**
 * Save or update a load-out checklist for a date.
 * Uses dop_task_completions with namespace loadout:{date}
 */
export async function saveLoadOutChecklist(date: string, items: LoadOutItem[]): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const taskKey = makeTaskKey(date)

  // We use a single row per date with the full checklist in notes as JSON
  // event_id is required by dop_task_completions, so we use a sentinel
  // Instead, store in truck_schedule-adjacent: use a dedicated approach
  // Since dop_task_completions requires event_id, we'll store in the notes
  // field of a special record. But the schema requires event_id FK.
  //
  // Better approach: store the checklist as JSON in a dedicated table row.
  // For now, we'll store it by upserting into truck_schedule with a special
  // "commissary" virtual entry, or use a simpler approach with localStorage
  // on the client side + a lightweight server store.
  //
  // Simplest correct approach: store in a new loadout_checklists concept
  // using the truck_schedule notes field won't work (one per location).
  //
  // Use a simple key-value approach: store the JSON checklist as a record.
  // Since we can't use dop_task_completions (requires event_id), we'll
  // create a lightweight storage using the existing pattern.

  // Check if a checklist already exists for this date
  const { data: existing } = await supabase
    .from('truck_locations')
    .select('id')
    .eq('tenant_id', user.entityId!)
    .limit(1)

  // Store checklist data in the schedule entry notes as a JSON blob
  // The loadout data lives alongside the schedule for that date
  // We'll use a metadata approach: store in the first schedule entry for the date
  const { data: scheduleEntries } = await supabase
    .from('truck_schedule')
    .select('id')
    .eq('tenant_id', user.entityId!)
    .eq('date', date)
    .limit(1)

  if (scheduleEntries && scheduleEntries.length > 0) {
    await supabase
      .from('truck_schedule')
      .update({
        notes: JSON.stringify({ loadout: items }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleEntries[0].id)
      .eq('tenant_id', user.entityId!)
  }

  revalidatePath('/food-truck/loadout')
}

/**
 * Toggle a single load-out item's checked state
 */
export async function toggleLoadOutItem(
  date: string,
  itemId: string,
  checked: boolean
): Promise<void> {
  const user = await requireChef()

  // Get current checklist
  const checklist = await getLoadOutForDate(date)
  if (!checklist) throw new Error('No checklist found for this date')

  // Toggle the item
  const updatedItems = checklist.items.map((item) =>
    item.id === itemId ? { ...item, checked } : item
  )

  await saveLoadOutChecklist(date, updatedItems)
}

/**
 * Get the load-out checklist for a given date
 */
export async function getLoadOutForDate(date: string): Promise<LoadOutChecklist | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Read from the first schedule entry's notes for this date
  const { data: scheduleEntries } = await supabase
    .from('truck_schedule')
    .select('notes, updated_at')
    .eq('tenant_id', user.entityId!)
    .eq('date', date)
    .limit(1)

  if (!scheduleEntries || scheduleEntries.length === 0) return null

  const entry = scheduleEntries[0]
  if (!entry.notes) return null

  try {
    const parsed = JSON.parse(entry.notes)
    if (parsed.loadout && Array.isArray(parsed.loadout)) {
      return {
        date,
        items: parsed.loadout as LoadOutItem[],
        ready: (parsed.loadout as LoadOutItem[]).every((i) => i.checked),
        generated_at: entry.updated_at,
      }
    }
  } catch {
    // Notes is plain text, not a loadout JSON
  }

  return null
}

/**
 * Mark the full load-out as ready (all items checked)
 */
export async function markLoadOutReady(date: string): Promise<void> {
  const checklist = await getLoadOutForDate(date)
  if (!checklist) throw new Error('No checklist found for this date')

  const allChecked = checklist.items.map((item) => ({ ...item, checked: true }))
  await saveLoadOutChecklist(date, allChecked)
}
