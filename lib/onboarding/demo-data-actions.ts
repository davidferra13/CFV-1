'use server'

import { requireChef } from '@/lib/auth/get-user'
import { ensureClient, ensureEvent, ensureInquiry } from '@/lib/demo/seed-helpers'
import {
  ClearDemoDataResult,
  getDemoClientRows,
  hasDemoDataForTenant,
  ONBOARDING_SAMPLE_CLIENTS,
  ONBOARDING_SAMPLE_EVENTS,
  ONBOARDING_SAMPLE_INQUIRY,
  SeedDemoDataResult,
} from '@/lib/onboarding/demo-data-core'
import { createAdminClient } from '@/lib/db/admin'

export async function seedDemoData(): Promise<SeedDemoDataResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId ?? user.entityId
    const admin = createAdminClient()

    if (await hasDemoDataForTenant(tenantId)) {
      return {
        created: false,
        clientsCreated: 0,
        eventsCreated: 0,
        inquiriesCreated: 0,
        error: 'Demo data already exists',
      }
    }

    const clientIds: string[] = []
    for (const client of ONBOARDING_SAMPLE_CLIENTS) {
      const id = await ensureClient(admin, tenantId, client)
      clientIds.push(id)
    }

    for (const event of ONBOARDING_SAMPLE_EVENTS) {
      await ensureEvent(admin, tenantId, clientIds[event.clientIndex], event)
    }

    await ensureInquiry(admin, tenantId, clientIds[ONBOARDING_SAMPLE_INQUIRY.clientIndex], {
      channel: ONBOARDING_SAMPLE_INQUIRY.channel,
      status: ONBOARDING_SAMPLE_INQUIRY.status,
      source_message: ONBOARDING_SAMPLE_INQUIRY.source_message,
      confirmed_occasion: ONBOARDING_SAMPLE_INQUIRY.confirmed_occasion,
      confirmed_guest_count: ONBOARDING_SAMPLE_INQUIRY.confirmed_guest_count,
      confirmed_budget_cents: ONBOARDING_SAMPLE_INQUIRY.confirmed_budget_cents,
      next_action_by: ONBOARDING_SAMPLE_INQUIRY.next_action_by,
      daysAgo: ONBOARDING_SAMPLE_INQUIRY.daysAgo,
    })

    // FC-G4: Seed recipes and a menu so the chef can explore more of the app
    let recipesCreated = 0
    let menusCreated = 0
    try {
      const demoRecipes = [
        {
          name: 'Pan-Seared Salmon',
          description: 'Crispy skin salmon with lemon butter',
          category: 'main',
          servings: 4,
          prep_time_minutes: 15,
          cook_time_minutes: 20,
        },
        {
          name: 'Caesar Salad',
          description: 'Classic romaine with house-made dressing',
          category: 'starter',
          servings: 4,
          prep_time_minutes: 10,
          cook_time_minutes: 0,
        },
        {
          name: 'Chocolate Lava Cake',
          description: 'Warm molten center with vanilla ice cream',
          category: 'dessert',
          servings: 6,
          prep_time_minutes: 20,
          cook_time_minutes: 14,
        },
      ]

      const recipeIds: string[] = []
      for (const recipe of demoRecipes) {
        const { data } = await admin
          .from('recipes')
          .insert({ tenant_id: tenantId, ...recipe, is_demo: true })
          .select('id')
          .single()
        if (data?.id) {
          recipeIds.push(data.id)
          recipesCreated++
        }
      }

      // Create a demo menu linked to the first event
      if (recipeIds.length > 0) {
        const { data: menuData } = await admin
          .from('menus')
          .insert({
            tenant_id: tenantId,
            name: 'Sample Dinner Menu',
            description: 'A demo menu to explore the menu builder',
            is_demo: true,
          })
          .select('id')
          .single()

        if (menuData?.id) {
          menusCreated++
          // Add recipes as menu items
          for (let i = 0; i < recipeIds.length; i++) {
            await admin.from('menu_items').insert({
              menu_id: menuData.id,
              recipe_id: recipeIds[i],
              course: demoRecipes[i].category,
              sort_order: i,
            })
          }
        }
      }
    } catch (demoExtraErr) {
      console.error('[seedDemoData] Recipe/menu seeding failed (non-blocking):', demoExtraErr)
    }

    return {
      created: true,
      clientsCreated: ONBOARDING_SAMPLE_CLIENTS.length,
      eventsCreated: ONBOARDING_SAMPLE_EVENTS.length,
      inquiriesCreated: 1,
      recipesCreated,
      menusCreated,
    }
  } catch (error) {
    return {
      created: false,
      clientsCreated: 0,
      eventsCreated: 0,
      inquiriesCreated: 0,
      error: error instanceof Error ? error.message : 'Failed to seed sample data',
    }
  }
}

export async function clearDemoData(): Promise<ClearDemoDataResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId ?? user.entityId
    const admin = createAdminClient()
    const demoClients = await getDemoClientRows(tenantId)

    if (demoClients.length === 0) {
      return { cleared: true, clientsDeleted: 0, eventsDeleted: 0, inquiriesDeleted: 0 }
    }

    const clientIds = demoClients.map((client: any) => client.id)

    const { data: eventRows, error: eventLookupError } = await admin
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)

    if (eventLookupError) {
      throw new Error(`Failed to load sample events: ${eventLookupError.message}`)
    }

    const eventIds = (eventRows ?? []).map((event: any) => event.id)

    if (eventIds.length > 0) {
      await admin.from('quotes').delete().eq('tenant_id', tenantId).in('event_id', eventIds)
      // ledger_entries are immutable (DB trigger prevents DELETE).
      // Orphaned rows are harmless: their parent events will be deleted,
      // so they won't appear in any view or computed summary.
      await admin.from('expenses').delete().eq('tenant_id', tenantId).in('event_id', eventIds)
    }

    const { data: deletedInquiries, error: inquiryError } = await admin
      .from('inquiries')
      .delete()
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .select('id')

    if (inquiryError) {
      throw new Error(`Failed to clear sample inquiries: ${inquiryError.message}`)
    }

    const { data: deletedEvents, error: eventError } = await admin
      .from('events')
      .delete()
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .select('id')

    if (eventError) {
      throw new Error(`Failed to clear sample events: ${eventError.message}`)
    }

    const { data: deletedClients, error: clientError } = await admin
      .from('clients')
      .delete()
      .eq('tenant_id', tenantId)
      .in('id', clientIds)
      .select('id')

    if (clientError) {
      throw new Error(`Failed to clear sample clients: ${clientError.message}`)
    }

    return {
      cleared: true,
      clientsDeleted: deletedClients?.length ?? 0,
      eventsDeleted: deletedEvents?.length ?? 0,
      inquiriesDeleted: deletedInquiries?.length ?? 0,
    }
  } catch (error) {
    return {
      cleared: false,
      clientsDeleted: 0,
      eventsDeleted: 0,
      inquiriesDeleted: 0,
      error: error instanceof Error ? error.message : 'Failed to clear sample data',
    }
  }
}
