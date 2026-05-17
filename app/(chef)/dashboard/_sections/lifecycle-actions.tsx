// Lifecycle Action Layer - all event lifecycle candidate fetching and action surface rendering
// Moved from page.tsx during decomposition. Self-contained server component.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ActionSurfaceCard } from '@/components/dashboard/action-surface-card'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import type { DashboardWorkSurface, WorkStage } from '@/lib/workflow/types'
import { getAllPrepPrompts } from '@/lib/scheduling/actions'
import { autoSuggestEventBlocks } from '@/lib/scheduling/prep-block-actions'
import { getEventReadiness } from '@/lib/events/readiness'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { checkMenuAllergenConflicts } from '@/lib/dietary/cross-contamination-check'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { checkAssignmentConflict, getEventStaffRoster, listStaffMembers } from '@/lib/staff/actions'
import { eventsOverlapInTime } from '@/lib/staff/time-overlap'
import {
  type CollectBalanceCandidate,
  type CloseOutCandidate,
  type ExecutionNextCandidate,
  type MenuDecisionCandidate,
  type PrepFlowCandidate,
  type ProcurementCandidate,
  type ReceiptCaptureCandidate,
  type ResetNextCandidate,
  type SafetyCheckCandidate,
  type ServiceReadyCandidate,
  type TeamReadyCandidate,
  type TravelConfirmCandidate,
  type TrustLoopCandidate,
  resolveCollectBalanceTask,
  resolveCommitNextTask,
  resolveCloseOutNextTask,
  resolveExecutionNextTask,
  resolveFixMissingFactTask,
  resolveMenuDecisionTask,
  resolvePrepFlowTask,
  resolvePrepareNextTask,
  resolveProcurementNextTask,
  resolveReceiptCaptureTask,
  resolveResetNextTask,
  resolveSafetyCheckTask,
  resolveServiceReadyTask,
  resolveTeamReadyTask,
  resolveTravelConfirmTask,
  resolveTrustLoopNextTask,
} from '@/lib/events/view-types'
import {
  type RelationshipNextCandidate,
  resolveRelationshipNextTask,
} from '@/lib/clients/view-types'
import { getEventsNeedingClosure } from '@/lib/events/actions'
import { getEventTrustLoopState } from '@/lib/events/post-event-trust-loop-actions'
import { getNextBestActions } from '@/lib/clients/next-best-action'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/LifecycleActions] ${label} failed:`, err)
    return fallback
  }
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const raw of values) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function getDaysUntil(dateString: string): number {
  const target = new Date(`${dateString}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function getActionEventIdsFromWorkSurface(
  surface: DashboardWorkSurface,
  stages: WorkStage[]
): string[] {
  const allowedStages = new Set(stages)
  const seen = new Set<string>()
  const eventIds: string[] = []
  for (const item of [...surface.fragile, ...surface.preparable, ...surface.optionalEarly]) {
    if (!allowedStages.has(item.stage) || seen.has(item.eventId)) continue
    seen.add(item.eventId)
    eventIds.push(item.eventId)
  }
  return eventIds
}

