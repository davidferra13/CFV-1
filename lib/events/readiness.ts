// Event Readiness Engine
// The gatekeeper for FSM state transitions.
//
// This module answers one question per event at any moment:
//   "Is this event ready to move to the next stage?"
//
// Gates are preconditions organized by lifecycle transition:
//   paid → confirmed:  allergies_verified, documents_generated
//   confirmed → in_progress: packing_reviewed, equipment_confirmed
//   in_progress → completed: receipts_uploaded, kitchen_clean, dop_complete, financial_reconciled
//
// Gates are:
//   - Evaluated automatically by the system (checkAllGates)
//   - Overridable by the chef with a mandatory reason (overrideGate)
//   - Surfaced in the UI as warnings (soft) or blockers (hard)
//
// Hard blocks (cannot be overridden):
//   - Unconfirmed ANAPHYLAXIS allergy records on a client
//
// Soft warnings (chef can override):
//   - Everything else

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EventStatus } from './transitions'
import {
  canMarkReadinessGatePassed,
  getReadinessTransitionGates,
  type ReadinessGate,
} from './readiness-config'
export type { ReadinessGate } from './readiness-config'

// ─── Types ───────────────────────────────────────────────────────────────────

export type GateStatus = 'pending' | 'passed' | 'overridden'

type ReadinessEventRow = {
  tenant_id: string
  client_id: string | null
  packing_list_ready?: boolean | null
  equipment_list_ready?: boolean | null
  car_packed?: boolean | null
  reset_complete?: boolean | null
  financial_closed?: boolean | null
  financially_closed?: boolean | null
}

export interface GateResult {
  gate: ReadinessGate
  status: GateStatus
  label: string
  description: string
  isHardBlock: boolean // true = cannot be overridden (e.g., anaphylaxis present)
  details?: string // Context about why it's pending
  overrideReason?: string // If status = 'overridden', what reason the chef gave
}

export interface ReadinessResult {
  eventId: string
  targetStatus: EventStatus
  ready: boolean // true only if all gates passed or overridden
  hardBlocked: boolean // true if any gate is a hard block
  gates: GateResult[]
  blockers: GateResult[] // gates still pending (and not overridden)
  warnings: GateResult[] // gates overridden with reason (logged, not blocking)
}

// Gate definitions by transition
const GATE_CATALOG: Record<ReadinessGate, { label: string; description: string }> = {
  allergies_verified: {
    label: 'Allergies Verified',
    description: 'All detected allergies for this client have been reviewed and confirmed by you',
  },
  menu_client_approved: {
    label: 'Menu Approved by Client',
    description: 'Client has reviewed and approved the proposed menu',
  },
  documents_generated: {
    label: 'Documents Ready',
    description: 'Front-of-house menu, prep sheet, and packing list have enough data to generate',
  },
  packing_reviewed: {
    label: 'Packing List Reviewed',
    description: 'You have reviewed the packing list and everything is confirmed packed',
  },
  equipment_confirmed: {
    label: 'Equipment Confirmed',
    description: 'All required equipment has been confirmed as present and ready',
  },
  receipts_uploaded: {
    label: 'Receipts Uploaded',
    description: 'All grocery and supply receipts have been uploaded and logged',
  },
  kitchen_clean: {
    label: 'Kitchen Left Clean',
    description: 'Kitchen cleaner than found — confirmed before leaving',
  },
  dop_complete: {
    label: 'Day-Of Protocol Complete',
    description: 'All day-of-protocol checklist items are green',
  },
  deposit_collected: {
    label: 'Deposit Collected',
    description: 'The required deposit has been recorded in the ledger before confirming',
  },
  financial_reconciled: {
    label: 'Financials Reconciled',
    description: 'All expenses logged and outstanding balance noted',
  },
}

const READINESS_OVERRIDE_TASK_PREFIX = 'readiness_override:'

function getReadinessOverrideTaskKey(gate: ReadinessGate): string {
  return `${READINESS_OVERRIDE_TASK_PREFIX}${gate}`
}

