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

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReadinessGate =
  | 'allergies_verified'
  | 'menu_client_approved'
  | 'documents_generated'
  | 'packing_reviewed'
  | 'equipment_confirmed'
  | 'receipts_uploaded'
  | 'kitchen_clean'
  | 'dop_complete'
  | 'financial_reconciled'

export type GateStatus = 'pending' | 'passed' | 'overridden'

export interface GateResult {
  gate: ReadinessGate
  status: GateStatus
  label: string
  description: string
  isHardBlock: boolean        // true = cannot be overridden (e.g., anaphylaxis present)
  details?: string            // Context about why it's pending
  overrideReason?: string     // If status = 'overridden', what reason the chef gave
}

export interface ReadinessResult {
  eventId: string
  targetStatus: EventStatus
  ready: boolean              // true only if all gates passed or overridden
  hardBlocked: boolean        // true if any gate is a hard block
  gates: GateResult[]
  blockers: GateResult[]      // gates still pending (and not overridden)
  warnings: GateResult[]      // gates overridden with reason (logged, not blocking)
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
    label: 'Documents Generated',
    description: 'Front-of-house menu, prep sheet, and packing list have been generated',
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
  financial_reconciled: {
    label: 'Financials Reconciled',
    description: 'All expenses logged and outstanding balance noted',
  },
}

