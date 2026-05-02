'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getCurrentEventServiceSimulation,
  getCurrentEventServiceSimulationForTenant,
} from '@/lib/service-simulation/state'
import type {
  ServiceSimulationProof,
  ServiceSimulationProofId,
  ServiceSimulationProofSeverity,
  ServiceSimulationProofStatus,
} from '@/lib/service-simulation/types'
import type { EventStatus } from './fsm'

export type ReadinessGate = ServiceSimulationProofId
export type GateStatus = ServiceSimulationProofStatus | 'overridden'
export type ReadinessTargetStatus = EventStatus | 'documents'

export interface GateResult {
  gate: ReadinessGate
  status: GateStatus
  label: string
  description: string
  details?: string
  isHardBlock: boolean
  blocking: boolean
  severity: ServiceSimulationProofSeverity
  sourceOfTruth: string
  lastVerifiedAt?: string | null
  overrideReason?: string
  verifyRoute: string
  verifyTarget: string
  ctaLabel: string
}

export interface ReadinessResult {
  eventId: string
  targetStatus: ReadinessTargetStatus
  ready: boolean
  hardBlocked: boolean
  confidence: number
  contextHash: string
  counts: {
    blockers: number
    risks: number
    stale: number
  }
  gates: GateResult[]
  blockers: GateResult[]
  warnings: GateResult[]
  mostLikelyFailurePoint: GateResult | null
}

type OverrideRow = {
  gate: string
  status: string
  override_reason: string | null
  metadata: Record<string, unknown> | null
}

const BLOCKING_PROOFS_BY_TARGET: Record<ReadinessTargetStatus, ReadinessGate[]> = {
  draft: [],
  proposed: [],
  accepted: [],
  paid: [],
  confirmed: ['prep_timeline', 'dietary_constraints', 'arrival_logistics', 'service_plan_flow'],
  in_progress: [
    'prep_timeline',
    'packing_list',
    'dietary_constraints',
    'arrival_logistics',
    'service_plan_flow',
  ],
  completed: [],
  cancelled: [],
  documents: [
    'prep_timeline',
    'packing_list',
    'dietary_constraints',
    'arrival_logistics',
    'service_plan_flow',
  ],
}

function proofDetail(proof: ServiceSimulationProof): string {
  if (proof.status === 'stale') return proof.staleReason ?? proof.sourceOfTruth
  return proof.sourceOfTruth
}

function isOverrideActive(row: OverrideRow | undefined, contextHash: string): boolean {
  if (!row || row.status !== 'overridden') return false
  const metadataHash =
    row.metadata && typeof row.metadata.contextHash === 'string' ? row.metadata.contextHash : null
  return metadataHash === contextHash
}

function isBlockingForTarget(
  proof: ServiceSimulationProof,
  targetStatus: ReadinessTargetStatus
): boolean {
  return BLOCKING_PROOFS_BY_TARGET[targetStatus].includes(proof.id)
}

function buildGateResult(
  proof: ServiceSimulationProof,
  targetStatus: ReadinessTargetStatus,
  overrideRow: OverrideRow | undefined,
  contextHash: string
): GateResult {
  const overridden = isOverrideActive(overrideRow, contextHash)
  const targetBlocking = isBlockingForTarget(proof, targetStatus)

  return {
    gate: proof.id,
    status: overridden ? 'overridden' : proof.status,
    label: proof.label,
    description: proof.sourceOfTruth,
    details: proofDetail(proof),
    isHardBlock:
      !overridden &&
      proof.status === 'unverified' &&
      proof.severity === 'critical' &&
      proof.blocking &&
      targetBlocking,
    blocking: targetBlocking,
    severity: proof.severity,
    sourceOfTruth: proof.sourceOfTruth,
    lastVerifiedAt: proof.lastVerifiedAt,
    overrideReason: overridden ? (overrideRow?.override_reason ?? 'Override recorded') : undefined,
    verifyRoute: proof.verifyAction.route,
    verifyTarget: proof.verifyAction.uiTarget,
    ctaLabel: proof.verifyAction.ctaLabel,
  }
}

function computeConfidence(counts: ReadinessResult['counts']): number {
  return Math.max(
    0,
    Math.min(100, 100 - counts.blockers * 25 - counts.risks * 10 - counts.stale * 6)
  )
}

