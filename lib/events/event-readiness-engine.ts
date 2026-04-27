'use server'

import { unstable_cache, revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReadinessCheckKey =
  | 'menu_finalized'
  | 'client_confirmed'
  | 'payment_status_valid'
  | 'allergies_reviewed'
  | 'ingredients_sourced'
  | 'equipment_ready'
  | 'staff_assigned'
  | 'timeline_defined'

export type ReadinessCheckStatus = 'pass' | 'fail' | 'warning'

export type ReadinessCheck = {
  key: ReadinessCheckKey
  label: string
  status: ReadinessCheckStatus
  blocking: boolean
  message: string
  fixRoute: string
  fixLabel: string
}

export type ReadinessOverallStatus = 'READY' | 'AT_RISK' | 'NOT_READY'

export type EventReadinessResult = {
  eventId: string
  overallStatus: ReadinessOverallStatus
  score: number
  totalChecks: number
  passedChecks: number
  checks: ReadinessCheck[]
  blockers: ReadinessCheck[]
  warnings: ReadinessCheck[]
  evaluatedAt: string
}

// ─── Check Definitions ───────────────────────────────────────────────────────

const CHECK_DEFS: Array<{
  key: ReadinessCheckKey
  label: string
  blocking: boolean
  fixLabel: string
  fixRoute: (eventId: string) => string
}> = [
  {
    key: 'menu_finalized',
    label: 'Menu Finalized',
    blocking: true,
    fixLabel: 'Open Menu Editor',
    fixRoute: (eid) => `/events/${eid}?tab=overview#menu`,
  },
  {
    key: 'client_confirmed',
    label: 'Client Confirmed',
    blocking: true,
    fixLabel: 'View Event Status',
    fixRoute: (eid) => `/events/${eid}`,
  },
  {
    key: 'payment_status_valid',
    label: 'Payment Received',
    blocking: true,
    fixLabel: 'Record Payment',
    fixRoute: (eid) => `/events/${eid}?tab=money`,
  },
  {
    key: 'allergies_reviewed',
    label: 'Allergies Reviewed',
    blocking: true,
    fixLabel: 'Review Allergies',
    fixRoute: (eid) => `/events/${eid}?tab=ops#dietary`,
  },
  {
    key: 'ingredients_sourced',
    label: 'Ingredients Sourced',
    blocking: true,
    fixLabel: 'Open Grocery List',
    fixRoute: (eid) => `/events/${eid}/grocery-quote`,
  },
  {
    key: 'equipment_ready',
    label: 'Equipment Ready',
    blocking: false,
    fixLabel: 'Equipment Checklist',
    fixRoute: (eid) => `/events/${eid}?tab=ops#equipment`,
  },
  {
    key: 'staff_assigned',
    label: 'Staff Assigned',
    blocking: false,
    fixLabel: 'Assign Staff',
    fixRoute: (eid) => `/events/${eid}?tab=ops#staff`,
  },
  {
    key: 'timeline_defined',
    label: 'Timeline Defined',
    blocking: true,
    fixLabel: 'Build Timeline',
    fixRoute: (eid) => `/events/${eid}?tab=prep`,
  },
]

// ─── Evaluator (Pure Logic) ──────────────────────────────────────────────────

type EventRow = {
  id: string
  tenant_id: string
  status: string
  event_date: string
  guest_count: number
  allergies: string[] | null
  dietary_restrictions: string[] | null
  quoted_price_cents: number | null
  payment_status: string | null
  grocery_list_ready: boolean
  equipment_list_ready: boolean
  timeline_ready: boolean
  non_negotiables_checked: boolean
  shopping_completed_at: string | null
  client_id: string
}

async function runChecks(db: any, event: EventRow, tenantId: string): Promise<ReadinessCheck[]> {
  const eventId = event.id
  const checks: ReadinessCheck[] = []

  // 1. Menu Finalized: at least one menu attached with status 'locked' or 'shared'
  const { data: menus } = await db
    .from('menus')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const menuList = (menus ?? []) as Array<{ id: string; status: string }>
  const hasMenu = menuList.length > 0
  const hasLockedMenu = menuList.some((m) => m.status === 'locked')
  const hasSharedMenu = menuList.some((m) => m.status === 'shared')

  checks.push(
    buildCheck(
      'menu_finalized',
      eventId,
      hasLockedMenu ? 'pass' : hasSharedMenu ? 'warning' : hasMenu ? 'warning' : 'fail',
      !hasMenu
        ? 'No menu attached to this event'
        : hasLockedMenu
          ? 'Menu is locked and finalized'
          : hasSharedMenu
            ? 'Menu shared but not locked'
            : 'Menu is still in draft'
    )
  )

  // 2. Client Confirmed: event status is at least 'accepted'
  const confirmedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
  const clientConfirmed = confirmedStatuses.includes(event.status)

  checks.push(
    buildCheck(
      'client_confirmed',
      eventId,
      clientConfirmed ? 'pass' : event.status === 'proposed' ? 'warning' : 'fail',
      clientConfirmed
        ? 'Client has confirmed'
        : event.status === 'proposed'
          ? 'Proposal sent, awaiting client response'
          : 'Event is still in draft'
    )
  )

  // 3. Payment Status Valid: deposit_paid, partial, or paid
  const validPaymentStatuses = ['deposit_paid', 'partial', 'paid']
  const paymentOk = validPaymentStatuses.includes(event.payment_status ?? '')

  checks.push(
    buildCheck(
      'payment_status_valid',
      eventId,
      paymentOk
        ? 'pass'
        : event.payment_status === 'unpaid' && event.quoted_price_cents
          ? 'fail'
          : 'warning',
      paymentOk
        ? `Payment status: ${event.payment_status}`
        : event.quoted_price_cents
          ? 'No payment recorded yet'
          : 'No quoted price set'
    )
  )

  // 4. Allergies Reviewed: event has allergies/dietary set, or client has them,
  //    or non_negotiables_checked is true (chef acknowledged)
  const eventAllergies = (event.allergies ?? []).length + (event.dietary_restrictions ?? []).length

  const { data: clientRow } = await db
    .from('clients')
    .select('allergies, dietary_restrictions')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .single()

  const clientAllergies =
    ((clientRow?.allergies ?? []) as string[]).length +
    ((clientRow?.dietary_restrictions ?? []) as string[]).length
  const totalAllergyData = eventAllergies + clientAllergies

  checks.push(
    buildCheck(
      'allergies_reviewed',
      eventId,
      event.non_negotiables_checked ? 'pass' : totalAllergyData > 0 ? 'warning' : 'pass',
      event.non_negotiables_checked
        ? 'Allergies reviewed and acknowledged'
        : totalAllergyData > 0
          ? `${totalAllergyData} allergy/dietary item(s) not yet reviewed`
          : 'No known allergies or dietary restrictions'
    )
  )

  // 5. Ingredients Sourced: grocery_list_ready or shopping_completed_at is set
  const ingredientsOk = event.grocery_list_ready || !!event.shopping_completed_at

  // Also check if a shopping list exists for this event
  const { data: shoppingLists } = await db
    .from('shopping_lists')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .limit(1)

  const hasShoppingList = (shoppingLists ?? []).length > 0

  checks.push(
    buildCheck(
      'ingredients_sourced',
      eventId,
      ingredientsOk ? 'pass' : hasShoppingList ? 'warning' : hasMenu ? 'fail' : 'fail',
      ingredientsOk
        ? 'Shopping completed'
        : hasShoppingList
          ? 'Shopping list created but not completed'
          : hasMenu
            ? 'No shopping list created yet'
            : 'Need a menu before sourcing ingredients'
    )
  )

  // 6. Equipment Ready: equipment_list_ready flag or checklist items exist and are packed
  if (event.equipment_list_ready) {
    checks.push(buildCheck('equipment_ready', eventId, 'pass', 'Equipment list marked ready'))
  } else {
    const { data: eqItems } = await db
      .from('event_equipment_checklist')
      .select('id, packed')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)

    const eqList = (eqItems ?? []) as Array<{ id: string; packed: boolean }>
    const allPacked = eqList.length > 0 && eqList.every((item) => item.packed)

    checks.push(
      buildCheck(
        'equipment_ready',
        eventId,
        allPacked ? 'pass' : eqList.length > 0 ? 'warning' : 'warning',
        allPacked
          ? 'All equipment packed'
          : eqList.length > 0
            ? `${eqList.filter((i) => !i.packed).length} items not yet packed`
            : 'No equipment checklist created'
      )
    )
  }

  // 7. Staff Assigned: any staff assignments exist for this event (warning, not blocking)
  const { data: staffRows } = await db
    .from('event_staff_assignments')
    .select('id')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .limit(1)

  const hasStaff = (staffRows ?? []).length > 0

  checks.push(
    buildCheck(
      'staff_assigned',
      eventId,
      hasStaff ? 'pass' : 'warning',
      hasStaff ? 'Staff assigned' : 'No staff assigned (solo event?)'
    )
  )

  // 8. Timeline Defined: timeline_ready flag or prep blocks exist
  if (event.timeline_ready) {
    checks.push(buildCheck('timeline_defined', eventId, 'pass', 'Timeline marked ready'))
  } else {
    const { data: prepBlocks } = await db
      .from('event_prep_blocks')
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .limit(1)

    const hasPrepBlocks = (prepBlocks ?? []).length > 0

    checks.push(
      buildCheck(
        'timeline_defined',
        eventId,
        hasPrepBlocks ? 'warning' : 'fail',
        hasPrepBlocks ? 'Prep blocks exist but timeline not finalized' : 'No prep timeline created'
      )
    )
  }

  return checks
}