// Which gates apply to which transition
const TRANSITION_GATES: Record<string, ReadinessGate[]> = {
  'paid->confirmed': ['allergies_verified', 'documents_generated'],
  'confirmed->in_progress': ['packing_reviewed'],
  'in_progress->completed': ['receipts_uploaded', 'kitchen_clean', 'financial_reconciled'],
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
  const supabase = createServerClient({ admin: true })

  const transitionKey = `${fromStatus}->${toStatus}`
  const requiredGates = TRANSITION_GATES[transitionKey] || []

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
    .select('tenant_id, client_id')
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
  const { data: existingGates } = await (supabase as any)
    .from('event_readiness_gates')
    .select('*')
    .eq('event_id', eventId)
    .in('gate', requiredGates)

  const existingMap = new Map<string, { status: string; override_reason: string | null }>(
    (existingGates || []).map((g: any) => [g.gate, g])
  )

  // Check each gate dynamically
  const results = await Promise.all(
    requiredGates.map((gate) =>
      evaluateGate(gate, eventId, event.tenant_id, event.client_id, existingMap, supabase)
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
  tenantId: string,
  clientId: string | null,
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
      return checkAllergyGate(gate, eventId, tenantId, clientId, catalog, supabase)

    case 'documents_generated':
      return checkDocumentsGate(gate, eventId, catalog, supabase)

    case 'menu_client_approved':
      return checkMenuApprovalGate(gate, eventId, catalog, supabase)

    case 'packing_reviewed':
    case 'equipment_confirmed':
    case 'receipts_uploaded':
    case 'kitchen_clean':
    case 'dop_complete':
    case 'financial_reconciled':
      // These require explicit chef action — they're pending until marked
      return {
        gate,
        status: 'pending',
        label: catalog.label,
        description: catalog.description,
        isHardBlock: false,
        details: 'Tap to confirm this has been completed',
      }

    default:
      return {
        gate,
        status: 'pending',
        label: catalog.label,
        description: catalog.description,
        isHardBlock: false,
      }
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
    return { gate, status: 'passed', label: catalog.label, description: catalog.description, isHardBlock: false }
  }

  // Check for unconfirmed allergy records
  const { data: unconfirmed } = await supabase
    .from('client_allergy_records')
    .select('allergen, severity')
    .eq('client_id', clientId)
    .eq('confirmed_by_chef', false)

  if (!unconfirmed || unconfirmed.length === 0) {
    // Either no allergies, or all confirmed — gate passes
    return { gate, status: 'passed', label: catalog.label, description: catalog.description, isHardBlock: false }
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
  // Check if at minimum a prep sheet has been generated
  // (FOH menu auto-generates on confirm, so we just check if it was ever generated)
  const { data: event } = await supabase
    .from('events')
    .select('prep_sheet_generated_at, packing_list_generated_at')
    .eq('id', eventId)
    .single()

  const missingDocs: string[] = []
  if (!event?.prep_sheet_generated_at) missingDocs.push('Prep Sheet')
  if (!event?.packing_list_generated_at) missingDocs.push('Packing List')

  if (missingDocs.length === 0) {
    return { gate, status: 'passed', label: catalog.label, description: catalog.description, isHardBlock: false }
  }

  return {
    gate,
    status: 'pending',
    label: catalog.label,
    description: catalog.description,
    isHardBlock: false,
    details: `Not yet generated: ${missingDocs.join(', ')}`,
  }
}

// ─── Gate: Menu Client Approved ───────────────────────────────────────────────

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
    return { gate, status: 'passed', label: catalog.label, description: catalog.description, isHardBlock: false }
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
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('client_allergy_records')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('severity', { ascending: false })  // anaphylaxis first
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
  const supabase = createServerClient()

  const updateData: Record<string, unknown> = {
    confirmed_by_chef: true,
    confirmed_at: new Date().toISOString(),
  }
  if (options?.severity) updateData.severity = options.severity
  if (options?.notes !== undefined) updateData.notes = options.notes

  const { error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('client_allergy_records')
    .upsert(
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
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { error } = await (supabase as any)
    .from('event_readiness_gates')
    .upsert(
      {
        tenant_id: user.tenantId!,
        event_id: eventId,
        gate,
        status: 'passed',
        resolved_at: new Date().toISOString(),
        metadata: metadata || null,
      },
      { onConflict: 'event_id,gate' }
    )

  if (error) {
    console.error('[markGatePassed] Error:', error)
    throw new Error('Failed to mark gate as passed')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Override a readiness gate with a mandatory reason (chef bypass).
 * Hard-blocked gates (anaphylaxis) cannot be overridden.
 */
export async function overrideGate(
  eventId: string,
  gate: ReadinessGate,
  reason: string
) {
  const user = await requireChef()
  const supabase = createServerClient()

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
    const { data: criticalAllergies } = await (supabase as any)
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

  const { error } = await (supabase as any)
    .from('event_readiness_gates')
    .upsert(
      {
        tenant_id: user.tenantId!,
        event_id: eventId,
        gate,
        status: 'overridden',
        resolved_at: new Date().toISOString(),
        overridden_by: user.id,
        override_reason: reason.trim(),
      },
      { onConflict: 'event_id,gate' }
    )

  if (error) {
    console.error('[overrideGate] Error:', error)
    throw new Error('Failed to override gate')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Get the full readiness status for an event (used by event detail page).
 * Evaluates all gates relevant to the current event status.
 */
export async function getEventReadiness(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
    proposed: null,     // client action, no gates needed
    accepted: null,     // Stripe webhook, no gates needed
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
  const supabase = createServerClient({ admin: true })

  // Get event's client
  const { data: event } = await supabase
    .from('events')
    .select('client_id, tenant_id')
    .eq('id', eventId)
    .single()

  if (!event?.client_id) return { hasConflicts: false, conflicts: [] }

  // Get confirmed allergy records
  const { data: allergies } = await (supabase as any)
    .from('client_allergy_records')
    .select('allergen, severity')
    .eq('client_id', event.client_id)
    .eq('confirmed_by_chef', true)
    .in('severity', ['allergy', 'anaphylaxis'])

  if (!allergies || allergies.length === 0) return { hasConflicts: false, conflicts: [] }

  // Get event menu items (components attached to this event's menus)
  const { data: components } = await (supabase as any)
    .from('menu_components')
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
      const componentText = [
        component.name || '',
        ...(component.ingredients || []),
      ].join(' ').toLowerCase()

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