function rankGate(gate: GateResult): number {
  if (gate.isHardBlock) return 0
  if (gate.status === 'stale' && gate.severity === 'critical') return 1
  if (gate.status === 'overridden' && gate.severity === 'critical') return 2
  if (gate.status === 'unverified') return 3
  if (gate.status === 'stale') return 4
  if (gate.status === 'overridden') return 5
  return 6
}

async function fetchOverrideRows(
  db: ReturnType<typeof createServerClient>,
  eventId: string,
  tenantId: string,
  gates: ReadinessGate[]
): Promise<Map<ReadinessGate, OverrideRow>> {
  const { data, error } = await (db as any)
    .from('event_readiness_gates')
    .select('gate, status, override_reason, metadata')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .in('gate', gates)

  if (error && !error.message?.includes('event_readiness_gates')) {
    throw new Error(`Failed to load readiness overrides: ${error.message}`)
  }

  return new Map(((data ?? []) as OverrideRow[]).map((row) => [row.gate as ReadinessGate, row]))
}

async function evaluateReadinessInternal(params: {
  eventId: string
  tenantId: string
  targetStatus: ReadinessTargetStatus
  admin?: boolean
}): Promise<ReadinessResult> {
  const { eventId, tenantId, targetStatus } = params
  const db: any = createServerClient(params.admin ? { admin: true } : undefined)
  const simulationState = params.admin
    ? await getCurrentEventServiceSimulationForTenant(eventId, tenantId)
    : await getCurrentEventServiceSimulation(eventId)
  const overrideRows = await fetchOverrideRows(
    db,
    eventId,
    tenantId,
    simulationState.simulation.proofs.map((proof) => proof.id)
  )

  const gates: GateResult[] = simulationState.simulation.proofs.map((proof) =>
    buildGateResult(proof, targetStatus, overrideRows.get(proof.id), simulationState.hash)
  )

  // Compliance gate: check certs, insurance, permits before confirming
  if (targetStatus === 'confirmed' || targetStatus === 'in_progress') {
    try {
      const { checkComplianceGate } = await import('@/lib/protection/compliance-gate-actions')
      const compliance = await checkComplianceGate()
      for (const item of compliance.items) {
        if (item.status === 'fail') {
          gates.push({
            gate: 'service_plan_flow' as ReadinessGate,
            status: 'unverified',
            label: item.label,
            description: item.detail,
            isHardBlock: true,
            blocking: true,
            severity: 'critical',
            sourceOfTruth: 'compliance system',
            lastVerifiedAt: null,
            verifyRoute: item.route,
            verifyTarget: item.key,
            ctaLabel: `Fix ${item.label}`,
          })
        } else if (item.status === 'warn') {
          gates.push({
            gate: 'service_plan_flow' as ReadinessGate,
            status: 'unverified',
            label: item.label,
            description: item.detail,
            isHardBlock: false,
            blocking: false,
            severity: 'warning',
            sourceOfTruth: 'compliance system',
            lastVerifiedAt: null,
            verifyRoute: item.route,
            verifyTarget: item.key,
            ctaLabel: `Review ${item.label}`,
          })
        }
      }
    } catch {
      // Non-blocking if compliance system unavailable
    }
  }

  // Soft contract gate: warn if no signed contract when confirming
  if (targetStatus === 'confirmed' || targetStatus === 'in_progress') {
    try {
      const { data: contract } = await (db as any)
        .from('contracts')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .in('status', ['signed'])
        .limit(1)
        .maybeSingle()

      if (!contract) {
        gates.push({
          gate: 'service_plan_flow' as ReadinessGate, // piggyback on existing gate type
          status: 'unverified',
          label: 'Signed Contract',
          description: 'No signed contract on file for this event.',
          details: 'Consider sending a service agreement before confirming.',
          isHardBlock: false,
          blocking: false,
          severity: 'warning',
          sourceOfTruth: 'contracts table',
          lastVerifiedAt: null,
          verifyRoute: `/events/${eventId}`,
          verifyTarget: 'contracts',
          ctaLabel: 'Review Contracts',
        })
      }
    } catch {
      // Non-blocking; contracts table may not exist
    }
  }

  const blockers = gates.filter((gate) => gate.isHardBlock)
  const risks = gates.filter(
    (gate) => gate.status === 'overridden' || (gate.status === 'unverified' && !gate.isHardBlock)
  ).length
  const stale = gates.filter((gate) => gate.status === 'stale').length
  const counts = {
    blockers: blockers.length,
    risks,
    stale,
  }
  const mostLikelyFailurePoint =
    [...gates].sort((left, right) => rankGate(left) - rankGate(right))[0] ?? null

  return {
    eventId,
    targetStatus,
    ready: blockers.length === 0,
    hardBlocked: blockers.length > 0,
    confidence: computeConfidence(counts),
    contextHash: simulationState.hash,
    counts,
    gates,
    blockers,
    warnings: gates.filter((gate) => !gate.isHardBlock && gate.status !== 'verified'),
    mostLikelyFailurePoint:
      !mostLikelyFailurePoint || mostLikelyFailurePoint.status === 'verified'
        ? null
        : mostLikelyFailurePoint,
  }
}

