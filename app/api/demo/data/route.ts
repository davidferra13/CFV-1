// Demo Data Load/Clear Endpoint
// Loads or clears demo data from the browser-based control panel.
// Only active when DEMO_MODE_ENABLED=true.
//
// For large operations, prefer the CLI scripts:
//   npm run demo:load / demo:clear / demo:reset

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

import {
  DEMO_CLIENTS,
  DEMO_EVENTS,
  DEMO_INQUIRIES,
  DEMO_MENUS,
  DEMO_RECIPES,
  DEMO_QUOTES,
  DEMO_LEDGER_ENTRIES,
  DEMO_EXPENSES,
  DEMO_CALENDAR_ENTRIES,
} from '@/lib/demo/fixtures'

import {
  ensureClient,
  ensureEvent,
  ensureInquiry,
  ensureMenu,
  ensureRecipe,
  ensureQuote,
  ensureLedgerEntry,
  ensureExpense,
  ensureCalendarEntry,
} from '@/lib/demo/seed-helpers'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden — demo endpoints are not available in production', {
      status: 403,
    })
  }
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return new NextResponse('Forbidden — DEMO_MODE_ENABLED is not set', { status: 403 })
  }

  // Require Origin header to match — blocks cross-origin CSRF
  const origin = req.headers.get('origin')
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return new NextResponse('Forbidden — cross-origin request', { status: 403 })
  }

  let action: 'load' | 'clear'
  try {
    const body = await req.json()
    action = body.action
    if (action !== 'load' && action !== 'clear') throw new Error('Invalid action')
  } catch {
    return new NextResponse('Bad Request — expected { action: "load" | "clear" }', { status: 400 })
  }

  let demoChef: { chefId: string; tenantId: string; authUserId: string }
  let demoClient: { clientId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    return new NextResponse('Demo credentials not found. Run: npm run demo:setup', { status: 500 })
  }
  try {
    demoClient = JSON.parse(readFileSync('.auth/demo-client.json', 'utf-8'))
  } catch {
    demoClient = { clientId: '' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    return new NextResponse('SUPABASE_SERVICE_ROLE_KEY not set', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { chefId, tenantId, authUserId } = demoChef

  if (action === 'clear') {
    // Delete in reverse dependency order
    const tables = [
      'ledger_entries',
      'expenses',
      'quotes',
      'dishes',
      'events',
      'inquiries',
      'menus',
      'recipes',
    ]

    let totalDeleted = 0
    for (const table of tables) {
      const { data } = await admin.from(table).delete().eq('tenant_id', tenantId).select('id')
      totalDeleted += data?.length ?? 0
    }

    // Calendar entries use chef_id
    const { data: calData } = await admin
      .from('chef_calendar_entries')
      .delete()
      .eq('chef_id', chefId)
      .select('id')
    totalDeleted += calData?.length ?? 0

    // Clients — preserve demo client account
    if (demoClient.clientId) {
      const { data: clientData } = await admin
        .from('clients')
        .delete()
        .eq('tenant_id', tenantId)
        .neq('id', demoClient.clientId)
        .select('id')
      totalDeleted += clientData?.length ?? 0
    } else {
      const { data: clientData } = await admin
        .from('clients')
        .delete()
        .eq('tenant_id', tenantId)
        .select('id')
      totalDeleted += clientData?.length ?? 0
    }

    return NextResponse.json({
      ok: true,
      message: `Cleared ${totalDeleted} rows from demo tenant`,
    })
  }

  // action === 'load'
  try {
    // 1. Clients
    const clientIds: string[] = []
    for (const client of DEMO_CLIENTS) {
      const id = await ensureClient(admin, tenantId, client)
      clientIds.push(id)
    }

    // 2. Inquiries
    for (const inquiry of DEMO_INQUIRIES) {
      await ensureInquiry(admin, tenantId, clientIds[inquiry.clientIndex], inquiry)
    }

    // 3. Events
    const eventIds: string[] = []
    for (const event of DEMO_EVENTS) {
      const id = await ensureEvent(admin, tenantId, clientIds[event.clientIndex], event)
      eventIds.push(id)
    }

    // 4. Menus
    for (const menu of DEMO_MENUS) {
      await ensureMenu(admin, tenantId, menu)
    }

    // 5. Recipes
    for (const recipe of DEMO_RECIPES) {
      await ensureRecipe(admin, tenantId, authUserId, recipe)
    }

    // 6. Quotes
    for (const quote of DEMO_QUOTES) {
      const event = DEMO_EVENTS[quote.eventIndex]
      await ensureQuote(
        admin,
        tenantId,
        clientIds[event.clientIndex],
        eventIds[quote.eventIndex],
        quote
      )
    }

    // 7. Ledger entries
    for (const entry of DEMO_LEDGER_ENTRIES) {
      const event = DEMO_EVENTS[entry.eventIndex]
      await ensureLedgerEntry(
        admin,
        tenantId,
        clientIds[event.clientIndex],
        eventIds[entry.eventIndex],
        entry
      )
    }

    // 8. Expenses
    for (const expense of DEMO_EXPENSES) {
      const eventId = expense.eventIndex !== null ? eventIds[expense.eventIndex] : null
      await ensureExpense(admin, tenantId, eventId, expense)
    }

    // 9. Calendar
    for (const entry of DEMO_CALENDAR_ENTRIES) {
      await ensureCalendarEntry(admin, chefId, entry)
    }

    return NextResponse.json({
      ok: true,
      message: `Loaded demo data: ${DEMO_CLIENTS.length} clients, ${DEMO_EVENTS.length} events, ${DEMO_MENUS.length} menus, ${DEMO_RECIPES.length} recipes, ${DEMO_QUOTES.length} quotes, ${DEMO_LEDGER_ENTRIES.length} ledger entries, ${DEMO_EXPENSES.length} expenses`,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error during data load' },
      { status: 500 }
    )
  }
}