function isMissingRelationError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  relation: string
): boolean {
  const message = (error?.message ?? '').toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    message.includes(`public.${relation}`.toLowerCase()) ||
    message.includes(`relation "${relation.toLowerCase()}" does not exist`)
  )
}

function buildGateRecordMap(
  rows: Array<{ gate: string; status: string; override_reason?: string | null }>
) {
  return new Map<string, { status: string; override_reason: string | null }>(
    rows.map((row) => [
      row.gate,
      {
        status: row.status,
        override_reason: row.override_reason ?? null,
      },
    ])
  )
}

async function loadPersistedGateStates(
  supabase: any,
  eventId: string,
  tenantId: string,
  gates: ReadinessGate[]
) {
  const { data: gateRows, error: gateError } = await supabase
    .from('event_readiness_gates' as any)
    .select('gate, status, override_reason')
    .eq('event_id', eventId)
    .in('gate', gates)

  if (!gateError) {
    return buildGateRecordMap(gateRows || [])
  }

  if (!isMissingRelationError(gateError, 'event_readiness_gates')) {
    console.error('[readiness] Failed to load persisted gate states:', gateError)
    return new Map<string, { status: string; override_reason: string | null }>()
  }

  const taskKeys = [...gates, ...gates.map(getReadinessOverrideTaskKey)]
  const { data: completionRows, error: completionError } = await supabase
    .from('dop_task_completions')
    .select('task_key, notes, completed_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .in('task_key', taskKeys)

  if (completionError) {
    console.error('[readiness] Failed to load fallback gate states:', completionError)
    return new Map<string, { status: string; override_reason: string | null }>()
  }

  const rows = [...(completionRows || [])].sort(
    (a: any, b: any) =>
      new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime()
  )

  const mappedRows: Array<{ gate: string; status: string; override_reason?: string | null }> = []
  for (const row of rows) {
    if (typeof row.task_key !== 'string') continue

    if (row.task_key.startsWith(READINESS_OVERRIDE_TASK_PREFIX)) {
      const gate = row.task_key.slice(READINESS_OVERRIDE_TASK_PREFIX.length)
      if (!gates.includes(gate as ReadinessGate)) continue
      if (!mappedRows.some((existing) => existing.gate === gate)) {
        mappedRows.push({
          gate,
          status: 'overridden',
          override_reason: row.notes ?? null,
        })
      }
      continue
    }

    if (!gates.includes(row.task_key as ReadinessGate)) continue
    if (!mappedRows.some((existing) => existing.gate === row.task_key)) {
      mappedRows.push({
        gate: row.task_key,
        status: 'passed',
        override_reason: null,
      })
    }
  }

  return buildGateRecordMap(mappedRows)
}

function getCanonicalEventUpdatesForPassedGate(
  gate: ReadinessGate,
  resolvedAt: string
): Record<string, unknown> | null {
  switch (gate) {
    case 'packing_reviewed':
      return { packing_list_ready: true }
    case 'equipment_confirmed':
      return { equipment_list_ready: true }
    case 'kitchen_clean':
      return { reset_complete: true, reset_completed_at: resolvedAt }
    case 'financial_reconciled':
      return {
        financial_closed: true,
        financial_closed_at: resolvedAt,
        financially_closed: true,
      }
    default:
      return null
  }
}

async function applyCanonicalEventGateUpdates(
  supabase: any,
  eventId: string,
  tenantId: string,
  gate: ReadinessGate,
  resolvedAt: string
) {
  const updates = getCanonicalEventUpdatesForPassedGate(gate, resolvedAt)
  if (!updates) return

  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[readiness] Failed to sync canonical event gate fields:', error)
    throw new Error('Failed to sync gate status to event')
  }
}