async function getEventTenantAndStatus(eventId: string): Promise<{
  tenantId: string
  status: EventStatus
} | null> {
  const db: any = createServerClient({ admin: true })
  const { data: event, error } = await db
    .from('events')
    .select('tenant_id, status')
    .eq('id', eventId)
    .single()

  if (error || !event) return null

  return {
    tenantId: event.tenant_id as string,
    status: event.status as EventStatus,
  }
}

export async function computeEventReadiness(eventId: string) {
  const state = await getCurrentEventServiceSimulation(eventId)
  return state.simulation.readiness
}

export async function evaluateReadinessForTransition(
  eventId: string,
  fromStatus: EventStatus,
  toStatus: EventStatus
): Promise<ReadinessResult> {
  const event = await getEventTenantAndStatus(eventId)

  if (!event) {
    return {
      eventId,
      targetStatus: toStatus,
      ready: true,
      hardBlocked: false,
      confidence: 100,
      contextHash: '',
      counts: { blockers: 0, risks: 0, stale: 0 },
      gates: [],
      blockers: [],
      warnings: [],
      mostLikelyFailurePoint: null,
    }
  }

  if (fromStatus === 'in_progress' && toStatus === 'completed') {
    return evaluateReadinessInternal({
      eventId,
      tenantId: event.tenantId,
      targetStatus: 'completed',
      admin: true,
    })
  }

  if (
    (fromStatus === 'paid' && toStatus === 'confirmed') ||
    (fromStatus === 'confirmed' && toStatus === 'in_progress')
  ) {
    return evaluateReadinessInternal({
      eventId,
      tenantId: event.tenantId,
      targetStatus: toStatus,
      admin: true,
    })
  }

  return {
    eventId,
    targetStatus: toStatus,
    ready: true,
    hardBlocked: false,
    confidence: 100,
    contextHash: '',
    counts: { blockers: 0, risks: 0, stale: 0 },
    gates: [],
    blockers: [],
    warnings: [],
    mostLikelyFailurePoint: null,
  }
}

export async function evaluateReadinessForDocumentGeneration(
  eventId: string
): Promise<ReadinessResult | null> {
  const user = await requireChef()
  return evaluateReadinessInternal({
    eventId,
    tenantId: user.tenantId!,
    targetStatus: 'documents',
  })
}

export async function overrideGate(eventId: string, gate: ReadinessGate, reason: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const readiness = await evaluateReadinessInternal({
    eventId,
    tenantId: user.tenantId!,
    targetStatus: 'documents',
  })
  const targetGate = readiness.gates.find((entry) => entry.gate === gate)

  if (!targetGate) {
    throw new Error('Readiness proof not found for this event')
  }

  const normalizedReason = reason.trim()
  if (normalizedReason.length < 3) {
    throw new Error('A brief override reason is required')
  }

  const { error } = await db.from('event_readiness_gates' as any).upsert(
    {
      tenant_id: user.tenantId!,
      event_id: eventId,
      gate,
      status: 'overridden',
      resolved_at: new Date().toISOString(),
      overridden_by: user.id,
      override_reason: normalizedReason,
      metadata: {
        contextHash: readiness.contextHash,
        targetStatus: readiness.targetStatus,
        confidence: readiness.confidence,
        proofStatus: targetGate.status,
      },
    },
    { onConflict: 'event_id,gate' }
  )

  if (error) {
    throw new Error(error.message || 'Failed to override readiness proof')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/execution`)
  revalidatePath(`/events/${eventId}/documents`)
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  return { success: true }
}

export async function overrideReadinessForTransition(
  eventId: string,
  targetStatus: Extract<ReadinessTargetStatus, 'confirmed' | 'in_progress' | 'documents'>,
  reason = `Override acknowledged before ${targetStatus === 'documents' ? 'document generation' : `transition to ${targetStatus}`}`
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const readiness = await evaluateReadinessInternal({
    eventId,
    tenantId: user.tenantId!,
    targetStatus,
  })

  const overrideable = readiness.gates.filter((gate) => gate.isHardBlock)
  if (overrideable.length === 0) {
    return { success: true, count: 0 }
  }

  const rows = overrideable.map((gate) => ({
    tenant_id: user.tenantId!,
    event_id: eventId,
    gate: gate.gate,
    status: 'overridden',
    resolved_at: new Date().toISOString(),
    overridden_by: user.id,
    override_reason: reason,
    metadata: {
      contextHash: readiness.contextHash,
      targetStatus,
      confidence: readiness.confidence,
      proofStatus: gate.status,
    },
  }))

  const { error } = await db.from('event_readiness_gates' as any).upsert(rows, {
    onConflict: 'event_id,gate',
  })

  if (error) {
    throw new Error(error.message || 'Failed to override readiness blockers')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/execution`)
  revalidatePath(`/events/${eventId}/documents`)
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  return { success: true, count: rows.length }
}

