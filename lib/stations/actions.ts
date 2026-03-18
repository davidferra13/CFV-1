// Station Clipboard System - Station CRUD + Component Management
// Chef-only. Manages kitchen stations, their menu items, and components.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateStationSchema = z.object({
  name: z.string().min(1, 'Station name required'),
  description: z.string().optional(),
  display_order: z.number().int().min(0).default(0),
})

const UpdateStationSchema = z.object({
  name: z.string().min(1, 'Station name required').optional(),
  description: z.string().optional(),
  display_order: z.number().int().min(0).optional(),
})

const AddMenuItemSchema = z.object({
  station_id: z.string().uuid(),
  name: z.string().min(1, 'Menu item name required'),
  description: z.string().optional(),
  menu_item_id: z.string().uuid().nullable().optional(),
})

const AddComponentSchema = z.object({
  station_menu_item_id: z.string().uuid(),
  name: z.string().min(1, 'Component name required'),
  unit: z.string().min(1, 'Unit required'),
  par_level: z.number().min(0).default(0),
  par_unit: z.string().optional(),
  shelf_life_days: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
})

const UpdateComponentSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  par_level: z.number().min(0).optional(),
  par_unit: z.string().optional(),
  shelf_life_days: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
})

export type CreateStationInput = z.infer<typeof CreateStationSchema>
export type UpdateStationInput = z.infer<typeof UpdateStationSchema>
export type AddMenuItemInput = z.infer<typeof AddMenuItemSchema>
export type AddComponentInput = z.infer<typeof AddComponentSchema>
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>

// ============================================
// STATION CRUD
// ============================================

export async function createStation(input: CreateStationInput) {
  const user = await requireChef()
  const validated = CreateStationSchema.parse(input)
  const supabase: any = createServerClient()

  // If no display_order specified, place at end
  if (validated.display_order === 0) {
    const { data: existing } = await supabase
      .from('stations')
      .select('display_order')
      .eq('chef_id', user.tenantId!)
      .order('display_order', { ascending: false })
      .limit(1)

    validated.display_order =
      existing && existing.length > 0 ? (existing[0] as any).display_order + 1 : 0
  }

  const { data, error } = await supabase
    .from('stations')
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      description: validated.description ?? null,
      display_order: validated.display_order,
    })
    .select()
    .single()

  if (error) {
    console.error('[createStation] Error:', error)
    throw new Error('Failed to create station')
  }

  revalidatePath('/stations')
  return data
}

export async function updateStation(id: string, input: UpdateStationInput) {
  const user = await requireChef()
  const validated = UpdateStationSchema.parse(input)
  const supabase: any = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (validated.name !== undefined) updatePayload.name = validated.name
  if (validated.description !== undefined) updatePayload.description = validated.description
  if (validated.display_order !== undefined) updatePayload.display_order = validated.display_order

  const { data, error } = await supabase
    .from('stations')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateStation] Error:', error)
    throw new Error('Failed to update station')
  }

  revalidatePath('/stations')
  revalidatePath(`/stations/${id}`)
  return data
}

export async function deleteStation(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Check for existing clipboard entries - prevent deletion if any exist
  const { data: entries } = await supabase
    .from('clipboard_entries')
    .select('id')
    .eq('station_id', id)
    .eq('chef_id', user.tenantId!)
    .limit(1)

  if (entries && entries.length > 0) {
    throw new Error('Cannot delete station with existing clipboard entries. Archive it instead.')
  }

  // Delete components first (through menu items)
  const { data: menuItems } = await supabase
    .from('station_menu_items')
    .select('id')
    .eq('station_id', id)
    .eq('chef_id', user.tenantId!)

  if (menuItems && menuItems.length > 0) {
    const menuItemIds = menuItems.map((mi: any) => mi.id)
    await supabase
      .from('station_components')
      .delete()
      .in('station_menu_item_id', menuItemIds)
      .eq('chef_id', user.tenantId!)
  }

  // Delete menu items
  await supabase
    .from('station_menu_items')
    .delete()
    .eq('station_id', id)
    .eq('chef_id', user.tenantId!)

  // Delete the station
  const { error } = await supabase
    .from('stations')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteStation] Error:', error)
    throw new Error('Failed to delete station')
  }

  revalidatePath('/stations')
}