async function persistFallbackGateState(
  supabase: any,
  eventId: string,
  tenantId: string,
  gate: ReadinessGate,
  mode: 'passed' | 'overridden',
  reason?: string | null
) {
  const taskKey = mode === 'passed' ? gate : getReadinessOverrideTaskKey(gate)
  const { error: deleteError } = await supabase
    .from('dop_task_completions')
    .delete()
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .in('task_key', [gate, getReadinessOverrideTaskKey(gate)])

  if (deleteError) {
    console.error('[readiness] Failed to clear fallback gate state:', deleteError)
    throw new Error('Failed to update fallback gate state')
  }

  const { error: insertError } = await supabase.from('dop_task_completions').insert({
    event_id: eventId,
    tenant_id: tenantId,
    task_key: taskKey,
    notes: mode === 'overridden' ? (reason ?? null) : null,
  })

  if (insertError) {
    console.error('[readiness] Failed to persist fallback gate state:', insertError)
    throw new Error('Failed to persist fallback gate state')
  }
}

async function persistGateState({
  supabase,
  eventId,
  tenantId,
  gate,
  mode,
  metadata,
  reason,
}: {
  supabase: any
  eventId: string
  tenantId: string
  gate: ReadinessGate
  mode: 'passed' | 'overridden'
  metadata?: Record<string, unknown>
  reason?: string | null
}) {
  const { error } = await supabase.from('event_readiness_gates' as any).upsert(
    {
      tenant_id: tenantId,
      event_id: eventId,
      gate,
      status: mode,
      resolved_at: new Date().toISOString(),
      overridden_by:
        mode === 'overridden' && typeof metadata?.overridden_by === 'string'
          ? metadata.overridden_by
          : null,
      override_reason: mode === 'overridden' ? (reason?.trim() ?? null) : null,
      metadata: metadata || null,
    },
    { onConflict: 'event_id,gate' }
  )

  if (!error) return

  if (!isMissingRelationError(error, 'event_readiness_gates')) {
    console.error('[readiness] Failed to persist gate state:', error)
    throw new Error(`Failed to ${mode === 'passed' ? 'mark gate as passed' : 'override gate'}`)
  }

  await persistFallbackGateState(supabase, eventId, tenantId, gate, mode, reason)
}

function revalidateReadinessPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/schedule`)
  revalidatePath(`/events/${eventId}/pack`)
  revalidatePath(`/events/${eventId}/financial`)
  revalidatePath('/dashboard')
  revalidatePath('/queue')
  revalidatePath('/briefing')
}

// ─── Main Readiness Evaluator ─────────────────────────────────────────────────

/**
 * Evaluate readiness for a specific FSM transition.
 * Returns gate-by-gate status and an overall ready/blocked determination.
 *
 * Called from transitionEvent() before the actual update to surface
 * warnings and hard blocks to the chef.
 */
export async function evaluateReadinessForTransition(
  eventId: string,
  fromStatus: EventStatus,
  toStatus: EventStatus
): Promise<ReadinessResult> {
  const supabase: any = createServerClient({ admin: true })

  const requiredGates = getReadinessTransitionGates(fromStatus, toStatus)

  // If no gates defined for this transition, it's always ready
  if (requiredGates.length === 0) {
    return {
      eventId,
      targetStatus: toStatus,
      ready: true,
      hardBlocked: false,
      gates: [],
      blockers: [],
      warnings: [],
    }
  }

  // Fetch event to get client_id and tenant_id
  const { data: event } = await supabase
    .from('events')
    .select(
      'tenant_id, client_id, packing_list_ready, equipment_list_ready, car_packed, reset_complete, financial_closed, financially_closed'
    )
    .eq('id', eventId)
    .single()

  if (!event) {
    return {
      eventId,
      targetStatus: toStatus,
      ready: true,
      hardBlocked: false,
      gates: [],
      blockers: [],
      warnings: [],
    }
  }

  // Fetch existing gate records for this event
  const existingMap = await loadPersistedGateStates(
    supabase,
    eventId,
    event.tenant_id,
    requiredGates
  )

  // Check each gate dynamically
  const results = await Promise.all(
    requiredGates.map((gate) =>
      evaluateGate(gate, eventId, event as ReadinessEventRow, existingMap, supabase)
    )
  )

  const blockers = results.filter((r) => r.status === 'pending')
  const warnings = results.filter((r) => r.status === 'overridden')
  const hardBlocked = blockers.some((r) => r.isHardBlock)
  const ready = blockers.length === 0

  return {
    eventId,
    targetStatus: toStatus,
    ready,
    hardBlocked,
    gates: results,
    blockers,
    warnings,
  }
}

// ─── Individual Gate Evaluator ────────────────────────────────────────────────

async function evaluateGate(
  gate: ReadinessGate,
  eventId: string,
  event: ReadinessEventRow,
  existingMap: Map<string, { status: string; override_reason: string | null }>,
  supabase: any
): Promise<GateResult> {
  const catalog = GATE_CATALOG[gate]
  const existing = existingMap.get(gate)

  // If it's already passed or overridden in the DB, honor that
  if (existing?.status === 'passed') {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  if (existing?.status === 'overridden') {
    return {
      gate,
      status: 'overridden',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
      overrideReason: existing.override_reason || undefined,
    }
  }

  // Otherwise: dynamically check
  switch (gate) {
    case 'allergies_verified':
      return checkAllergyGate(gate, eventId, event.tenant_id, event.client_id, catalog, supabase)

    case 'documents_generated':
      return checkDocumentsGate(gate, eventId, catalog, supabase)

    case 'menu_client_approved':
      return checkMenuApprovalGate(gate, eventId, catalog, supabase)

    case 'deposit_collected':
      return checkDepositGate(gate, eventId, catalog, supabase)

    case 'packing_reviewed':
      if (event.packing_list_ready || event.car_packed) {
        return {
          gate,
          status: 'passed',
          label: catalog.label,
          description: catalog.description,
          isHardBlock: false,
        }
      }
      break

    case 'equipment_confirmed':
      if (event.equipment_list_ready) {
        return {
          gate,
          status: 'passed',
          label: catalog.label,
          description: catalog.description,
          isHardBlock: false,
        }
      }
      break

    case 'receipts_uploaded':
      return checkReceiptsGate(gate, eventId, event, catalog, supabase)

    case 'kitchen_clean':
      if (event.reset_complete) {
        return {
          gate,
          status: 'passed',
          label: catalog.label,
          description: catalog.description,
          isHardBlock: false,
        }
      }
      break

    case 'financial_reconciled':
      if (event.financial_closed || event.financially_closed) {
        return {
          gate,
          status: 'passed',
          label: catalog.label,
          description: catalog.description,
          isHardBlock: false,
        }
      }
      break

    case 'dop_complete':
      break

    default:
      break
  }

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false,
    details: 'Tap to confirm this has been completed',
  }
}

// ─── Gate: Deposit Collected ─────────────────────────────────────────────────

async function checkDepositGate(
  gate: ReadinessGate,
  eventId: string,
  catalog: { label: string; description: string },
  supabase: any
): Promise<GateResult> {
  // Fetch event's deposit requirement
  const { data: event } = await supabase
    .from('events')
    .select('deposit_amount_cents')
    .eq('id', eventId)
    .single()

  const depositRequired = (event?.deposit_amount_cents ?? 0) as number

  // No deposit required — gate passes automatically
  if (!depositRequired || depositRequired <= 0) {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  // Check how much has been paid via ledger
  const { data: summary } = await supabase
    .from('event_financial_summary')
    .select('total_paid_cents')
    .eq('event_id', eventId)
    .single()

  const totalPaid = (summary?.total_paid_cents ?? 0) as number

  if (totalPaid >= depositRequired) {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  const formatCents = (c: number) =>
    `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  const shortfall = depositRequired - totalPaid

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false, // Soft block: chef can override if deposit was collected off-platform
    details: `Deposit required: ${formatCents(depositRequired)} — collected: ${formatCents(totalPaid)} — shortfall: ${formatCents(shortfall)}. Record the payment to proceed, or override if collected off-platform.`,
  }
}

// ─── Gate: Allergies Verified ─────────────────────────────────────────────────

