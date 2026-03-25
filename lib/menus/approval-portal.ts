'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkDishAgainstAllergens, type AllergenConflict } from './allergen-check'

// ==========================================
// SEND MENU PROPOSAL
// ==========================================

export async function sendMenuProposal(
  eventId: string,
  menuId: string
): Promise<{
  success: boolean
  revisionId?: string
  conflicts?: AllergenConflict[]
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load event with client
  const { data: event } = await db
    .from('events')
    .select(
      'id, client_id, tenant_id, menu_revision_count, confirmed_occasion:occasion, event_date'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found.' }

  // Load menu with dishes and ingredients
  const { data: menu } = await db
    .from('menus')
    .select(
      `
      id, name, description, service_style, cuisine_type,
      dishes (
        id, name, description, course_number, course_name,
        linked_recipe_id
      )
    `
    )
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) return { success: false, error: 'Menu not found.' }

  // Load ingredients for all linked recipes in one batched query
  const dishes = menu.dishes ?? []
  const recipeIds = dishes
    .map((d: any) => d.linked_recipe_id)
    .filter((id: string | null): id is string => !!id)

  let ingredientsByRecipeId = new Map<string, { name: string }[]>()

  if (recipeIds.length > 0) {
    const { data: allIngredients } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, ingredients(name)')
      .in('recipe_id', recipeIds)

    for (const ri of allIngredients ?? []) {
      const name = (ri as any).ingredients?.name ?? ''
      const list = ingredientsByRecipeId.get(ri.recipe_id) ?? []
      list.push({ name })
      ingredientsByRecipeId.set(ri.recipe_id, list)
    }
  }

  const dishesWithIngredients = dishes.map((dish: any) => ({
    ...dish,
    ingredients: dish.linked_recipe_id
      ? (ingredientsByRecipeId.get(dish.linked_recipe_id) ?? [])
      : [],
  }))

  // Run allergen cross-reference if client has allergy records
  let allergenConflicts: AllergenConflict[] = []
  if (event.client_id) {
    const { data: allergyRecords } = await db
      .from('client_allergy_records')
      .select('allergen, severity, confirmed_by_chef')
      .eq('client_id', event.client_id)
      .eq('tenant_id', user.tenantId!)

    if (allergyRecords?.length) {
      for (const dish of dishesWithIngredients) {
        const conflicts = checkDishAgainstAllergens(
          dish.name,
          dish.id,
          dish.ingredients,
          allergyRecords
        )
        allergenConflicts.push(...conflicts)
      }
    }
  }

  // Create menu revision (snapshot)
  const newVersion = (event.menu_revision_count ?? 0) + 1
  const { data: revision, error: revError } = await db
    .from('menu_revisions')
    .insert({
      menu_id: menuId,
      event_id: eventId,
      tenant_id: user.tenantId!,
      version: newVersion,
      revision_type: 'initial',
      snapshot: {
        menu_name: menu.name,
        description: menu.description,
        service_style: menu.service_style,
        dishes: dishesWithIngredients.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          course_number: d.course_number,
          course_name: d.course_name,
          ingredients: d.ingredients.map((i: any) => i.name),
        })),
      },
      allergen_conflicts: allergenConflicts.length > 0 ? allergenConflicts : null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (revError) {
    console.error('[menu-proposal] Failed to create revision:', revError.message)
    return { success: false, error: 'Failed to create menu revision.' }
  }

  // Update event
  await db
    .from('events')
    .update({
      menu_id: menuId,
      menu_sent_at: new Date().toISOString(),
      menu_approval_status: 'sent',
      menu_revision_count: newVersion,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  // Send notification to client (non-blocking)
  try {
    const { data: client } = await db
      .from('clients')
      .select('id, full_name, email')
      .eq('id', event.client_id!)
      .single()

    if (client) {
      await db.from('notifications').insert({
        tenant_id: user.tenantId!,
        recipient_id: client.id,
        recipient_role: 'client',
        client_id: client.id,
        event_id: eventId,
        title: 'Menu proposal ready for review',
        body: `Your chef has sent a menu proposal for your ${event.confirmed_occasion ?? 'event'}.`,
        category: 'booking',
        action: 'view_proposal',
        action_url: `/proposals/${eventId}`,
      })
    }
  } catch (err) {
    console.error('[menu-proposal] Notification failed (non-blocking):', err)
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, revisionId: revision.id, conflicts: allergenConflicts }
}

// ==========================================
// CLIENT-SIDE: SUBMIT DISH FEEDBACK
// ==========================================

const DishFeedbackSchema = z.object({
  eventId: z.string().uuid(),
  revisionId: z.string().uuid(),
  feedback: z.array(
    z.object({
      dishId: z.string().uuid(),
      status: z.enum(['approved', 'flagged']),
      comment: z.string().max(1000).optional(),
    })
  ),
})

export async function submitDishFeedback(
  input: z.infer<typeof DishFeedbackSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireClient()
  const parsed = DishFeedbackSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid feedback data.' }

  const db: any = createServerClient()

  // Get revision to find tenant_id
  const { data: revision } = await db
    .from('menu_revisions')
    .select('id, tenant_id, menu_id, version')
    .eq('id', parsed.data.revisionId)
    .single()

  if (!revision) return { success: false, error: 'Menu revision not found.' }

  // Get client ID from event (scoped by tenant from revision)
  const { data: event } = await db
    .from('events')
    .select('client_id')
    .eq('id', parsed.data.eventId)
    .eq('tenant_id', revision.tenant_id)
    .single()

  if (!event?.client_id) return { success: false, error: 'Event not found.' }

  // Insert feedback records
  const records = parsed.data.feedback.map((f) => ({
    menu_revision_id: revision.id,
    dish_id: f.dishId,
    tenant_id: revision.tenant_id,
    client_id: event.client_id!,
    status: f.status,
    comment: f.comment ?? null,
  }))

  const { error: insertError } = await db.from('menu_dish_feedback').insert(records)

  if (insertError) {
    console.error('[dish-feedback] Insert failed:', insertError.message)
    return { success: false, error: 'Failed to save feedback.' }
  }

  // Determine overall menu status
  const hasFlagged = parsed.data.feedback.some((f) => f.status === 'flagged')

  await db
    .from('events')
    .update({
      menu_approval_status: hasFlagged ? 'revision_requested' : 'approved',
      menu_approved_at: hasFlagged ? null : new Date().toISOString(),
      menu_last_client_feedback_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.eventId)
    .eq('tenant_id', revision.tenant_id)

  // Create feedback revision
  await db.from('menu_revisions').insert({
    menu_id: revision.menu_id,
    event_id: parsed.data.eventId,
    tenant_id: revision.tenant_id,
    version: revision.version + 1,
    revision_type: 'client_feedback',
    snapshot: { feedback: parsed.data.feedback },
    changes_summary: hasFlagged
      ? `Client flagged ${parsed.data.feedback.filter((f) => f.status === 'flagged').length} dish(es) for revision.`
      : 'Client approved all dishes.',
    created_by: event.client_id,
  })

  // Notify chef (non-blocking)
  try {
    await db.from('notifications').insert({
      tenant_id: revision.tenant_id,
      recipient_id: revision.tenant_id,
      recipient_role: 'chef',
      client_id: event.client_id,
      event_id: parsed.data.eventId,
      title: hasFlagged ? 'Menu feedback: changes requested' : 'Menu approved by client!',
      body: hasFlagged
        ? `Your client flagged ${parsed.data.feedback.filter((f) => f.status === 'flagged').length} dish(es) for revision.`
        : 'Your client approved the full menu. You are all set!',
      category: 'booking',
      action: 'view_event',
      action_url: `/events/${parsed.data.eventId}`,
    })
  } catch (err) {
    console.error('[dish-feedback] Notification failed (non-blocking):', err)
  }

  // Update menu revision count on event
  await db
    .from('events')
    .update({ menu_revision_count: revision.version + 1 })
    .eq('id', parsed.data.eventId)
    .eq('tenant_id', revision.tenant_id)

  revalidatePath(`/events/${parsed.data.eventId}`)
  revalidatePath(`/proposals/${parsed.data.eventId}`)
  return { success: true }
}

// ==========================================
// APPROVE ENTIRE MENU
// ==========================================

export async function approveEntireMenu(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  await requireClient()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, client_id, tenant_id, menu_id, occasion')
    .eq('id', eventId)
    .single()

  if (!event) return { success: false, error: 'Event not found.' }

  await db
    .from('events')
    .update({
      menu_approval_status: 'approved',
      menu_approved_at: new Date().toISOString(),
      menu_last_client_feedback_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', event.tenant_id)

  // Notify chef (non-blocking)
  try {
    await db.from('notifications').insert({
      tenant_id: event.tenant_id,
      recipient_id: event.tenant_id,
      recipient_role: 'chef',
      client_id: event.client_id,
      event_id: eventId,
      title: 'Menu approved!',
      body: `Your client approved the menu for ${event.occasion ?? 'their event'}.`,
      category: 'booking',
      action: 'view_event',
      action_url: `/events/${eventId}`,
    })
  } catch (err) {
    console.error('[menu-approval] Notification failed (non-blocking):', err)
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ==========================================
// GET MENU REVISIONS (history)
// ==========================================

export async function getMenuRevisions(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_revisions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('version', { ascending: false })

  if (error) {
    console.error('[menu-revisions] Failed to load:', error.message)
    return []
  }

  return data ?? []
}
