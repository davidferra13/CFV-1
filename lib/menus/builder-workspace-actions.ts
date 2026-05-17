// Menu Builder Chef-Grade Workspace Actions
// Workspace state, drag-drop ordering, section management, builder preferences

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { BuilderState, MenuBuilderTemplate } from './builder-workspace-types'

// ============================================
// BUILDER STATE
// ============================================

export async function getBuilderState(menuId: string): Promise<BuilderState> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_builder_states')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('menu_id', menuId)
    .single()

  if (error && error.code === 'PGRST116') {
    // Not found, create default state
    const { data: created, error: createErr } = await db
      .from('menu_builder_states')
      .insert({
        tenant_id: user.tenantId!,
        menu_id: menuId,
        view_mode: 'edit',
        show_prices: true,
        show_descriptions: true,
        show_allergens: true,
        expanded_sections: [],
        last_saved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createErr) throw new Error(`Failed to create builder state: ${createErr.message}`)

    return mapBuilderState(created)
  }

  if (error) throw new Error(`Failed to get builder state: ${error.message}`)

  return mapBuilderState(data)
}

export async function updateBuilderState(
  menuId: string,
  updates: Partial<Pick<BuilderState, 'viewMode' | 'showPrices' | 'showDescriptions' | 'showAllergens' | 'expandedSections'>>
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const dbUpdates: Record<string, unknown> = {
    last_saved_at: new Date().toISOString(),
  }

  if (updates.viewMode !== undefined) dbUpdates.view_mode = updates.viewMode
  if (updates.showPrices !== undefined) dbUpdates.show_prices = updates.showPrices
  if (updates.showDescriptions !== undefined) dbUpdates.show_descriptions = updates.showDescriptions
  if (updates.showAllergens !== undefined) dbUpdates.show_allergens = updates.showAllergens
  if (updates.expandedSections !== undefined) dbUpdates.expanded_sections = updates.expandedSections

  // Upsert: create if missing, update if exists
  const { data, error } = await db
    .from('menu_builder_states')
    .upsert(
      {
        tenant_id: user.tenantId!,
        menu_id: menuId,
        ...dbUpdates,
      },
      { onConflict: 'tenant_id,menu_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to update builder state: ${error.message}`)

  revalidatePath('/menus')
  return { success: true, data: mapBuilderState(data) }
}

// ============================================
// SECTION & DISH ORDERING
// ============================================

export async function reorderSections(menuId: string, sectionOrder: string[]) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu belongs to tenant
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) throw new Error('Menu not found')

  // Update each section's order
  const updates = sectionOrder.map((sectionId, index) =>
    db
      .from('menu_sections')
      .update({ sort_order: index })
      .eq('id', sectionId)
      .eq('menu_id', menuId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r: { error: unknown }) => r.error)
  if (failed?.error) throw new Error(`Failed to reorder sections: ${(failed.error as { message: string }).message}`)

  revalidatePath('/menus')
  return { success: true }
}

export async function reorderDishes(sectionId: string, dishOrder: string[]) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify section belongs to tenant via menu
  const { data: section, error: secErr } = await db
    .from('menu_sections')
    .select('id, menu_id, menus!inner(tenant_id)')
    .eq('id', sectionId)
    .single()

  if (secErr || !section) throw new Error('Section not found')
  if ((section as any).menus?.tenant_id !== user.tenantId!) throw new Error('Access denied')

  // Update each dish's order
  const updates = dishOrder.map((dishId, index) =>
    db
      .from('menu_dishes')
      .update({ sort_order: index })
      .eq('id', dishId)
      .eq('section_id', sectionId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r: { error: unknown }) => r.error)
  if (failed?.error) throw new Error(`Failed to reorder dishes: ${(failed.error as { message: string }).message}`)

  revalidatePath('/menus')
  return { success: true }
}

// ============================================
// BUILDER TEMPLATES
// ============================================

export async function getMenuBuilderTemplates(): Promise<MenuBuilderTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_builder_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to get builder templates: ${error.message}`)

  return (data ?? []).map(mapBuilderTemplate)
}

export async function saveAsTemplate(menuId: string, name: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name?.trim()) throw new Error('Template name is required')

  // Fetch current menu sections
  const { data: sections, error: secErr } = await db
    .from('menu_sections')
    .select('title, description')
    .eq('menu_id', menuId)
    .order('sort_order', { ascending: true })

  if (secErr) throw new Error(`Failed to read menu sections: ${secErr.message}`)

  const templateSections = (sections ?? []).map((s: { title: string; description: string | null }) => ({
    title: s.title,
    description: s.description ?? null,
  }))

  const { data, error } = await db
    .from('menu_builder_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: name.trim(),
      sections: templateSections,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save template: ${error.message}`)

  revalidatePath('/menus')
  return { success: true, data: mapBuilderTemplate(data) }
}

export async function applyTemplate(menuId: string, templateId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu belongs to tenant
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) throw new Error('Menu not found')

  // Fetch template
  const { data: template, error: tplErr } = await db
    .from('menu_builder_templates')
    .select('*')
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (tplErr || !template) throw new Error('Template not found')

  const sections = template.sections as { title: string; description: string | null }[]

  // Delete existing sections for this menu
  const { error: delErr } = await db
    .from('menu_sections')
    .delete()
    .eq('menu_id', menuId)

  if (delErr) throw new Error(`Failed to clear existing sections: ${delErr.message}`)

  // Insert template sections
  if (sections.length > 0) {
    const inserts = sections.map((s, i) => ({
      menu_id: menuId,
      title: s.title,
      description: s.description,
      sort_order: i,
    }))

    const { error: insertErr } = await db
      .from('menu_sections')
      .insert(inserts)

    if (insertErr) throw new Error(`Failed to apply template sections: ${insertErr.message}`)
  }

  revalidatePath('/menus')
  return { success: true }
}

// ============================================
// MAPPERS
// ============================================

function mapBuilderState(row: Record<string, unknown>): BuilderState {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    menuId: row.menu_id as string,
    viewMode: row.view_mode as BuilderState['viewMode'],
    showPrices: row.show_prices as boolean,
    showDescriptions: row.show_descriptions as boolean,
    showAllergens: row.show_allergens as boolean,
    expandedSections: (row.expanded_sections ?? []) as string[],
    lastSavedAt: row.last_saved_at as string,
  }
}

function mapBuilderTemplate(row: Record<string, unknown>): MenuBuilderTemplate {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    sections: (row.sections ?? []) as { title: string; description: string | null }[],
    createdAt: row.created_at as string,
  }
}