async function checkAllergyGate(
  gate: ReadinessGate,
  eventId: string,
  tenantId: string,
  clientId: string | null,
  catalog: { label: string; description: string },
  supabase: any
): Promise<GateResult> {
  if (!clientId) {
    // No client assigned — can't verify, treat as passed (no one to check)
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  // Check for unconfirmed allergy records
  const { data: unconfirmed } = await supabase
    .from('client_allergy_records')
    .select('allergen, severity')
    .eq('client_id', clientId)
    .eq('confirmed_by_chef', false)

  if (!unconfirmed || unconfirmed.length === 0) {
    // Either no allergies, or all confirmed — gate passes
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  const hasAnaphylaxis = unconfirmed.some((r: any) => r.severity === 'anaphylaxis')
  const allergenList = unconfirmed.map((r: any) => r.allergen).join(', ')

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: hasAnaphylaxis,
    details: hasAnaphylaxis
      ? `CRITICAL: Unconfirmed anaphylaxis risk for ${allergenList}. You must confirm or dismiss this before proceeding.`
      : `${unconfirmed.length} unconfirmed allergen(s): ${allergenList}. Please verify on the client profile.`,
  }
}

// ─── Gate: Documents Generated ────────────────────────────────────────────────

async function checkDocumentsGate(
  gate: ReadinessGate,
  eventId: string,
  catalog: { label: string; description: string },
  supabase: any
): Promise<GateResult> {
  const missingDocs: string[] = []

  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', eventId).limit(1)

  const menuId = menus?.[0]?.id as string | undefined

  if (!menuId) {
    missingDocs.push('Front-of-House Menu', 'Prep Sheet')
  } else {
    const { data: dishes, count: dishCount } = await supabase
      .from('dishes')
      .select('id', { count: 'exact' })
      .eq('menu_id', menuId)

    if (!dishCount || dishCount <= 0) {
      missingDocs.push('Front-of-House Menu', 'Prep Sheet')
    } else {
      const dishIds = (dishes || []).map((dish: any) => dish.id)
      const { count: componentCount } = await supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .in('dish_id', dishIds)

      if (!componentCount || componentCount <= 0) {
        missingDocs.push('Prep Sheet')
      }
    }
  }

  if (missingDocs.length === 0) {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false,
    details: `Still missing data for: ${missingDocs.join(', ')}`,
  }
}

// ─── Gate: Menu Client Approved ───────────────────────────────────────────────

async function checkReceiptsGate(
  gate: ReadinessGate,
  eventId: string,
  event: ReadinessEventRow,
  catalog: { label: string; description: string },
  supabase: any
): Promise<GateResult> {
  if (event.financial_closed || event.financially_closed) {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('receipt_uploaded')
    .eq('event_id', eventId)
    .eq('tenant_id', event.tenant_id)

  if (!expenseError && expenses && expenses.length > 0) {
    const missingReceipts = expenses.filter((expense: any) => !expense.receipt_uploaded).length

    if (missingReceipts === 0) {
      return {
        gate,
        status: 'passed',
        label: catalog.label,
        description: catalog.description,
        isHardBlock: false,
      }
    }

    return {
      gate,
      status: 'pending',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
      details: `${missingReceipts} event expense receipt${missingReceipts === 1 ? '' : 's'} still need to be uploaded`,
    }
  }

  try {
    const { count } = await supabase
      .from('receipt_photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('tenant_id', event.tenant_id)

    if ((count ?? 0) > 0) {
      return {
        gate,
        status: 'passed',
        label: catalog.label,
        description: catalog.description,
        isHardBlock: false,
      }
    }
  } catch {
    // Receipt digitization can be absent in older environments.
  }

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false,
    details: 'No uploaded receipt records found for this event yet',
  }
}

async function checkMenuApprovalGate(
  gate: ReadinessGate,
  eventId: string,
  catalog: { label: string; description: string },
  supabase: any
): Promise<GateResult> {
  // Check menu_approval_requests table for an approved record
  const { data: approval } = await supabase
    .from('menu_approval_requests')
    .select('status')
    .eq('event_id', eventId)
    .eq('status', 'approved')
    .limit(1)
    .single()

  if (approval) {
    return {
      gate,
      status: 'passed',
      label: catalog.label,
      description: catalog.description,
      isHardBlock: false,
    }
  }

  // Check if there's a pending approval request
  const { data: pending } = await supabase
    .from('menu_approval_requests')
    .select('status, sent_at')
    .eq('event_id', eventId)
    .limit(1)
    .single()

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false,
    details: pending
      ? `Approval request sent — awaiting client response`
      : `No menu approval request has been sent to the client yet`,
  }
}

// ─── Allergy Record Actions ───────────────────────────────────────────────────

/**
 * Get all allergy records for a client (chef-only).
 */
export async function getClientAllergyRecords(clientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_allergy_records')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('severity', { ascending: false }) // anaphylaxis first
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientAllergyRecords] Error:', error)
    return []
  }

  return data || []
}