async function getProcurementCandidates(
  workSurface: DashboardWorkSurface
): Promise<ProcurementCandidate[]> {
  const activeEventIds = getActionEventIdsFromWorkSurface(workSurface, ['grocery_list'])
  const user = await requireChef()
  const db: any = createServerClient()

  const [activeEventsResult, varianceQuotesResult] = await Promise.all([
    activeEventIds.length > 0
      ? db
          .from('events')
          .select(
            `
            id, occasion, event_date,
            client:clients(full_name)
          `
          )
          .eq('tenant_id', user.tenantId!)
          .is('deleted_at' as any, null)
          .in('id', activeEventIds)
      : Promise.resolve({ data: [] }),
    db
      .from('grocery_price_quotes')
      .select('event_id, created_at, actual_grocery_cost_cents, accuracy_delta_pct')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'complete')
      .not('actual_grocery_cost_cents', 'is', null)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const activeEvents = (activeEventsResult.data ?? []) as any[]
  const candidates = new Map<string, ProcurementCandidate>()

  const latestQuotes = await Promise.all(
    activeEvents.map(async (event) => ({
      eventId: event.id as string,
      quote: await getLatestGroceryQuote(event.id).catch(() => null),
    }))
  )

  const latestQuoteByEvent = new Map(latestQuotes.map((entry) => [entry.eventId, entry.quote]))

  for (const event of activeEvents) {
    const quote = latestQuoteByEvent.get(event.id) ?? null
    candidates.set(event.id, {
      id: event.id,
      occasion: event.occasion ?? null,
      event_date: event.event_date,
      client: (event.client as { full_name?: string } | null)?.full_name
        ? { full_name: (event.client as { full_name: string }).full_name }
        : null,
      needs_finalized_list: true,
      latest_quote_created_at: quote?.createdAt ?? null,
      actual_grocery_cost_cents: quote?.actualGroceryCostCents ?? null,
      accuracy_delta_pct: quote?.accuracyDeltaPct ?? null,
    })
  }

  const latestVarianceQuoteByEvent = new Map<
    string,
    {
      created_at: string | null
      actual_grocery_cost_cents: number | null
      accuracy_delta_pct: number | null
    }
  >()

  for (const row of (varianceQuotesResult.data ?? []) as any[]) {
    if (latestVarianceQuoteByEvent.has(row.event_id)) continue
    latestVarianceQuoteByEvent.set(row.event_id, {
      created_at: row.created_at ?? null,
      actual_grocery_cost_cents: row.actual_grocery_cost_cents ?? null,
      accuracy_delta_pct: row.accuracy_delta_pct != null ? Number(row.accuracy_delta_pct) : null,
    })
  }

  const varianceOnlyEventIds = Array.from(latestVarianceQuoteByEvent.keys()).filter(
    (eventId) => !candidates.has(eventId)
  )

  if (varianceOnlyEventIds.length > 0) {
    const { data: varianceEvents } = await db
      .from('events')
      .select(
        `
        id, occasion, event_date,
        client:clients(full_name)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .in('id', varianceOnlyEventIds)

    for (const event of (varianceEvents ?? []) as any[]) {
      const quote = latestVarianceQuoteByEvent.get(event.id)
      if (!quote) continue

      candidates.set(event.id, {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        needs_finalized_list: false,
        latest_quote_created_at: quote.created_at,
        actual_grocery_cost_cents: quote.actual_grocery_cost_cents,
        accuracy_delta_pct: quote.accuracy_delta_pct,
      })
    }
  }

  return Array.from(candidates.values())
}

async function getPrepFlowCandidates(
  workSurface: DashboardWorkSurface
): Promise<PrepFlowCandidate[]> {
  const stageEventIds = getActionEventIdsFromWorkSurface(workSurface, ['prep_list'])
  const stageEventIdSet = new Set(stageEventIds)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: prepBlocks, error } = await (db as any)
    .from('event_prep_blocks')
    .select('event_id, title, block_date, completed_at')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[Dashboard] prepFlowCandidates failed:', error)
    return []
  }

  const blocksByEvent = new Map<
    string,
    Array<{
      title: string | null
      block_date: string
      completed_at: string | null
    }>
  >()

  for (const row of (prepBlocks ?? []) as any[]) {
    if (!row.event_id) continue
    const current = blocksByEvent.get(row.event_id) ?? []
    current.push({
      title: row.title ?? null,
      block_date: row.block_date,
      completed_at: row.completed_at ?? null,
    })
    blocksByEvent.set(row.event_id, current)
  }

  const eventIds = Array.from(new Set([...stageEventIds, ...blocksByEvent.keys()]))
  if (eventIds.length === 0) return []

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('id', eventIds)
    .not('status', 'in', '("cancelled","completed")')

  if (eventsError || !events) {
    console.error('[Dashboard] prepFlowCandidates events failed:', eventsError)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const eventBlocks = (blocksByEvent.get(event.id) ?? []).slice()
      eventBlocks.sort((a, b) => a.block_date.localeCompare(b.block_date))

      const incompleteBlocks = eventBlocks.filter((block) => !block.completed_at)
      const dueIncompleteBlocks = incompleteBlocks.filter(
        (block) => getDaysUntil(block.block_date) <= 0
      )

      let suggestionCount = 0
      if (eventBlocks.length === 0 && stageEventIdSet.has(event.id)) {
        const suggestions = await autoSuggestEventBlocks(event.id).catch(() => ({
          suggestions: [],
        }))
        suggestionCount = suggestions.suggestions.length
      }

      const candidate: PrepFlowCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        incomplete_block_count: incompleteBlocks.length,
        due_incomplete_block_count: dueIncompleteBlocks.length,
        next_incomplete_block_title: incompleteBlocks[0]?.title ?? null,
        next_incomplete_block_date: incompleteBlocks[0]?.block_date ?? null,
        suggestion_count: suggestionCount,
        has_any_blocks: eventBlocks.length > 0,
      }

      const hasActionablePrepMove =
        candidate.due_incomplete_block_count > 0 ||
        (!candidate.has_any_blocks && candidate.suggestion_count > 0) ||
        candidate.incomplete_block_count > 0 ||
        (!candidate.has_any_blocks && stageEventIdSet.has(event.id))

      return hasActionablePrepMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is PrepFlowCandidate => Boolean(candidate))
}

async function getTravelConfirmCandidates(
  workSurface: DashboardWorkSurface
): Promise<TravelConfirmCandidate[]> {
  const stageEventIds = getActionEventIdsFromWorkSurface(workSurface, ['travel_arrival'])
  const stageEventIdSet = new Set(stageEventIds)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: travelLegs, error } = await db
    .from('event_travel_legs')
    .select('primary_event_id, linked_event_ids, status, leg_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['planned', 'in_progress'])

  if (error) {
    console.error('[Dashboard] travelConfirmCandidates failed:', error)
    return []
  }

  const legsByEvent = new Map<
    string,
    Array<{
      status: string
      leg_date: string
    }>
  >()
  const eventIds = new Set(stageEventIds)

  for (const leg of (travelLegs ?? []) as any[]) {
    const legEventIds = [
      leg.primary_event_id as string | null,
      ...(((leg.linked_event_ids ?? []) as string[]) ?? []),
    ].filter((value): value is string => Boolean(value))

    for (const eventId of legEventIds) {
      eventIds.add(eventId)
      const current = legsByEvent.get(eventId) ?? []
      current.push({
        status: leg.status,
        leg_date: leg.leg_date,
      })
      legsByEvent.set(eventId, current)
    }
  }

  const allEventIds = Array.from(eventIds)
  if (allEventIds.length === 0) return []

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('id', allEventIds)
    .in('status', ['paid', 'confirmed', 'in_progress'])

  if (eventsError || !events) {
    console.error('[Dashboard] travelConfirmCandidates events failed:', eventsError)
    return []
  }

  return (events as any[])
    .map((event) => {
      const eventLegs = (legsByEvent.get(event.id) ?? []).slice()
      eventLegs.sort((a, b) => a.leg_date.localeCompare(b.leg_date))
      const nextPlannedLegDate = eventLegs.find((leg) => leg.status === 'planned')?.leg_date ?? null

      const candidate: TravelConfirmCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        leg_count: eventLegs.length,
        has_in_progress_leg: eventLegs.some((leg) => leg.status === 'in_progress'),
        next_planned_leg_date: nextPlannedLegDate,
        printable_route_ready: eventLegs.length > 0,
      }

      const hasActionableTravelMove =
        candidate.has_in_progress_leg ||
        candidate.next_planned_leg_date !== null ||
        candidate.printable_route_ready ||
        (candidate.leg_count === 0 && stageEventIdSet.has(event.id))

      return hasActionableTravelMove ? candidate : null
    })
    .filter((candidate): candidate is TravelConfirmCandidate => Boolean(candidate))
}

async function getExecutionNextCandidates(): Promise<ExecutionNextCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      service_started_at, service_completed_at, time_service_minutes,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] executionNextCandidates failed:', error)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const readiness =
        event.status === 'confirmed' ? await getEventReadiness(event.id).catch(() => null) : null

      const candidate: ExecutionNextCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as ExecutionNextCandidate['status'],
        service_started_at: event.service_started_at ?? null,
        service_completed_at: event.service_completed_at ?? null,
        time_service_minutes: event.time_service_minutes ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        readiness: readiness
          ? {
              ready: readiness.ready,
              hardBlocked: readiness.hardBlocked,
              blockers: readiness.blockers.map((blocker) => ({
                gate: blocker.gate,
                label: blocker.label,
                details: blocker.details,
              })),
            }
          : null,
      }

      const hasActionableExecutionMove =
        candidate.status === 'in_progress' ||
        (candidate.status === 'confirmed' &&
          getDaysUntil(candidate.event_date) <= 0 &&
          candidate.readiness?.ready)

      return hasActionableExecutionMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is ExecutionNextCandidate => Boolean(candidate))
}

async function getServiceReadyCandidates(): Promise<ServiceReadyCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      prep_sheet_generated_at, packing_list_generated_at, car_packed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['paid', 'confirmed'])
    .order('event_date', { ascending: true })
    .limit(8)

  if (error || !events) {
    console.error('[Dashboard] serviceReadyCandidates failed:', error)
    return []
  }

  return Promise.all(
    events.map(async (event: any) => {
      const [docReadiness, readiness, dopProgress] = await Promise.all([
        event.status === 'paid'
          ? getDocumentReadiness(event.id).catch(() => null)
          : Promise.resolve(null),
        getEventReadiness(event.id).catch(() => null),
        event.status === 'confirmed'
          ? getEventDOPProgress(event.id).catch(() => null)
          : Promise.resolve(null),
      ])

      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as ServiceReadyCandidate['status'],
        prep_sheet_ready: docReadiness?.prepSheet.ready ?? false,
        prep_sheet_generated: Boolean(event.prep_sheet_generated_at),
        packing_list_generated: Boolean(event.packing_list_generated_at),
        car_packed: Boolean(event.car_packed),
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        dop_progress: dopProgress,
        readiness: readiness
          ? {
              ready: readiness.ready,
              hardBlocked: readiness.hardBlocked,
              blockers: readiness.blockers.map((blocker) => ({
                gate: blocker.gate,
                label: blocker.label,
                details: blocker.details,
              })),
            }
          : null,
      }
    })
  )
}

async function getMenuDecisionCandidates(): Promise<MenuDecisionCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, menu_approval_status, menu_modified_after_approval,
      client:clients(full_name),
      menus(id)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['proposed', 'accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] menuDecisionCandidates failed:', error)
    return []
  }

  return (events as any[])
    .filter((event) => Array.isArray(event.menus) && event.menus.length > 0)
    .map((event) => ({
      id: event.id,
      occasion: event.occasion ?? null,
      event_date: event.event_date,
      guest_count: event.guest_count ?? null,
      menu_approval_status: (event.menu_approval_status ??
        'not_sent') as MenuDecisionCandidate['menu_approval_status'],
      menu_modified_after_approval: Boolean(event.menu_modified_after_approval),
      client: (event.client as { full_name?: string } | null)?.full_name
        ? { full_name: (event.client as { full_name: string }).full_name }
        : null,
    }))
}

async function getSafetyCheckCandidates(): Promise<SafetyCheckCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, client_id, allergies,
      client:clients(full_name, allergies)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(10)

  if (error || !events) {
    console.error('[Dashboard] safetyCheckCandidates failed:', error)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const clientId = (event.client_id as string | null) ?? null

      const [
        allergyRecordsResult,
        guestsResult,
        checklistResult,
        dietaryConflictResult,
        allergyCardReady,
        allergenConflicts,
      ] = await Promise.all([
        clientId
          ? db
              .from('client_allergy_records')
              .select('allergen, confirmed_by_chef')
              .eq('tenant_id', user.tenantId!)
              .eq('client_id', clientId)
          : Promise.resolve({ data: [] }),
        db.from('event_guests').select('allergies, plus_one_allergies').eq('event_id', event.id),
        db
          .from('event_safety_checklists')
          .select('items')
          .eq('event_id', event.id)
          .eq('tenant_id', user.tenantId!)
          .maybeSingle(),
        db
          .from('dietary_conflict_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('chef_id', user.tenantId!)
          .eq('acknowledged', false),
        hasAllergyData(event.id).catch(() => false),
        checkMenuAllergenConflicts(event.id).catch(() => null),
      ])

      const allergyRecords = (allergyRecordsResult.data ?? []) as Array<{
        allergen: string
        confirmed_by_chef: boolean
      }>
      const guests = (guestsResult.data ?? []) as Array<{
        allergies: string[] | null
        plus_one_allergies: string[] | null
      }>
      const checklistItems = (
        ((checklistResult as any)?.data?.items ?? []) as Array<{
          key?: string
          completed?: boolean
        }>
      ).filter((item) => item.key?.startsWith('XC_'))
      const allergens = uniqueStrings([
        ...(((event.allergies ?? []) as string[]) ?? []),
        ...((((event.client as any)?.allergies ?? []) as string[]) ?? []),
        ...allergyRecords.map((record) => record.allergen),
        ...guests.flatMap((guest) => [
          ...(((guest.allergies ?? []) as string[]) ?? []),
          ...(((guest.plus_one_allergies ?? []) as string[]) ?? []),
        ]),
      ])

      const candidate: SafetyCheckCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        unconfirmed_allergy_count: allergyRecords.filter((record) => !record.confirmed_by_chef)
          .length,
        allergen_conflict_count: Number(allergenConflicts?.summary.totalConflicts ?? 0),
        dietary_conflict_count: Number((dietaryConflictResult as any)?.count ?? 0),
        allergen_count: allergens.length,
        cross_contamination_completed_count: checklistItems.filter((item) => item.completed).length,
        cross_contamination_total_count:
          checklistItems.length > 0
            ? checklistItems.length
            : allergens.length > 0
              ? allergens.length * 4
              : 0,
        has_allergy_card_data: Boolean(allergyCardReady),
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      const hasActionableSafetyMove =
        candidate.unconfirmed_allergy_count > 0 ||
        candidate.allergen_conflict_count > 0 ||
        candidate.dietary_conflict_count > 0 ||
        (candidate.allergen_count > 0 &&
          candidate.cross_contamination_completed_count <
            candidate.cross_contamination_total_count) ||
        candidate.has_allergy_card_data

      return hasActionableSafetyMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is SafetyCheckCandidate => Boolean(candidate))
}

async function getCollectBalanceCandidates(): Promise<CollectBalanceCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, financially_closed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['paid', 'confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] collectBalanceCandidates failed:', error)
    return []
  }

  const eventIds = (events as any[]).map((event) => event.id)
  const [summaryResult, installmentResult] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents')
      .in('event_id', eventIds),
    db
      .from('payment_plan_installments')
      .select('event_id, label, due_date, paid_at')
      .in('event_id', eventIds)
      .is('paid_at', null),
  ])

  const summaryMap = new Map<string, { outstanding_balance_cents: number }>()
  for (const row of (summaryResult.data ?? []) as any[]) {
    summaryMap.set(row.event_id, {
      outstanding_balance_cents: Number(row.outstanding_balance_cents ?? 0),
    })
  }

  const installmentsByEvent = new Map<
    string,
    Array<{ label: string | null; due_date: string | null }>
  >()
  for (const row of (installmentResult.data ?? []) as any[]) {
    const current = installmentsByEvent.get(row.event_id) ?? []
    current.push({ label: row.label ?? null, due_date: row.due_date ?? null })
    installmentsByEvent.set(row.event_id, current)
  }

  return (events as any[])
    .map((event) => {
      const summary = summaryMap.get(event.id)
      const unpaidInstallments = installmentsByEvent.get(event.id) ?? []
      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as CollectBalanceCandidate['status'],
        financially_closed: Boolean(event.financially_closed),
        outstanding_balance_cents: Number(summary?.outstanding_balance_cents ?? 0),
        unpaid_installment_count: unpaidInstallments.length,
        next_installment_label: unpaidInstallments[0]?.label ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      } satisfies CollectBalanceCandidate
    })
    .filter(
      (candidate) =>
        candidate.outstanding_balance_cents > 0 ||
        candidate.unpaid_installment_count > 0 ||
        (candidate.status === 'completed' && !candidate.financially_closed)
    )
}

async function getTeamReadyCandidates(): Promise<TeamReadyCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [roster, eventsResult] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    db
      .from('events')
      .select(
        `
        id, occasion, event_date, guest_count, serve_time, departure_time,
        client:clients(full_name)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .in('status', ['paid', 'confirmed'])
      .order('event_date', { ascending: true })
      .limit(10),
  ])

  const events = (eventsResult.data ?? []) as any[]
  if (events.length === 0) return []

  const candidates = await Promise.all(
    events.map(async (event) => {
      const assignments = (await getEventStaffRoster(event.id).catch(() => [])) as any[]
      if (assignments.length === 0 && roster.length === 0) return null

      const taskCountPromise =
        assignments.length > 0
          ? db
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .in(
                'assigned_to',
                assignments.map((assignment) => assignment.staff_member_id)
              )
          : Promise.resolve({ count: 0 })

      const conflicts = await Promise.all(
        assignments.map(async (assignment) => {
          const overlapping = await checkAssignmentConflict(
            assignment.staff_member_id,
            event.event_date,
            event.id
          )
          const timeConflicts = (overlapping ?? []).filter((row: any) =>
            eventsOverlapInTime(row.events, event.serve_time, event.departure_time)
          )

          if (timeConflicts.length === 0) return null

          const eventNames = uniqueStrings(
            timeConflicts.map((row: any) => row.events?.occasion || 'another event')
          )
          return `${assignment.staff_members?.name ?? 'Staff member'} overlaps with ${eventNames.join(', ')}`
        })
      )

      const taskCountResponse = await taskCountPromise
      const conflictSummaries = conflicts.filter((value): value is string => Boolean(value))
      const candidate: TeamReadyCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        staff_count: assignments.length,
        has_staff_conflict: conflictSummaries.length > 0,
        conflict_summary: conflictSummaries[0] ?? null,
        has_staff_task: Number((taskCountResponse as any)?.count ?? 0) > 0,
        can_generate_staff_briefing: assignments.length > 0 && getDaysUntil(event.event_date) <= 2,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      const hasActionableTeamMove =
        candidate.has_staff_conflict ||
        candidate.staff_count === 0 ||
        !candidate.has_staff_task ||
        candidate.can_generate_staff_briefing

      return hasActionableTeamMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is TeamReadyCandidate => Boolean(candidate))
}

async function getRelationshipNextCandidates(): Promise<RelationshipNextCandidate[]> {
  return await getNextBestActions(12).catch(() => [])
}

async function getReceiptCaptureCandidates(): Promise<ReceiptCaptureCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: false })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] receiptCaptureCandidates failed:', error)
    return []
  }

  const eventIds = events
    .map((event: any) => event.id)
    .filter((value: unknown): value is string => typeof value === 'string')
  if (eventIds.length === 0) return []

  const [receiptRowsResult, gateRowsResult] = await Promise.all([
    db
      .from('receipt_photos')
      .select(
        `
        event_id, upload_status,
        receipt_extractions(
          receipt_line_items(id)
        )
      `
      )
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds),
    db
      .from('event_readiness_gates' as any)
      .select('event_id, status')
      .eq('tenant_id', user.tenantId!)
      .eq('gate', 'receipts_uploaded')
      .in('event_id', eventIds),
  ])

  const receiptRows = (receiptRowsResult.data ?? []) as any[]
  const gateRows = (gateRowsResult.data ?? []) as Array<{
    event_id: string
    status: 'pending' | 'passed' | 'overridden'
  }>

  const receiptStatsByEvent = new Map<
    string,
    {
      receiptCount: number
      needsReviewCount: number
      approvableCount: number
    }
  >()

  for (const row of receiptRows) {
    if (!row.event_id) continue

    const current = receiptStatsByEvent.get(row.event_id) ?? {
      receiptCount: 0,
      needsReviewCount: 0,
      approvableCount: 0,
    }

    const extraction = (row.receipt_extractions as any[])?.[0] ?? null
    const lineItemCount = ((extraction?.receipt_line_items as any[]) ?? []).length

    current.receiptCount += 1
    if (row.upload_status === 'needs_review') current.needsReviewCount += 1
    if (row.upload_status === 'extracted' && lineItemCount > 0) current.approvableCount += 1

    receiptStatsByEvent.set(row.event_id, current)
  }

  const gateStatusByEvent = new Map(gateRows.map((row) => [row.event_id, row.status]))

  return events
    .map((event: any) => {
      const receiptStats = receiptStatsByEvent.get(event.id) ?? {
        receiptCount: 0,
        needsReviewCount: 0,
        approvableCount: 0,
      }
      const receiptGateStatus = gateStatusByEvent.get(event.id) ?? null
      const needsUpload =
        event.status === 'completed' &&
        receiptStats.receiptCount === 0 &&
        receiptGateStatus !== 'passed' &&
        receiptGateStatus !== 'overridden'

      const candidate: ReceiptCaptureCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status,
        needs_upload: needsUpload,
        needs_review_count: receiptStats.needsReviewCount,
        approvable_count: receiptStats.approvableCount,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      return candidate.needs_upload ||
        candidate.needs_review_count > 0 ||
        candidate.approvable_count > 0
        ? candidate
        : null
    })
    .filter((candidate: ReceiptCaptureCandidate | null): candidate is ReceiptCaptureCandidate =>
      Boolean(candidate)
    )
}

