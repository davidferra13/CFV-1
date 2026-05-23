import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from './types'
import { DOMAIN_LABELS, DOMAIN_SEVERITY_ORDER } from './types'

// #40 Recovery Protocol
// Spiral circuit breaker. Auto-pause non-safety commitments, activate
// Recovery Portfolio, 7-day check-in cadence, gradual re-activation
// over 2 weeks. Post-recovery debrief generation.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export type RecoveryPhase = 'initiated' | 'stabilizing' | 'rebuilding' | 'complete'

export interface RecoveryRecord {
  id: string
  tenantId: string
  phase: RecoveryPhase
  startedAt: Date
  pausedCommitmentIds: string[]
  safetyCommitmentIds: string[]
  checkIns: RecoveryCheckIn[]
  reactivationSchedule: ReactivationEntry[]
  completedAt: Date | null
  debriefNotes: string | null
}

export interface RecoveryCheckIn {
  id: string
  date: Date
  notes: string
  energyLevel: number
  phase: RecoveryPhase
}

export interface ReactivationEntry {
  commitmentId: string
  domain: CommitmentDomain
  scheduledDate: Date
  reactivated: boolean
}

export interface RecoveryDebrief {
  recoveryId: string
  durationDays: number
  pausedCount: number
  reactivatedCount: number
  checkInCount: number
  averageEnergy: number
  lessonsLearned: string[]
  adjustmentsMade: string[]
}

// Safety-critical domains that stay active during recovery
const SAFETY_DOMAINS: CommitmentDomain[] = ['dietary', 'quality', 'contingency']

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    futureSelfletter: row.future_self_letter ?? null,
    seasonalProfile: row.seasonal_profile ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function buildReactivationSchedule(
  pausedCommitments: Commitment[],
  startDate: Date
): ReactivationEntry[] {
  // Re-activate gradually over 14 days, prioritizing lower-severity domains first
  const sorted = [...pausedCommitments].sort((a: Commitment, b: Commitment) => {
    const aIdx = DOMAIN_SEVERITY_ORDER.indexOf(a.domain)
    const bIdx = DOMAIN_SEVERITY_ORDER.indexOf(b.domain)
    return bIdx - aIdx
  })

  const entries: ReactivationEntry[] = []
  const totalDays = 14
  const perBatch = Math.max(1, Math.ceil(sorted.length / 4))

  for (let i = 0; i < sorted.length; i++) {
    const batchIndex = Math.floor(i / perBatch)
    const dayOffset = Math.min(batchIndex * Math.floor(totalDays / 4) + 3, totalDays)
    const scheduledDate = new Date(startDate)
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset)

    entries.push({
      commitmentId: sorted[i].id,
      domain: sorted[i].domain,
      scheduledDate,
      reactivated: false,
    })
  }

  return entries
}

export async function initiateRecovery(tenantId: string): Promise<RecoveryRecord> {
  const client = createServerClient()
  const now = new Date()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (rows || []).map(mapCommitmentRow)

  const safetyIds: string[] = []
  const pauseIds: string[] = []
  const pausedCommitments: Commitment[] = []

  for (const c of commitments) {
    if (SAFETY_DOMAINS.includes(c.domain)) {
      safetyIds.push(c.id)
    } else {
      pauseIds.push(c.id)
      pausedCommitments.push(c)
    }
  }

  if (pauseIds.length > 0) {
    await client
      .from('commitments' as any)
      .update({ status: 'paused', updated_at: now.toISOString() })
      .in('id', pauseIds)
      .eq('tenant_id', tenantId)
  }

  const reactivationSchedule = buildReactivationSchedule(pausedCommitments, now)

  const recovery: RecoveryRecord = {
    id: generateId(),
    tenantId,
    phase: 'initiated',
    startedAt: now,
    pausedCommitmentIds: pauseIds,
    safetyCommitmentIds: safetyIds,
    checkIns: [],
    reactivationSchedule,
    completedAt: null,
    debriefNotes: null,
  }

  await client.from('commitment_recovery' as any).insert({
    id: recovery.id,
    tenant_id: tenantId,
    phase: recovery.phase,
    started_at: now.toISOString(),
    paused_commitment_ids: JSON.stringify(pauseIds),
    safety_commitment_ids: JSON.stringify(safetyIds),
    check_ins: JSON.stringify([]),
    reactivation_schedule: JSON.stringify(reactivationSchedule),
    completed_at: null,
    debrief_notes: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })

  return recovery
}