export async function listStations() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('stations')
    .select(
      `
      *,
      station_menu_items (
        id,
        name,
        station_components (id)
      )
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('display_order')

  if (error) {
    console.error('[listStations] Error:', error)
    throw new Error('Failed to load stations')
  }

  return (data ?? []).map((station: any) => ({
    ...station,
    menu_item_count: station.station_menu_items?.length ?? 0,
    component_count:
      station.station_menu_items?.reduce(
        (sum: number, mi: any) => sum + (mi.station_components?.length ?? 0),
        0
      ) ?? 0,
  }))
}

export async function getStation(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('stations')
    .select(
      `
      *,
      station_menu_items (
        id,
        name,
        description,
        menu_item_id,
        station_components (
          id,
          name,
          unit,
          par_level,
          par_unit,
          shelf_life_days,
          notes
        )
      )
    `
    )
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getStation] Error:', error)
    throw new Error('Station not found')
  }

  return data
}

// ============================================
// STATION MENU ITEMS
// ============================================

export async function addMenuItemToStation(input: AddMenuItemInput) {
  const user = await requireChef()
  const validated = AddMenuItemSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('station_menu_items')
    .insert({
      chef_id: user.tenantId!,
      station_id: validated.station_id,
      name: validated.name,
      description: validated.description ?? null,
      menu_item_id: validated.menu_item_id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addMenuItemToStation] Error:', error)
    throw new Error('Failed to add menu item to station')
  }

  revalidatePath(`/stations/${validated.station_id}`)
  return data
}

export async function removeMenuItemFromStation(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get station_id for revalidation
  const { data: menuItem } = await supabase
    .from('station_menu_items')
    .select('station_id')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  // Delete components under this menu item
  await supabase
    .from('station_components')
    .delete()
    .eq('station_menu_item_id', id)
    .eq('chef_id', user.tenantId!)

  // Delete the menu item
  const { error } = await supabase
    .from('station_menu_items')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[removeMenuItemFromStation] Error:', error)
    throw new Error('Failed to remove menu item from station')
  }

  if (menuItem) revalidatePath(`/stations/${(menuItem as any).station_id}`)
}

// ============================================
// STATION COMPONENTS
// ============================================

export async function addComponent(input: AddComponentInput) {
  const user = await requireChef()
  const validated = AddComponentSchema.parse(input)
  const supabase: any = createServerClient()

  // Look up station_id from the menu item for revalidation
  const { data: menuItem } = await supabase
    .from('station_menu_items')
    .select('station_id')
    .eq('id', validated.station_menu_item_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!menuItem) throw new Error('Menu item not found')

  const { data, error } = await supabase
    .from('station_components')
    .insert({
      chef_id: user.tenantId!,
      station_menu_item_id: validated.station_menu_item_id,
      name: validated.name,
      unit: validated.unit,
      par_level: validated.par_level,
      par_unit: validated.par_unit ?? validated.unit,
      shelf_life_days: validated.shelf_life_days ?? null,
      notes: validated.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addComponent] Error:', error)
    throw new Error('Failed to add component')
  }

  revalidatePath(`/stations/${(menuItem as any).station_id}`)
  return data
}

export async function updateComponent(id: string, input: UpdateComponentInput) {
  const user = await requireChef()
  const validated = UpdateComponentSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('station_components')
    .update(validated)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateComponent] Error:', error)
    throw new Error('Failed to update component')
  }

  revalidatePath('/stations')
  return data
}

export async function removeComponent(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('station_components')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[removeComponent] Error:', error)
    throw new Error('Failed to remove component')
  }

  revalidatePath('/stations')
}

export async function listStationComponents(stationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('station_menu_items')
    .select(
      `
      id,
      name,
      station_components (
        id,
        name,
        unit,
        par_level,
        par_unit,
        shelf_life_days,
        notes
      )
    `
    )
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[listStationComponents] Error:', error)
    throw new Error('Failed to load station components')
  }

  // Flatten: return all components with their parent menu item name
  const components: any[] = []
  for (const mi of data ?? []) {
    for (const comp of (mi as any).station_components ?? []) {
      components.push({
        ...comp,
        menu_item_name: (mi as any).name,
        station_menu_item_id: (mi as any).id,
      })
    }
  }

  return components
}
