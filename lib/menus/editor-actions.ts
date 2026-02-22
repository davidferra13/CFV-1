'use server'

// Menu Doc Editor — Server Actions
// Handles auto-save mutations and context loading for the Google Doc-style menu editor.
// All mutations enforce tenant scoping and chef-only access.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditorDish = {
  id: string
  course_number: number
  course_name: string
  name: string | null
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  chef_notes: string | null
  sort_order: number
  photo_url: string | null
}

export type EditorMenu = {
  id: string
  name: string
  description: string | null
  cuisine_type: string | null
  service_style: string | null
  target_guest_count: number | null
  price_per_person_cents: number | null
  simple_mode: boolean
  simple_mode_content: string | null
  status: string
  is_template: boolean
  event_id: string | null
  dishes: EditorDish[]
}

export type EditorEvent = {
  id: string
  occasion: string | null
  event_date: string
  event_time: string | null
  guest_count: number | null
  quoted_price_cents: number | null
  status: string
  venue_name: string | null
  venue_address: string | null
  client_id: string | null
  client: {
    id: string
    full_name: string | null
    dietary_restrictions: string | null
    allergies: string | null
  } | null
}

export type PreviousMenu = {
  id: string
  name: string
  cuisine_type: string | null
  created_at: string
  event_date: string | null
}

export type EditorContext = {
  menu: EditorMenu
  event: EditorEvent | null
  previousMenus: PreviousMenu[]
}

// ─── getEditorContext ─────────────────────────────────────────────────────────

export async function getEditorContext(menuId: string): Promise<EditorContext | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Menu with dishes
  const { data: menu, error: menuErr } = await supabase
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) return null

  const { data: dishes } = await supabase
    .from('dishes')
    .select(
      'id, course_number, course_name, description, dietary_tags, allergen_flags, chef_notes, sort_order, photo_url'
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  const editorMenu: EditorMenu = {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    cuisine_type: menu.cuisine_type,
    service_style: menu.service_style,
    target_guest_count: menu.target_guest_count,
    price_per_person_cents: (menu as any).price_per_person_cents ?? null,
    simple_mode: (menu as any).simple_mode ?? false,
    simple_mode_content: (menu as any).simple_mode_content ?? null,
    status: menu.status,
    is_template: menu.is_template ?? false,
    event_id: menu.event_id ?? null,
    dishes: ((dishes ?? []) as any[]).map((d: any) => ({
      id: d.id,
      course_number: d.course_number,
      course_name: d.course_name,
      name: (d as any).name ?? null,
      description: d.description ?? null,
      dietary_tags: (d.dietary_tags as string[]) ?? [],
      allergen_flags: (d.allergen_flags as string[]) ?? [],
      chef_notes: d.chef_notes ?? null,
      sort_order: d.sort_order ?? d.course_number,
      photo_url: (d as any).photo_url ?? null,
    })),
  }

  if (!menu.event_id) {
    return { menu: editorMenu, event: null, previousMenus: [] }
  }

  // Load event with client
  const { data: ev } = (await supabase
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, guest_count, quoted_price_cents, status, venue_name, venue_address, client_id'
    )
    .eq('id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()) as { data: any }

  let editorEvent: EditorEvent | null = null
  let clientId: string | null = null

  if (ev) {
    clientId = ev.client_id ?? null
    let clientData: EditorEvent['client'] = null

    if (clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('id, full_name, dietary_restrictions, allergies')
        .eq('id', clientId)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (client) {
        clientData = {
          id: client.id,
          full_name: client.full_name ?? null,
          dietary_restrictions: (client as any).dietary_restrictions ?? null,
          allergies: (client as any).allergies ?? null,
        }
      }
    }

    editorEvent = {
      id: ev.id,
      occasion: ev.occasion,
      event_date: ev.event_date,
      event_time: ev.serve_time ?? null,
      guest_count: ev.guest_count ?? null,
      quoted_price_cents: ev.quoted_price_cents ?? null,
      status: ev.status,
      venue_name: (ev as any).venue_name ?? null,
      venue_address: (ev as any).venue_address ?? null,
      client_id: clientId,
      client: clientData,
    }
  }

  // Previous menus for this client
  let previousMenus: PreviousMenu[] = []
  if (clientId) {
    const { data: prevEvents } = await supabase
      .from('events')
      .select('id, event_date')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .neq('id', menu.event_id)

    if (prevEvents && prevEvents.length > 0) {
      const prevEventIds = prevEvents.map((e) => e.id)
      const eventDateMap = Object.fromEntries(prevEvents.map((e) => [e.id, e.event_date]))

      const { data: prevMenus } = await supabase
        .from('menus')
        .select('id, name, cuisine_type, created_at, event_id')
        .in('event_id', prevEventIds)
        .eq('tenant_id', user.tenantId!)
        .neq('id', menuId)
        .order('created_at', { ascending: false })
        .limit(3)

      previousMenus = (prevMenus ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        cuisine_type: m.cuisine_type,
        created_at: m.created_at,
        event_date: m.event_id ? (eventDateMap[m.event_id] ?? null) : null,
      }))
    }
  }

  return { menu: editorMenu, event: editorEvent, previousMenus }
}