export async function getRecoveryStatus(tenantId: string): Promise<RecoveryRecord | null> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_recovery' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('completed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!rows || rows.length === 0) return null
  const row = rows[0] as any

  return {
    id: row.id,
    tenantId: row.tenant_id,
    phase: row.phase,
    startedAt: new Date(row.started_at),
    pausedCommitmentIds: JSON.parse(row.paused_commitment_ids || '[]'),
    safetyCommitmentIds: JSON.parse(row.safety_commitment_ids || '[]'),
    checkIns: JSON.parse(row.check_ins || '[]'),
    reactivationSchedule: JSON.parse(row.reactivation_schedule || '[]'),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    debriefNotes: row.debrief_notes,
  }
}

export async function checkIn(
  tenantId: string,
  notes: string,
  energyLevel: number = 5
): Promise<RecoveryRecord | null> {
  const recovery = await getRecoveryStatus(tenantId)
  if (!recovery) return null

  const client = createServerClient()
  const now = new Date()
  const daysSinceStart = Math.floor(
    (now.getTime() - recovery.startedAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  let phase: RecoveryPhase = 'initiated'
  if (daysSinceStart >= 14) phase = 'rebuilding'
  else if (daysSinceStart >= 7) phase = 'stabilizing'

  const checkInEntry: RecoveryCheckIn = {
    id: generateId(),
    date: now,
    notes,
    energyLevel: Math.max(1, Math.min(10, energyLevel)),
    phase,
  }

  recovery.checkIns.push(checkInEntry)
  recovery.phase = phase

  for (const entry of recovery.reactivationSchedule) {
    if (!entry.reactivated && new Date(entry.scheduledDate) <= now) {
      await client
        .from('commitments' as any)
        .update({ status: 'active', updated_at: now.toISOString() })
        .eq('id', entry.commitmentId)
        .eq('tenant_id', tenantId)
      entry.reactivated = true
    }
  }

  await client
    .from('commitment_recovery' as any)
    .update({
      phase,
      check_ins: JSON.stringify(recovery.checkIns),
      reactivation_schedule: JSON.stringify(recovery.reactivationSchedule),
      updated_at: now.toISOString(),
    })
    .eq('id', recovery.id)
    .eq('tenant_id', tenantId)

  return recovery
}

export async function completeRecovery(tenantId: string): Promise<RecoveryDebrief | null> {
  const recovery = await getRecoveryStatus(tenantId)
  if (!recovery) return null

  const client = createServerClient()
  const now = new Date()

  const stillPaused = recovery.reactivationSchedule.filter((e: ReactivationEntry) => !e.reactivated)
  for (const entry of stillPaused) {
    await client
      .from('commitments' as any)
      .update({ status: 'active', updated_at: now.toISOString() })
      .eq('id', entry.commitmentId)
      .eq('tenant_id', tenantId)
    entry.reactivated = true
  }

  const durationDays = Math.floor(
    (now.getTime() - recovery.startedAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  const reactivatedCount = recovery.reactivationSchedule.filter((e: ReactivationEntry) => e.reactivated).length
  const avgEnergy =
    recovery.checkIns.length > 0
      ? recovery.checkIns.reduce((sum: number, c: RecoveryCheckIn) => sum + c.energyLevel, 0) / recovery.checkIns.length
      : 0

  const lessonsLearned: string[] = []
  const adjustmentsMade: string[] = []

  if (recovery.pausedCommitmentIds.length > 5) {
    lessonsLearned.push('Many commitments were paused. Consider whether all are necessary.')
  }
  if (avgEnergy < 4) {
    lessonsLearned.push('Energy stayed low during recovery. External stressors may need addressing.')
  }
  if (durationDays > 21) {
    lessonsLearned.push('Recovery took longer than typical. Consider lighter commitment load going forward.')
  }

  adjustmentsMade.push('Paused ' + recovery.pausedCommitmentIds.length + ' commitments')
  adjustmentsMade.push('Maintained ' + recovery.safetyCommitmentIds.length + ' safety commitments')
  adjustmentsMade.push(recovery.checkIns.length + ' check-ins completed')

  const debrief: RecoveryDebrief = {
    recoveryId: recovery.id,
    durationDays,
    pausedCount: recovery.pausedCommitmentIds.length,
    reactivatedCount,
    checkInCount: recovery.checkIns.length,
    averageEnergy: Math.round(avgEnergy * 10) / 10,
    lessonsLearned,
    adjustmentsMade,
  }

  await client
    .from('commitment_recovery' as any)
    .update({
      phase: 'complete',
      completed_at: now.toISOString(),
      reactivation_schedule: JSON.stringify(recovery.reactivationSchedule),
      debrief_notes: JSON.stringify(debrief),
      updated_at: now.toISOString(),
    })
    .eq('id', recovery.id)
    .eq('tenant_id', tenantId)

  return debrief
}