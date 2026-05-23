import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS } from '@/lib/commitment/types'

// Quarterly Audit (#43): "Is this still me?"
// Surfaces commitments for review, prevents zombie rules.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id, tenantId: row.tenant_id, domain: row.domain, source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status, frictionLevel: row.friction_level, overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak, longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter, seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
  }
}

export type AuditDecision = 'keep' | 'adjust' | 'retire'

export interface AuditPrompt {
  tenantId: string
  quarterLabel: string
  commitmentCount: number
  commitments: AuditCommitmentView[]
  zombieCount: number
  staleCount: number
  isDue: boolean
  lastAuditDate: Date | null
}

export interface AuditCommitmentView {
  commitment: Commitment
  domainLabel: string
  overridesLast90: number
  streakDays: number
  healthStatus: 'healthy' | 'struggling' | 'zombie' | 'stale'
  suggestedAction: AuditDecision
  reason: string
}

export interface AuditRecord {
  id: string
  tenantId: string
  commitmentId: string
  decision: AuditDecision
  previousRule: Record<string, unknown> | null
  notes: string | null
  quarter: string
  createdAt: Date
}

/**
 * Generate an audit prompt with all commitments categorized by health.
 */
export async function generateAuditPrompt(tenantId: string): Promise<AuditPrompt> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = ((rows ?? []) as any[]).map(mapCommitmentRow)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const views: AuditCommitmentView[] = []
  let zombieCount = 0
  let staleCount = 0

  for (const c of commitments) {
    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('id, created_at')
      .eq('commitment_id', c.id)
      .gte('created_at', ninetyDaysAgo.toISOString())

    const overridesLast90 = (overrideRows ?? []).length

    let healthStatus: AuditCommitmentView['healthStatus'] = 'healthy'
    let suggestedAction: AuditDecision = 'keep'
    let reason = 'On track. No changes needed.'

    if (c.overrideCount > 0 && c.currentStreak === 0 && overridesLast90 >= 5) {
      healthStatus = 'zombie'
      suggestedAction = 'retire'
      reason = 'Overridden ' + overridesLast90 + ' times in 90 days with no active streak. This rule may no longer reflect your practice.'
      zombieCount++
    } else if (overridesLast90 === 0 && c.currentStreak === 0 && c.overrideCount === 0) {
      const daysSinceCreation = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation > 90) {
        healthStatus = 'stale'
        suggestedAction = 'adjust'
        reason = 'No activity in 90+ days. Consider whether this commitment is being evaluated or is irrelevant.'
        staleCount++
      }
    } else if (overridesLast90 >= 3) {
      healthStatus = 'struggling'
      suggestedAction = 'adjust'
      reason = overridesLast90 + ' overrides in 90 days. Consider adjusting the threshold or adding more friction.'
    }

    views.push({ commitment: c, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain, overridesLast90, streakDays: c.currentStreak, healthStatus, suggestedAction, reason })
  }

  const now = new Date()
  const quarter = 'Q' + Math.ceil((now.getMonth() + 1) / 3) + ' ' + now.getFullYear()

  const { data: auditRows } = await client
    .from('commitment_audit_log' as any)
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastAuditDate = auditRows && auditRows.length > 0 ? new Date((auditRows[0] as any).created_at) : null
  const isDue = !lastAuditDate || (Date.now() - lastAuditDate.getTime()) > 90 * 24 * 60 * 60 * 1000

  return { tenantId, quarterLabel: quarter, commitmentCount: commitments.length, commitments: views, zombieCount, staleCount, isDue, lastAuditDate }
}

/**
 * Get commitments that need review (zombie, stale, or struggling).
 */
export async function getCommitmentsForReview(tenantId: string): Promise<AuditCommitmentView[]> {
  const prompt = await generateAuditPrompt(tenantId)
  return prompt.commitments.filter((c) => c.healthStatus !== 'healthy')
}

/**
 * Process an audit decision for a commitment.
 */
export async function processAuditDecision(
  tenantId: string,
  commitmentId: string,
  decision: AuditDecision,
  notes?: string
): Promise<AuditRecord> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date()
  const quarter = 'Q' + Math.ceil((now.getMonth() + 1) / 3) + ' ' + now.getFullYear()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .limit(1)

  const previousRule = commitmentRows && commitmentRows.length > 0 ? (commitmentRows[0] as any).rule : null

  await client.from('commitment_audit_log' as any).insert({
    id, tenant_id: tenantId, commitment_id: commitmentId, decision,
    previous_rule: typeof previousRule === 'string' ? previousRule : JSON.stringify(previousRule),
    notes: notes ?? null, quarter, created_at: now.toISOString(),
  })

  if (decision === 'retire') {
    await client
      .from('commitments' as any)
      .update({ status: 'dismissed', updated_at: now.toISOString() })
      .eq('id', commitmentId)
      .eq('tenant_id', tenantId)
  }

  return {
    id, tenantId, commitmentId, decision,
    previousRule: typeof previousRule === 'object' ? previousRule : null,
    notes: notes ?? null, quarter, createdAt: now,
  }
}

/**
 * Get audit history for this tenant.
 */
export async function getAuditHistory(tenantId: string): Promise<AuditRecord[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_audit_log' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return ((rows ?? []) as any[]).map((r) => ({
    id: r.id as string, tenantId: r.tenant_id as string, commitmentId: r.commitment_id as string,
    decision: r.decision as AuditDecision,
    previousRule: r.previous_rule ? (typeof r.previous_rule === 'string' ? JSON.parse(r.previous_rule) : r.previous_rule) : null,
    notes: r.notes as string | null, quarter: r.quarter as string, createdAt: new Date(r.created_at as string),
  }))
}
