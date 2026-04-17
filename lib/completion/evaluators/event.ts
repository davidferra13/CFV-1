// Completion Evaluator - Event
// Wraps readiness gates, financial summary, critical path, and recursive deps.
// Most complex evaluator: checks client, menu, financial, logistics in one pass.
// 21 requirements across safety, financial, culinary, logistics, profile, communication.

import { pgClient } from '@/lib/db/index'
import { getClientProfileCompleteness } from '@/lib/clients/completeness'
import { evaluateMenu } from './menu'
import { evaluateClient } from './client'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

interface EventRow {
  id: string
  occasion: string | null
  event_date: string | null
  serve_time: string | null
  location_address: string | null
  guest_count: string | null
  client_id: string | null
  menu_id: string | null
  status: string
  access_instructions: string | null
  grocery_list_ready: boolean | null
  prep_list_ready: boolean | null
  packing_list_ready: boolean | null
  aar_filed: boolean | null
}

interface FinancialRow {
  total_paid_cents: string | null
  outstanding_balance_cents: string | null
  quoted_price_cents: string | null
  food_cost_percentage: string | null
}

interface ClientRow {
  id: string
  full_name: string | null
  allergies: string[] | null
  email: string | null
  phone: string | null
}

export async function evaluateEvent(
  eventId: string,
  tenantId: string,
  opts?: { shallow?: boolean }
): Promise<CompletionResult | null> {
  // Batch: event + financial summary in one round
  const [event] = await pgClient<EventRow[]>`
    SELECT id, occasion, event_date, serve_time, location_address, guest_count,
           client_id, menu_id, status, access_instructions,
           grocery_list_ready, prep_list_ready, packing_list_ready,
           aar_filed
    FROM events
    WHERE id = ${eventId} AND tenant_id = ${tenantId}
  `
  if (!event) return null

  const [financial] = await pgClient<FinancialRow[]>`
    SELECT total_paid_cents::text, outstanding_balance_cents::text,
           quoted_price_cents::text, food_cost_percentage::text
    FROM event_financial_summary
    WHERE event_id = ${eventId}
  `

  // Client check
  let clientResult: CompletionResult | null = null
  let clientAllergyConfirmed = false
  let clientProfileAdequate = false
  if (event.client_id) {
    if (!opts?.shallow) {
      clientResult = await evaluateClient(event.client_id, tenantId)
      clientProfileAdequate = (clientResult?.score || 0) >= 60
    } else {
      const [client] = await pgClient<ClientRow[]>`
        SELECT id, full_name, allergies, email, phone
        FROM clients
        WHERE id = ${event.client_id} AND tenant_id = ${tenantId}
      `
      if (client) {
        const profile = getClientProfileCompleteness(client)
        clientProfileAdequate = profile.score >= 60
        clientAllergyConfirmed = Array.isArray(client.allergies) && client.allergies.length > 0
      }
    }
    if (clientResult) {
      const allergyReq = clientResult.requirements.find((r) => r.key === 'allergies')
      clientAllergyConfirmed = allergyReq?.met ?? false
    }
  }

  // Menu check
  let menuResult: CompletionResult | null = null
  let menuComplete = false
  if (event.menu_id) {
    menuResult = await evaluateMenu(event.menu_id, tenantId, { shallow: opts?.shallow })
    menuComplete = (menuResult?.score || 0) >= 80
  }

  // Quote check
  const [quoteCheck] = await pgClient<{ has_quote: string }[]>`
    SELECT COUNT(*)::text AS has_quote
    FROM quotes
    WHERE event_id = ${eventId} AND tenant_id = ${tenantId}
      AND status IN ('sent', 'accepted')
  `

  // Allergen cross-check: client allergens vs menu recipe allergen flags
  // Chain: menus -> dishes -> components -> recipes
  let allergenConflict = false
  let allergenCheckApplicable = false
  if (event.client_id && event.menu_id) {
    const [conflict] = await pgClient<{ conflict_count: string }[]>`
      SELECT COUNT(*)::text AS conflict_count
      FROM client_allergy_records car
      WHERE car.client_id = ${event.client_id}
        AND LOWER(car.allergen) = ANY(
          SELECT LOWER(unnest(r.allergen_flags))
          FROM dishes d
          JOIN components c ON c.dish_id = d.id
          JOIN recipes r ON r.id = c.recipe_id
          WHERE d.menu_id = ${event.menu_id}
            AND r.allergen_flags IS NOT NULL
        )
    `
    allergenCheckApplicable = true
    allergenConflict = Number(conflict?.conflict_count || 0) > 0
  }

  // Document + receipt counts
  const [docCheck] = await pgClient<{ doc_count: string }[]>`
    SELECT COUNT(*)::text AS doc_count
    FROM chef_documents
    WHERE event_id = ${eventId} AND tenant_id = ${tenantId}
  `
  const [receiptCheck] = await pgClient<{ receipt_count: string }[]>`
    SELECT COUNT(*)::text AS receipt_count
    FROM receipt_photos
    WHERE event_id = ${eventId} AND tenant_id = ${tenantId}
  `

  const totalPaid = Number(financial?.total_paid_cents || 0)
  const outstanding = Number(financial?.outstanding_balance_cents || 0)
  const quotedPrice = Number(financial?.quoted_price_cents || 0)
  const foodCostPct = Number(financial?.food_cost_percentage || 0)
  const hasLocation = !!event.location_address && event.location_address.trim().length > 0
  const hasServeTime = !!event.serve_time && event.serve_time.trim().length > 0
  const hasAccessInstructions =
    !!event.access_instructions && event.access_instructions.trim().length > 0
  const hasDocuments = Number(docCheck?.doc_count || 0) > 0
  const hasReceipts = Number(receiptCheck?.receipt_count || 0) > 0
  // Budget yellow flag: food cost > 50% of quoted price signals overspend
  const budgetAligned = quotedPrice <= 0 || foodCostPct <= 50
  const eventUrl = `/events/${eventId}`

  const reqs: CompletionRequirement[] = [
    // --- Profile (10 pts) ---
    {
      key: 'client_linked',
      label: 'Client linked',
      met: !!event.client_id,
      blocking: true,
      weight: 5,
      category: 'profile',
      actionUrl: eventUrl,
      actionLabel: 'Link client',
    },
    {
      key: 'client_profile',
      label: 'Client profile adequate',
      met: clientProfileAdequate,
      blocking: false,
      weight: 5,
      category: 'profile',
      actionUrl: event.client_id ? `/clients/${event.client_id}` : undefined,
      actionLabel: 'Complete client profile',
    },
    // --- Safety (13 pts) ---
    {
      key: 'allergies',
      label: 'Client allergies confirmed',
      met: clientAllergyConfirmed,
      blocking: true,
      weight: 8,
      category: 'safety',
      actionUrl: event.client_id ? `/clients/${event.client_id}` : undefined,
      actionLabel: 'Confirm allergies',
    },
    {
      key: 'allergen_crosscheck',
      label: 'Menu clear of client allergens',
      met: allergenCheckApplicable ? !allergenConflict : true,
      blocking: false,
      weight: 5,
      category: 'safety',
      actionUrl: event.menu_id ? `/menus/${event.menu_id}` : undefined,
      actionLabel: 'Review allergen conflicts',
    },
    // --- Logistics (25 pts) ---
    {
      key: 'date',
      label: 'Date confirmed',
      met: !!event.event_date,
      blocking: true,
      weight: 5,
      category: 'logistics',
      actionUrl: eventUrl,
      actionLabel: 'Set event date',
    },
    {
      key: 'serve_time',
      label: 'Service time set',
      met: hasServeTime,
      blocking: true,
      weight: 4,
      category: 'logistics',
      actionUrl: eventUrl,
      actionLabel: 'Set service time',
    },
    {
      key: 'location',
      label: 'Location confirmed',
      met: hasLocation,
      blocking: true,
      weight: 5,
      category: 'logistics',
      actionUrl: eventUrl,
      actionLabel: 'Set location',
    },
    {
      key: 'guest_count',
      label: 'Guest count set',
      met: Number(event.guest_count) > 0,
      blocking: true,
      weight: 5,
      category: 'logistics',
      actionUrl: eventUrl,
      actionLabel: 'Set guest count',
    },
    {
      key: 'access_instructions',
      label: 'Arrival/access instructions',
      met: hasAccessInstructions,
      blocking: false,
      weight: 3,
      category: 'logistics',
      actionUrl: eventUrl,
      actionLabel: 'Add access notes',
    },
    {
      key: 'documents',
      label: 'Documents generated',
      met: hasDocuments,
      blocking: false,
      weight: 3,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Generate documents',
    },
    // --- Culinary (21 pts) ---
    {
      key: 'menu_linked',
      label: 'Menu linked',
      met: !!event.menu_id,
      blocking: true,
      weight: 8,
      category: 'culinary',
      actionUrl: eventUrl,
      actionLabel: 'Link menu',
    },
    {
      key: 'menu_complete',
      label: 'Menu complete',
      met: menuComplete,
      blocking: false,
      weight: 8,
      category: 'culinary',
      actionUrl: event.menu_id ? `/menus/${event.menu_id}` : undefined,
      actionLabel: 'Complete menu',
    },
    {
      key: 'grocery_ready',
      label: 'Grocery list ready',
      met: !!event.grocery_list_ready,
      blocking: false,
      weight: 5,
      category: 'culinary',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Prepare grocery list',
    },
    // --- Financial (20 pts) ---
    {
      key: 'quote_exists',
      label: 'Quote/pricing exists',
      met: Number(quoteCheck?.has_quote || 0) > 0,
      blocking: false,
      weight: 7,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Create quote',
    },
    {
      key: 'deposit',
      label: 'Deposit collected',
      met: totalPaid > 0,
      blocking: false,
      weight: 7,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Record payment',
    },
    {
      key: 'budget_aligned',
      label: 'Budget on track',
      met: budgetAligned,
      blocking: false,
      weight: 3,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Review food costs',
    },
    {
      key: 'financial_reconciled',
      label: 'Financially reconciled',
      met: outstanding === 0 && totalPaid > 0,
      blocking: false,
      weight: 3,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Reconcile',
    },
    // --- Prep & Packing (6 pts) ---
    {
      key: 'prep_ready',
      label: 'Prep list ready',
      met: !!event.prep_list_ready,
      blocking: false,
      weight: 3,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Prepare prep list',
    },
    {
      key: 'packing_ready',
      label: 'Packing reviewed',
      met: !!event.packing_list_ready,
      blocking: false,
      weight: 3,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Review packing',
    },
    // --- Post-event close-out (5 pts) ---
    {
      key: 'aar_filed',
      label: 'After-action review filed',
      met: !!event.aar_filed,
      blocking: false,
      weight: 3,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=aar`,
      actionLabel: 'File AAR',
    },
    {
      key: 'receipts_uploaded',
      label: 'Receipts uploaded',
      met: hasReceipts,
      blocking: false,
      weight: 2,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Upload receipts',
    },
  ]

  const children: CompletionResult[] = []
  if (clientResult) children.push(clientResult)
  if (menuResult) children.push(menuResult)

  return buildResult('event', eventId, reqs, {
    entityLabel: event.occasion || 'Untitled event',
    children: children.length > 0 ? children : undefined,
  })
}
