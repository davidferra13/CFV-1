// Remy AI SDK Tool Definitions
// Each tool wraps existing server-side queries for use with streamText agent loops.
// Read-only tools execute immediately. Write tools flag needsApproval in metadata.

import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@/lib/db/server'

/**
 * Build the full set of Remy tools for chef (operator) surface.
 * Requires tenantId for DB scoping.
 */
export function buildRemyTools(tenantId: string) {
  return {
    lookupClient: tool({
      description:
        'Find a client by name and return their details including email, phone, dietary restrictions, and event history count',
      inputSchema: z.object({
        name: z.string().describe('Client name or partial name to search for'),
      }),
      execute: async ({ name }) => {
        const db: any = createServerClient()
        const { data: clients } = await db
          .from('clients')
          .select('id, full_name, email, phone, dietary_restrictions, notes, created_at')
          .eq('tenant_id', tenantId)
          .ilike('full_name', `%${name}%`)
          .limit(5)

        if (!clients || clients.length === 0) {
          return { found: false, message: `No clients found matching "${name}"` }
        }

        // Get event counts for matched clients
        const clientIds = clients.map((c: any) => c.id)
        const { data: eventCounts } = await db
          .from('events')
          .select('client_id')
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)

        const countMap = new Map<string, number>()
        for (const e of eventCounts ?? []) {
          countMap.set(e.client_id, (countMap.get(e.client_id) ?? 0) + 1)
        }

        return {
          found: true,
          clients: clients.map((c: any) => ({
            id: c.id,
            name: c.full_name,
            email: c.email,
            phone: c.phone,
            dietaryRestrictions: c.dietary_restrictions,
            notes: c.notes,
            eventCount: countMap.get(c.id) ?? 0,
          })),
        }
      },
    }),

    checkCalendar: tool({
      description:
        'Check chef availability for a specific date by looking at existing events on that date',
      inputSchema: z.object({
        date: z.string().describe('Date to check in YYYY-MM-DD format'),
      }),
      execute: async ({ date }) => {
        const db: any = createServerClient()
        const { data: events } = await db
          .from('events')
          .select('id, occasion, event_date, event_time, status, guest_count, client_id')
          .eq('tenant_id', tenantId)
          .eq('event_date', date)
          .is('deleted_at' as any, null)
          .order('event_time')

        if (!events || events.length === 0) {
          return {
            available: true,
            date,
            events: [],
            message: `No events on ${date}; you're free.`,
          }
        }

        // Get client names for context
        const clientIds = events.map((e: any) => e.client_id).filter(Boolean)
        const { data: clients } =
          clientIds.length > 0
            ? await db.from('clients').select('id, full_name').in('id', clientIds)
            : { data: [] }
        const nameMap = new Map((clients ?? []).map((c: any) => [c.id, c.full_name]))

        return {
          available: false,
          date,
          eventCount: events.length,
          events: events.map((e: any) => ({
            id: e.id,
            occasion: e.occasion,
            time: e.event_time,
            status: e.status,
            guestCount: e.guest_count,
            clientName: nameMap.get(e.client_id) ?? 'Unknown',
          })),
        }
      },
    }),

    searchRecipes: tool({
      description:
        'Search recipes by keyword matching against name, category, cuisine, or description',
      inputSchema: z.object({
        query: z.string().describe('Search keyword for recipes'),
      }),
      execute: async ({ query }) => {
        const db: any = createServerClient()
        // Use ilike on name; also check category and cuisine
        const { data: recipes } = await db
          .from('recipes')
          .select(
            'id, name, category, cuisine, meal_type, servings, prep_time_minutes, cook_time_minutes, description'
          )
          .eq('tenant_id', tenantId)
          .or(
            `name.ilike.%${query}%,category.ilike.%${query}%,cuisine.ilike.%${query}%,description.ilike.%${query}%`
          )
          .is('deleted_at' as any, null)
          .limit(10)

        if (!recipes || recipes.length === 0) {
          return { found: false, message: `No recipes found matching "${query}"` }
        }

        return {
          found: true,
          count: recipes.length,
          recipes: recipes.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            cuisine: r.cuisine,
            mealType: r.meal_type,
            servings: r.servings,
            prepMinutes: r.prep_time_minutes,
            cookMinutes: r.cook_time_minutes,
            description: r.description?.slice(0, 200),
          })),
        }
      },
    }),

    getEventDetails: tool({
      description:
        'Get full details of an event by its ID, including client name, menu, status, and financial info',
      inputSchema: z.object({
        eventRef: z.string().describe('Event ID (UUID) to look up'),
      }),
      execute: async ({ eventRef }) => {
        const db: any = createServerClient()
        const { data: event } = await db
          .from('events')
          .select(
            'id, occasion, event_date, event_time, status, guest_count, location, notes, client_id, menu_id, total_amount, deposit_amount'
          )
          .eq('tenant_id', tenantId)
          .eq('id', eventRef)
          .is('deleted_at' as any, null)
          .maybeSingle()

        if (!event) {
          return { found: false, message: `No event found with ID "${eventRef}"` }
        }

        // Get client name
        let clientName = 'Unknown'
        if (event.client_id) {
          const { data: client } = await db
            .from('clients')
            .select('full_name')
            .eq('id', event.client_id)
            .single()
          if (client) clientName = client.full_name
        }

        // Get menu name
        let menuName = null
        if (event.menu_id) {
          const { data: menu } = await db
            .from('menus')
            .select('name')
            .eq('id', event.menu_id)
            .single()
          if (menu) menuName = menu.name
        }

        return {
          found: true,
          event: {
            id: event.id,
            occasion: event.occasion,
            date: event.event_date,
            time: event.event_time,
            status: event.status,
            guestCount: event.guest_count,
            location: event.location,
            notes: event.notes,
            clientName,
            menuName,
            totalAmount: event.total_amount,
            depositAmount: event.deposit_amount,
          },
        }
      },
    }),

    draftEmail: tool({
      description:
        'Draft an email to a client. This creates a draft that the chef must review and approve before sending. Returns a preview for approval.',
      inputSchema: z.object({
        clientName: z.string().describe('Name of the client to email'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body text'),
      }),
      execute: async ({ clientName, subject, body }) => {
        // Look up client email
        const db: any = createServerClient()
        const { data: client } = await db
          .from('clients')
          .select('id, full_name, email')
          .eq('tenant_id', tenantId)
          .ilike('full_name', `%${clientName}%`)
          .limit(1)
          .maybeSingle()

        if (!client) {
          return {
            needsApproval: true,
            success: false,
            error: `Could not find client "${clientName}". Please verify the name.`,
          }
        }

        if (!client.email) {
          return {
            needsApproval: true,
            success: false,
            error: `${client.full_name} does not have an email address on file.`,
          }
        }

        // Return draft preview for chef approval (do NOT send)
        return {
          needsApproval: true,
          success: true,
          draft: {
            to: client.email,
            toName: client.full_name,
            subject,
            body,
          },
          message: `Draft ready for ${client.full_name} (${client.email}). Review and approve to send.`,
        }
      },
    }),

    lookupPrice: tool({
      description:
        'Look up the current market price for an ingredient using the pricing intelligence engine',
      inputSchema: z.object({
        ingredient: z.string().describe('Ingredient name to look up price for'),
      }),
      execute: async ({ ingredient }) => {
        try {
          const { lookupPrice: priceLookup } = await import('@/lib/pricing/pi-bridge')
          const result = await priceLookup(ingredient)

          if (!result) {
            return {
              found: false,
              message: `No price data found for "${ingredient}". The ingredient may not be in the pricing database yet.`,
            }
          }

          return {
            found: true,
            ingredient,
            price: result,
          }
        } catch {
          return {
            found: false,
            message: `Price lookup is currently unavailable. The Pi bridge may be offline.`,
          }
        }
      },
    }),

    searchMemories: tool({
      description:
        'Search chef memories for relevant facts about a topic, person, preference, or business rule',
      inputSchema: z.object({
        query: z.string().describe('Topic or person to search memories for'),
      }),
      execute: async ({ query }) => {
        try {
          // Use existing memory loading which handles keyword + category matching
          const { loadRelevantMemories } = await import('@/lib/ai/remy-memory-actions')
          const memories = await loadRelevantMemories(query)

          if (!memories || memories.length === 0) {
            return { found: false, message: `No memories found related to "${query}"` }
          }

          return {
            found: true,
            count: memories.length,
            memories: memories.slice(0, 10).map((m) => ({
              category: m.category,
              content: m.content,
              importance: m.importance,
              relatedClientName: m.relatedClientName,
            })),
          }
        } catch {
          return { found: false, message: 'Memory search is temporarily unavailable.' }
        }
      },
    }),

    sourceIngredient: tool({
      description:
        'Start a voice sourcing session to call vendors about an ingredient. Requires the supplier_calling feature flag.',
      inputSchema: z.object({
        ingredientName: z.string().describe('Name of the ingredient to source'),
        eventId: z.string().optional().describe('Optional event ID to associate with the sourcing session'),
      }),
      execute: async ({ ingredientName, eventId }) => {
        try {
          // Check supplier_calling feature flag
          const db: any = createServerClient()
          const { data: flagData } = await db
            .from('chef_feature_flags')
            .select('enabled')
            .eq('chef_id', tenantId)
            .eq('flag_name', 'supplier_calling')
            .maybeSingle()

          if (!flagData?.enabled) {
            return {
              success: false,
              message: 'Voice sourcing is not enabled for your account.',
            }
          }

          // Resolve ingredient to get vendor call candidates
          const { resolveIngredientAvailability } = await import(
            '@/lib/calling/ingredient-resolution'
          )
          const resolution = await resolveIngredientAvailability(ingredientName)

          if (resolution.unresolved.length === 0) {
            return {
              success: false,
              message: `No vendors to call for "${ingredientName}". Data already available at tier ${resolution.confidenceLevel}.`,
            }
          }

          // Build candidates from unresolved vendors
          const candidates = resolution.unresolved.slice(0, 5).map((v, idx) => ({
            vendorId: v.id || undefined,
            vendorName: v.name,
            vendorPhone: v.phone,
            vendorType: (v.source === 'saved' ? 'saved' : 'directory') as 'saved' | 'directory',
            priorityOrder: idx + 1,
          }))

          const { createSourcingSession } = await import(
            '@/lib/calling/sourcing-session-actions'
          )
          const result = await createSourcingSession({
            ingredientQuery: ingredientName,
            candidates,
          })

          if (!result.success) {
            return { success: false, message: result.error || 'Failed to create sourcing session.' }
          }

          return {
            success: true,
            sessionId: result.data?.sessionId,
            candidateCount: result.data?.candidateCount,
            message: `Started sourcing session for ${ingredientName}. I'll call vendors to check availability.`,
          }
        } catch (err) {
          return {
            success: false,
            message: 'Failed to start sourcing session. Please try again.',
          }
        }
      },
    }),

    checkIngredientAvailability: tool({
      description:
        'Check ingredient availability across all data sources without making any calls. Returns a confidence tier and summary.',
      inputSchema: z.object({
        ingredientName: z.string().describe('Name of the ingredient to check availability for'),
      }),
      execute: async ({ ingredientName }) => {
        try {
          const { resolveIngredientAvailability } = await import(
            '@/lib/calling/ingredient-resolution'
          )
          const resolution = await resolveIngredientAvailability(ingredientName)

          // Tier 1: resolved with recent price data
          if (resolution.resolvedCount > 0) {
            const best = resolution.resolved[0]
            const priceStr = `$${(best.priceCents / 100).toFixed(2)}`
            const source = `${best.chainName} (${best.city})`
            return {
              tier: 1,
              confidence: resolution.confidenceLevel,
              message: `Available: found recent price data at ${priceStr} from ${source}`,
              resolvedCount: resolution.resolvedCount,
              partialCount: resolution.partialCount,
            }
          }

          // Tier 2: partial signals (stale data or vendor price points)
          if (resolution.partialCount > 0) {
            const best = resolution.partial[0]
            const priceStr = best.priceCents
              ? `$${(best.priceCents / 100).toFixed(2)}`
              : 'unknown price'
            return {
              tier: 2,
              confidence: resolution.confidenceLevel,
              message: `Likely available: have older data suggesting ${priceStr}. May want to verify.`,
              partialCount: resolution.partialCount,
              unresolvedCount: resolution.unresolvedCount,
            }
          }

          // Tier 3: unresolved
          return {
            tier: 3,
            confidence: resolution.confidenceLevel,
            message: 'Unresolved: no recent data. Want me to start a sourcing call?',
            unresolvedCount: resolution.unresolvedCount,
          }
        } catch {
          return {
            tier: 3,
            confidence: 'none' as const,
            message: 'Availability check failed. The data sources may be offline.',
          }
        }
      },
    }),
  }
}

/**
 * Read-only subset of tools for circle surface.
 * No email drafting, no memory search (circle members can't access chef memories).
 */
export function buildCircleTools(tenantId: string) {
  const full = buildRemyTools(tenantId)
  return {
    checkCalendar: full.checkCalendar,
    searchRecipes: full.searchRecipes,
    getEventDetails: full.getEventDetails,
    lookupPrice: full.lookupPrice,
  }
}