async function getTrustLoopCandidates(): Promise<TrustLoopCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, follow_up_sent_at,
      client_id,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .eq('status', 'completed')
    .eq('follow_up_sent', true)
    .not('client_id', 'is', null)
    .order('event_date', { ascending: false })
    .limit(10)

  if (error || !events) {
    console.error('[Dashboard] trustLoopCandidates failed:', error)
    return []
  }

  return Promise.all(
    events.map(async (event: any) => {
      const trustLoop = await getEventTrustLoopState(event.id).catch(() => ({ survey: null }))

      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        follow_up_sent_at: event.follow_up_sent_at ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        survey: trustLoop.survey,
      }
    })
  )
}

export async function LifecycleActionLayerSection() {
  const [
    workSurface,
    prepPrompts,
    menuDecisionCandidates,
    safetyCheckCandidates,
    collectBalanceCandidates,
    receiptCaptureCandidates,
    teamReadyCandidates,
    serviceReadyCandidates,
  ] = await Promise.all([
    safe('workSurface', getDashboardWorkSurface, null),
    safe('prepPrompts', getAllPrepPrompts, []),
    safe('menuDecisionCandidates', getMenuDecisionCandidates, []),
    safe('safetyCheckCandidates', getSafetyCheckCandidates, []),
    safe('collectBalanceCandidates', getCollectBalanceCandidates, []),
    safe('receiptCaptureCandidates', getReceiptCaptureCandidates, []),
    safe('teamReadyCandidates', getTeamReadyCandidates, []),
    safe('serviceReadyCandidates', getServiceReadyCandidates, []),
  ])

  if (!workSurface) return null

  const [
    procurementCandidates,
    prepFlowCandidates,
    travelConfirmCandidates,
    executionNextCandidates,
  ] = await Promise.all([
    safe('procurementCandidates', () => getProcurementCandidates(workSurface), []),
    safe('prepFlowCandidates', () => getPrepFlowCandidates(workSurface), []),
    safe('travelConfirmCandidates', () => getTravelConfirmCandidates(workSurface), []),
    safe('executionNextCandidates', getExecutionNextCandidates, []),
  ])

  const prepareTask = resolvePrepareNextTask({ workSurface, prepPrompts })
  const procurementTask = resolveProcurementNextTask(procurementCandidates)
  const prepFlowTask = resolvePrepFlowTask(prepFlowCandidates)
  const travelTask = resolveTravelConfirmTask(travelConfirmCandidates)
  const blockedTask = resolveFixMissingFactTask(workSurface)
  const commitTask = resolveCommitNextTask(workSurface)
  const menuTask = resolveMenuDecisionTask(menuDecisionCandidates as MenuDecisionCandidate[])
  const safetyTask = resolveSafetyCheckTask(safetyCheckCandidates as SafetyCheckCandidate[])
  const collectBalanceTask = resolveCollectBalanceTask(
    collectBalanceCandidates as CollectBalanceCandidate[]
  )
  const receiptCaptureTask = resolveReceiptCaptureTask(
    receiptCaptureCandidates as ReceiptCaptureCandidate[]
  )
  const teamReadyTask = resolveTeamReadyTask(teamReadyCandidates as TeamReadyCandidate[])
  const serviceTask = resolveServiceReadyTask(serviceReadyCandidates)
  const executionTask = resolveExecutionNextTask(executionNextCandidates)

  if (
    !prepareTask &&
    !procurementTask &&
    !prepFlowTask &&
    !travelTask &&
    !blockedTask &&
    !commitTask &&
    !menuTask &&
    !safetyTask &&
    !collectBalanceTask &&
    !receiptCaptureTask &&
    !teamReadyTask &&
    !serviceTask &&
    !executionTask
  ) {
    return null
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {prepareTask ? <ActionSurfaceCard sectionLabel="Prepare Next" task={prepareTask} /> : null}
      {procurementTask ? (
        <ActionSurfaceCard sectionLabel="Procurement Next" task={procurementTask} />
      ) : null}
      {prepFlowTask ? <ActionSurfaceCard sectionLabel="Prep Flow" task={prepFlowTask} /> : null}
      {travelTask ? <ActionSurfaceCard sectionLabel="Travel Confirm" task={travelTask} /> : null}
      {blockedTask ? (
        <ActionSurfaceCard sectionLabel="Fix Missing Fact" task={blockedTask} />
      ) : null}
      {commitTask ? <ActionSurfaceCard sectionLabel="Commit Next" task={commitTask} /> : null}
      {menuTask ? <ActionSurfaceCard sectionLabel="Menu Decision" task={menuTask} /> : null}
      {safetyTask ? <ActionSurfaceCard sectionLabel="Safety Check" task={safetyTask} /> : null}
      {collectBalanceTask ? (
        <ActionSurfaceCard sectionLabel="Collect Balance" task={collectBalanceTask} />
      ) : null}
      {receiptCaptureTask ? (
        <ActionSurfaceCard sectionLabel="Receipt Capture" task={receiptCaptureTask} />
      ) : null}
      {teamReadyTask ? <ActionSurfaceCard sectionLabel="Team Ready" task={teamReadyTask} /> : null}
      {serviceTask ? <ActionSurfaceCard sectionLabel="Service Ready" task={serviceTask} /> : null}
      {executionTask ? (
        <ActionSurfaceCard sectionLabel="Execution Next" task={executionTask} />
      ) : null}
    </section>
  )
}