export async function getEventReadiness(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const currentStatus = event.status as EventStatus
  const nextTransitionMap: Record<string, ReadinessTargetStatus | null> = {
    draft: null,
    proposed: null,
    accepted: null,
    paid: 'confirmed',
    confirmed: 'in_progress',
    in_progress: 'completed',
    completed: null,
    cancelled: null,
  }

  const nextTarget = nextTransitionMap[currentStatus]
  if (!nextTarget) return null

  return evaluateReadinessInternal({
    eventId,
    tenantId: user.tenantId!,
    targetStatus: nextTarget,
  })
}

export async function getClientAllergyRecords(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_allergy_records')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientAllergyRecords] Error:', error)
    return []
  }

  return data || []
}

export async function confirmAllergyRecord(
  allergyRecordId: string,
  options?: { severity?: string; notes?: string }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {
    confirmed_by_chef: true,
    confirmed_at: new Date().toISOString(),
  }
  if (options?.severity) updateData.severity = options.severity
  if (options?.notes !== undefined) updateData.notes = options.notes

  const { error } = await db
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

export async function dismissAllergyRecord(allergyRecordId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
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

export async function addAllergyRecord(
  clientId: string,
  data: { allergen: string; severity: string; notes?: string }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('client_allergy_records').upsert(
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

  try {
    const { syncStructuredToFlat } = await import('@/lib/dietary/allergy-sync')
    await syncStructuredToFlat({ tenantId: user.tenantId!, clientId, db })
  } catch (syncErr) {
    console.error('[addAllergyRecord] Allergy sync to flat failed (non-blocking):', syncErr)
  }

  try {
    const { recheckUpcomingMenusForClient } = await import('@/lib/dietary/menu-recheck')
    await recheckUpcomingMenusForClient({ tenantId: user.tenantId!, clientId, db })
  } catch (recheckErr) {
    console.error('[addAllergyRecord] Menu recheck failed (non-blocking):', recheckErr)
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

export async function checkMenuAllergyConflicts(eventId: string): Promise<{
  hasConflicts: boolean
  conflicts: Array<{ allergen: string; severity: string; menuItem?: string }>
}> {
  const db: any = createServerClient({ admin: true })

  const { data: event } = await db.from('events').select('client_id').eq('id', eventId).single()

  if (!event?.client_id) return { hasConflicts: false, conflicts: [] }

  const { data: allergies } = await db
    .from('client_allergy_records')
    .select('allergen, severity')
    .eq('client_id', event.client_id)
    .eq('confirmed_by_chef', true)
    .in('severity', ['allergy', 'anaphylaxis'])

  if (!allergies || allergies.length === 0) return { hasConflicts: false, conflicts: [] }

  const { data: components } = await db
    .from('menu_components' as any)
    .select('name, ingredients')
    .eq('event_id', eventId)

  if (!components || components.length === 0) {
    return {
      hasConflicts: false,
      conflicts: allergies.map((allergy: any) => ({
        allergen: allergy.allergen,
        severity: allergy.severity,
      })),
    }
  }

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
        break
      }
    }
  }

  return { hasConflicts: conflicts.length > 0, conflicts }
}