function buildCheck(
  key: ReadinessCheckKey,
  eventId: string,
  status: ReadinessCheckStatus,
  message: string
): ReadinessCheck {
  const def = CHECK_DEFS.find((d) => d.key === key)!
  return {
    key,
    label: def.label,
    status,
    blocking: def.blocking,
    message,
    fixRoute: def.fixRoute(eventId),
    fixLabel: def.fixLabel,
  }
}

function computeOverall(checks: ReadinessCheck[]): {
  status: ReadinessOverallStatus
  score: number
  passed: number
} {
  const passed = checks.filter((c) => c.status === 'pass').length
  const score = Math.round((passed / checks.length) * 100)
  const hasBlockingFail = checks.some((c) => c.blocking && c.status === 'fail')

  if (hasBlockingFail) return { status: 'NOT_READY', score, passed }
  if (passed === checks.length) return { status: 'READY', score, passed }
  return { status: 'AT_RISK', score, passed }
}

// ─── Persist Checks ──────────────────────────────────────────────────────────

async function persistChecks(db: any, eventId: string, tenantId: string, checks: ReadinessCheck[]) {
  const rows = checks.map((c) => ({
    tenant_id: tenantId,
    event_id: eventId,
    check_key: c.key,
    status: c.status,
    blocking: c.blocking,
    message: c.message,
    updated_at: new Date().toISOString(),
  }))

  // Upsert all checks
  const { error } = await db
    .from('event_readiness_checks')
    .upsert(rows, { onConflict: 'event_id,check_key' })

  if (error) {
    // Table might not exist yet; log and continue
    console.error('[event-readiness-engine] persist failed:', error.message)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function evaluateEventReadiness(eventId: string): Promise<EventReadinessResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event
  const { data: event, error } = await db
    .from('events')
    .select(
      `
      id, tenant_id, status, event_date, guest_count,
      allergies, dietary_restrictions,
      quoted_price_cents, payment_status,
      grocery_list_ready, equipment_list_ready, timeline_ready,
      non_negotiables_checked, shopping_completed_at, client_id
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  const checks = await runChecks(db, event as EventRow, tenantId)
  const { status, score, passed } = computeOverall(checks)

  // Persist (non-blocking)
  try {
    await persistChecks(db, eventId, tenantId, checks)
  } catch (err) {
    console.error('[event-readiness-engine] persist failed (non-blocking)', err)
  }

  // Bust cache
  revalidateTag(`event-readiness:${eventId}`)

  return {
    eventId,
    overallStatus: status,
    score,
    totalChecks: checks.length,
    passedChecks: passed,
    checks,
    blockers: checks.filter((c) => c.blocking && c.status === 'fail'),
    warnings: checks.filter((c) => c.status === 'warning'),
    evaluatedAt: new Date().toISOString(),
  }
}

// Cached read (for rendering; does NOT re-evaluate)
export async function getCachedEventReadiness(
  eventId: string
): Promise<EventReadinessResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  return unstable_cache(
    async () => {
      const db: any = createServerClient({ admin: true })

      const { data: rows } = await db
        .from('event_readiness_checks')
        .select('check_key, status, blocking, message, updated_at')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)

      if (!rows || rows.length === 0) return null

      const checks: ReadinessCheck[] = (rows as any[]).map((row) => {
        const def = CHECK_DEFS.find((d) => d.key === row.check_key)
        return {
          key: row.check_key as ReadinessCheckKey,
          label: def?.label ?? row.check_key,
          status: row.status as ReadinessCheckStatus,
          blocking: row.blocking,
          message: row.message ?? '',
          fixRoute: def?.fixRoute(eventId) ?? `/events/${eventId}`,
          fixLabel: def?.fixLabel ?? 'Fix',
        }
      })

      const { status, score, passed } = computeOverall(checks)

      return {
        eventId,
        overallStatus: status,
        score,
        totalChecks: checks.length,
        passedChecks: passed,
        checks,
        blockers: checks.filter((c) => c.blocking && c.status === 'fail'),
        warnings: checks.filter((c) => c.status === 'warning'),
        evaluatedAt: (rows as any[])[0]?.updated_at ?? new Date().toISOString(),
      }
    },
    [`event-readiness`, eventId],
    { tags: [`event-readiness:${eventId}`], revalidate: 300 }
  )()
}

// Evaluate-or-read: evaluate if no cached result, otherwise return cached
export async function getOrEvaluateEventReadiness(eventId: string): Promise<EventReadinessResult> {
  const cached = await getCachedEventReadiness(eventId)
  if (cached) return cached
  return evaluateEventReadiness(eventId)
}