export async function RelationshipActionLayerSection() {
  const candidates = await safe('relationshipNextCandidates', getRelationshipNextCandidates, [])
  const task = resolveRelationshipNextTask(candidates as RelationshipNextCandidate[])

  if (!task) return null

  return (
    <section>
      <ActionSurfaceCard sectionLabel="Relationship Next" task={task} />
    </section>
  )
}

export async function PostEventActionLayerSection() {
  const [eventsNeedingClosure, trustLoopCandidates] = await Promise.all([
    safe('eventsNeedingClosure', getEventsNeedingClosure, []),
    safe('trustLoopCandidates', getTrustLoopCandidates, []),
  ])

  const resetTask = resolveResetNextTask(eventsNeedingClosure as ResetNextCandidate[])
  const task = resolveCloseOutNextTask(eventsNeedingClosure as CloseOutCandidate[])
  const trustTask = resolveTrustLoopNextTask(trustLoopCandidates)

  if (!resetTask && !task && !trustTask) return null

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {resetTask ? <ActionSurfaceCard sectionLabel="Reset Next" task={resetTask} /> : null}
      {task ? <ActionSurfaceCard sectionLabel="Close Out Next" task={task} /> : null}
      {trustTask ? <ActionSurfaceCard sectionLabel="Trust Loop Next" task={trustTask} /> : null}
    </section>
  )
}
