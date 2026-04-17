// Completion Evaluator - Event
// Wraps readiness gates, financial summary, critical path, and recursive deps.
// Most complex evaluator: checks client, menu, financial, logistics in one pass.

import { pgClient } from '@/lib/db/index'
import { getClientProfileCompleteness } from '@/lib/clients/completeness'
import { evaluateMenu } from './menu'
import { evaluateClient } from './client'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

interface EventRow {
  id: string
  title: string | null
  event_date: string | null
  location: string | null
  guest_count: string | null
  client_id: string | null
  menu_id: string | null
  status: string
  grocery_list_ready: boolean | null
  prep_list_ready: boolean | null
  packing_list_ready: boolean | null
  prep_sheet_generated_at: string | null
}

interface FinancialRow {
  total_paid_cents: string | null
  outstanding_balance_cents: string | null
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
    SELECT id, title, event_date, location, guest_count,
           client_id, menu_id, status,
           grocery_list_ready, prep_list_ready, packing_list_ready,
           prep_sheet_generated_at
    FROM events
    WHERE id = ${eventId} AND tenant_id = ${tenantId}
  `
  if (!event) return null

  const [financial] = await pgClient<FinancialRow[]>`
    SELECT total_paid_cents::text, outstanding_balance_cents::text
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

  const totalPaid = Number(financial?.total_paid_cents || 0)
  const outstanding = Number(financial?.outstanding_balance_cents || 0)
  const hasLocation = !!event.location && event.location.trim().length > 0
  const eventUrl = `/events/${eventId}`

  const reqs: CompletionRequirement[] = [
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
    {
      key: 'allergies',
      label: 'Client allergies confirmed',
      met: clientAllergyConfirmed,
      blocking: true,
      weight: 10,
      category: 'safety',
      actionUrl: event.client_id ? `/clients/${event.client_id}` : undefined,
      actionLabel: 'Confirm allergies',
    },
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
      key: 'menu_linked',
      label: 'Menu linked',
      met: !!event.menu_id,
      blocking: true,
      weight: 10,
      category: 'culinary',
      actionUrl: eventUrl,
      actionLabel: 'Link menu',
    },
    {
      key: 'menu_complete',
      label: 'Menu complete',
      met: menuComplete,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: event.menu_id ? `/menus/${event.menu_id}` : undefined,
      actionLabel: 'Complete menu',
    },
    {
      key: 'quote_exists',
      label: 'Quote/pricing exists',
      met: Number(quoteCheck?.has_quote || 0) > 0,
      blocking: false,
      weight: 10,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Create quote',
    },
    {
      key: 'deposit',
      label: 'Deposit collected',
      met: totalPaid > 0,
      blocking: false,
      weight: 10,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Record payment',
    },
    {
      key: 'financial_reconciled',
      label: 'Financially reconciled',
      met: outstanding === 0 && totalPaid > 0,
      blocking: false,
      weight: 5,
      category: 'financial',
      actionUrl: `/events/${eventId}?tab=money`,
      actionLabel: 'Reconcile',
    },
    {
      key: 'documents',
      label: 'Documents generated',
      met: !!event.prep_sheet_generated_at,
      blocking: false,
      weight: 5,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Generate documents',
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
    {
      key: 'prep_ready',
      label: 'Prep list ready',
      met: !!event.prep_list_ready,
      blocking: false,
      weight: 5,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Prepare prep list',
    },
    {
      key: 'packing_ready',
      label: 'Packing reviewed',
      met: !!event.packing_list_ready,
      blocking: false,
      weight: 5,
      category: 'logistics',
      actionUrl: `/events/${eventId}?tab=prep`,
      actionLabel: 'Review packing',
    },
  ]

  const children: CompletionResult[] = []
  if (clientResult) children.push(clientResult)
  if (menuResult) children.push(menuResult)

  return buildResult('event', eventId, reqs, {
    entityLabel: event.title || 'Untitled event',
    children: children.length > 0 ? children : undefined,
  })
}