// ─── updateMenuMeta ───────────────────────────────────────────────────────────

export async function updateMenuMeta(
  menuId: string,
  data: {
    name?: string
    cuisine_type?: string | null
    service_style?: string | null
    target_guest_count?: number | null
    price_per_person_cents?: number | null
    simple_mode?: boolean
    simple_mode_content?: string | null
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('menus')
    .update({
      ...(data as any),
      updated_by: user.id,
    })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateMenuMeta] Error:', error)
    throw new Error('Failed to save menu')
  }

  revalidatePath(`/menus/${menuId}`)
  revalidatePath(`/menus/${menuId}/editor`)
}

// ─── updateDishEditorContent ──────────────────────────────────────────────────

export async function updateDishEditorContent(
  dishId: string,
  data: {
    name?: string | null
    course_name?: string
    description?: string | null
    dietary_tags?: string[]
    allergen_flags?: string[]
    chef_notes?: string | null
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('dishes')
    .update({
      ...data,
      updated_by: user.id,
    })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateDishEditorContent] Error:', error)
    throw new Error('Failed to save dish')
  }
}

// ─── addEditorCourse ──────────────────────────────────────────────────────────

export async function addEditorCourse(
  menuId: string,
  data: {
    course_name: string
    course_number: number
    name?: string
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: dish, error } = (await supabase
    .from('dishes')
    .insert({
      menu_id: menuId,
      tenant_id: user.tenantId!,
      course_name: data.course_name,
      course_number: data.course_number,
      sort_order: data.course_number,
      dietary_tags: [],
      allergen_flags: [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select(
      'id, course_number, course_name, description, dietary_tags, allergen_flags, chef_notes, sort_order'
    )
    .single()) as { data: any; error: any }

  if (error) {
    console.error('[addEditorCourse] Error:', error)
    throw new Error('Failed to add course')
  }

  revalidatePath(`/menus/${menuId}/editor`)

  return {
    id: dish.id,
    course_number: dish.course_number,
    course_name: dish.course_name,
    name: (dish as any).name ?? null,
    description: dish.description ?? null,
    dietary_tags: (dish.dietary_tags as string[]) ?? [],
    allergen_flags: (dish.allergen_flags as string[]) ?? [],
    chef_notes: dish.chef_notes ?? null,
    sort_order: dish.sort_order ?? dish.course_number,
  } as EditorDish
}

// ─── deleteEditorCourse ───────────────────────────────────────────────────────

export async function deleteEditorCourse(dishId: string, menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteEditorCourse] Error:', error)
    throw new Error('Failed to delete course')
  }

  revalidatePath(`/menus/${menuId}/editor`)
}

// ─── reorderEditorCourse ──────────────────────────────────────────────────────

export async function reorderEditorCourse(
  menuId: string,
  dishId: string,
  direction: 'up' | 'down'
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length < 2) return

  const idx = dishes.findIndex((d) => d.id === dishId)
  if (idx === -1) return

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= dishes.length) return

  const a = dishes[idx]
  const b = dishes[swapIdx]

  await supabase
    .from('dishes')
    .update({ sort_order: b.sort_order })
    .eq('id', a.id)
    .eq('tenant_id', user.tenantId!)

  await supabase
    .from('dishes')
    .update({ sort_order: a.sort_order })
    .eq('id', b.id)
    .eq('tenant_id', user.tenantId!)
}