/**
 * Confirm an AI-detected allergy record (chef explicitly verifies it's real).
 */
export async function confirmAllergyRecord(
  allergyRecordId: string,
  options?: { severity?: string; notes?: string }
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = {
    confirmed_by_chef: true,
    confirmed_at: new Date().toISOString(),
  }
  if (options?.severity) updateData.severity = options.severity
  if (options?.notes !== undefined) updateData.notes = options.notes

  const { error } = await supabase
    .from('client_allergy_records')
    .update(updateData)
    .eq('id', allergyRecordId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[confirmAllergyRecord] Error:', error)
    throw new Error('Failed to confirm allergy record')
  }

  revalidatePath('/clients')
  return { success: true }
}

/**
 * Dismiss (delete) an AI-detected allergy record the chef determines is incorrect.
 */
export async function dismissAllergyRecord(allergyRecordId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('client_allergy_records')
    .delete()
    .eq('id', allergyRecordId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[dismissAllergyRecord] Error:', error)
    throw new Error('Failed to dismiss allergy record')
  }

  revalidatePath('/clients')
  return { success: true }
}

/**
 * Manually add an allergy record (chef-entered, auto-confirmed).
 */
export async function addAllergyRecord(
  clientId: string,
  data: { allergen: string; severity: string; notes?: string }
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('client_allergy_records').upsert(
    {
      tenant_id: user.tenantId!,
      client_id: clientId,
      allergen: data.allergen.trim(),
      severity: data.severity,
      source: 'chef_entered',
      confirmed_by_chef: true,
      confirmed_at: new Date().toISOString(),
      notes: data.notes || null,
    },
    { onConflict: 'client_id,allergen' }
  )

  if (error) {
    console.error('[addAllergyRecord] Error:', error)
    throw new Error('Failed to add allergy record')
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// ─── Gate Pass / Override Actions ────────────────────────────────────────────

/**
 * Mark a readiness gate as passed (called when chef completes the action).
 */
export async function markGatePassed(
  eventId: string,
  gate: ReadinessGate,
  metadata?: Record<string, unknown>
) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  if (!canMarkReadinessGatePassed(gate)) {
    throw new Error(
      'This gate is system-tracked. Complete the underlying workflow or skip it with a reason.'
    )
  }

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const resolvedAt = new Date().toISOString()
  await applyCanonicalEventGateUpdates(supabase, eventId, user.tenantId!, gate, resolvedAt)
  await persistGateState({
    supabase,
    eventId,
    tenantId: user.tenantId!,
    gate,
    mode: 'passed',
    metadata,
  })

  revalidateReadinessPaths(eventId)
  return { success: true }
}

/**
 * Override a readiness gate with a mandatory reason (chef bypass).
 * Hard-blocked gates (anaphylaxis) cannot be overridden.
 */
export async function overrideGate(eventId: string, gate: ReadinessGate, reason: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  if (!reason || reason.trim().length < 5) {
    throw new Error('A reason of at least 5 characters is required to override a gate')
  }

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Check if this gate is hard-blocked (anaphylaxis allergy present)
  if (gate === 'allergies_verified' && event.client_id) {
    const { data: criticalAllergies } = await supabase
      .from('client_allergy_records')
      .select('allergen')
      .eq('client_id', event.client_id)
      .eq('confirmed_by_chef', false)
      .eq('severity', 'anaphylaxis')
      .limit(1)

    if (criticalAllergies && criticalAllergies.length > 0) {
      throw new Error(
        'Cannot override: unconfirmed anaphylaxis allergens must be explicitly confirmed or dismissed by you before proceeding. This is a safety requirement.'
      )
    }
  }

  await persistGateState({
    supabase,
    eventId,
    tenantId: user.tenantId!,
    gate,
    mode: 'overridden',
    reason: reason.trim(),
    metadata: { overridden_by: user.id },
  })

  revalidateReadinessPaths(eventId)
  return { success: true }
}

/**
 * Get the full readiness status for an event (used by event detail page).
 * Evaluates all gates relevant to the current event status.
 */
export async function getEventReadiness(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('status, tenant_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const currentStatus = event.status as EventStatus

  // Figure out what the next transition is
  const nextTransitionMap: Record<string, { from: EventStatus; to: EventStatus } | null> = {
    draft: { from: 'draft', to: 'proposed' },
    proposed: null, // client action, no gates needed
    accepted: null, // Stripe webhook, no gates needed
    paid: { from: 'paid', to: 'confirmed' },
    confirmed: { from: 'confirmed', to: 'in_progress' },
    in_progress: { from: 'in_progress', to: 'completed' },
    completed: null,
    cancelled: null,
  }

  const nextTransition = nextTransitionMap[currentStatus]
  if (!nextTransition) return null

  return evaluateReadinessForTransition(eventId, nextTransition.from, nextTransition.to)
}

/**
 * Cross-event allergy check.
 * Given an event, return any allergens in the client's confirmed allergy records
 * that could conflict with the event's menu items.
 * Used by document generators and the readiness engine.
 */
export async function checkMenuAllergyConflicts(eventId: string): Promise<{
  hasConflicts: boolean
  conflicts: Array<{ allergen: string; severity: string; menuItem?: string }>
}> {
  const supabase: any = createServerClient({ admin: true })

  // Get event's client
  const { data: event } = await supabase
    .from('events')
    .select('client_id, tenant_id')
    .eq('id', eventId)
    .single()

  if (!event?.client_id) return { hasConflicts: false, conflicts: [] }

  // Get confirmed allergy records
  const { data: allergies } = await supabase
    .from('client_allergy_records')
    .select('allergen, severity')
    .eq('client_id', event.client_id)
    .eq('confirmed_by_chef', true)
    .in('severity', ['allergy', 'anaphylaxis'])

  if (!allergies || allergies.length === 0) return { hasConflicts: false, conflicts: [] }

  // Get event menu items (components attached to this event's menus)
  const { data: components } = await supabase
    .from('menu_components' as any)
    .select('name, ingredients')
    .eq('event_id', eventId)

  if (!components || components.length === 0) {
    // No menu yet — flag that allergies exist but can't compare
    return {
      hasConflicts: false,
      conflicts: allergies.map((a: any) => ({ allergen: a.allergen, severity: a.severity })),
    }
  }

  // Simple text-match: check if allergen name appears in any component name or ingredients
  const conflicts: Array<{ allergen: string; severity: string; menuItem?: string }> = []

  for (const allergy of allergies) {
    const allergenLower = allergy.allergen.toLowerCase()
    for (const component of components) {
      const componentText = [component.name || '', ...(component.ingredients || [])]
        .join(' ')
        .toLowerCase()

      if (componentText.includes(allergenLower)) {
        conflicts.push({
          allergen: allergy.allergen,
          severity: allergy.severity,
          menuItem: component.name,
        })
        break // Only flag once per allergen
      }
    }
  }

  return { hasConflicts: conflicts.length > 0, conflicts }
}
