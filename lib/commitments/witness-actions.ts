'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, OverrideCategory } from '@/lib/commitment/types'
import type { CommitmentWitness, WitnessDigest, WitnessNotification } from './witness-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

function fail<T>(error: string): ActionResult<T> {
  return { success: false, error }
}

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapWitnessRow(row: Record<string, unknown>): CommitmentWitness {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    witnessName: row.witness_name as string,
    witnessEmail: row.witness_email as string,
    designatedAt: new Date(row.designated_at as string),
    optInConfirmed: (row.opt_in_confirmed as boolean) ?? false,
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Designate a human witness for Tier 4+ commitment override notifications.
 * Each chef can have multiple witnesses.
 */
export async function designateWitness(
  witnessName: string,
  witnessEmail: string
): Promise<ActionResult<CommitmentWitness>> {
  try {
    if (!witnessName || typeof witnessName !== 'string' || witnessName.trim().length === 0) {
      return fail('Witness name is required')
    }
    if (!witnessEmail || typeof witnessEmail !== 'string' || !witnessEmail.includes('@')) {
      return fail('Valid witness email is required')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    // Check for duplicate email
    const { data: existing } = await client
      .from('commitment_witnesses' as any)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('witness_email', witnessEmail.trim().toLowerCase())
      .limit(1)

    if (existing && existing.length > 0) {
      return fail('A witness with this email is already designated')
    }

    const id = generateId()
    const now = new Date().toISOString()

    const row = {
      id,
      tenant_id: tenantId,
      witness_name: witnessName.trim(),
      witness_email: witnessEmail.trim().toLowerCase(),
      designated_at: now,
      opt_in_confirmed: false,
    }

    const { error } = await client.from('commitment_witnesses' as any).insert(row)

    if (error) {
      throw new Error(`Failed to designate witness: ${error.message}`)
    }

    return ok(mapWitnessRow(row as any))
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to designate witness')
  }
}

/**
 * Generate a digest of recent overrides for a witness.
 * Returns structured data suitable for composing a notification.
 */
export async function getWitnessDigest(
  witnessId: string,
  periodDays: number = 7
): Promise<ActionResult<WitnessDigest>> {
  try {
    if (!witnessId || typeof witnessId !== 'string') {
      return fail('Invalid witness ID')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    // Fetch the witness
    const { data: witnessRows, error: witnessErr } = await client
      .from('commitment_witnesses' as any)
      .select('*')
      .eq('id', witnessId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (witnessErr || !witnessRows || witnessRows.length === 0) {
      return fail('Witness not found')
    }

    const witness = mapWitnessRow(witnessRows[0] as Record<string, unknown>)

    // Fetch overrides in the period
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)
    const periodEnd = new Date()

    const { data: overrideRows, error: overrideErr } = await client
      .from('commitment_overrides' as any)
      .select('id, commitment_id, category, reason, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false })

    if (overrideErr) {
      return fail(`Failed to load overrides: ${overrideErr.message}`)
    }

    const overrides = (overrideRows ?? []) as Array<{
      id: string
      commitment_id: string
      category: OverrideCategory | null
      reason: string
      created_at: string
    }>

    // Fetch commitment domains
    const commitmentIds = [...new Set(overrides.map((o) => o.commitment_id))]
    const domainMap = new Map<string, CommitmentDomain>()

    if (commitmentIds.length > 0) {
      const { data: commitments } = await client
        .from('commitments' as any)
        .select('id, domain')
        .in('id', commitmentIds)

      for (const c of (commitments ?? []) as Array<{ id: string; domain: CommitmentDomain }>) {
        domainMap.set(c.id, c.domain)
      }
    }

    const digestOverrides = overrides.map((o) => ({
      commitmentDomain: domainMap.get(o.commitment_id) ?? 'unknown',
      reason: o.reason,
      category: o.category,
      overriddenAt: new Date(o.created_at),
    }))

    // Build summary
    const domainCounts = new Map<string, number>()
    for (const o of digestOverrides) {
      domainCounts.set(o.commitmentDomain, (domainCounts.get(o.commitmentDomain) ?? 0) + 1)
    }

    const domainSummaryParts = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([d, c]) => `${d} (${c})`)

    const summary =
      digestOverrides.length === 0
        ? `No overrides in the last ${periodDays} days.`
        : `${digestOverrides.length} override${digestOverrides.length === 1 ? '' : 's'} in the last ${periodDays} days. Domains: ${domainSummaryParts.join(', ')}.`

    return ok({
      witness,
      overrides: digestOverrides,
      period: { from: periodStart, to: periodEnd },
      totalOverrides: digestOverrides.length,
      summary,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to generate witness digest')
  }
}

/**
 * Construct a notification message for a witness (does not send email).
 * Returns the composed message data for the caller to handle delivery.
 */
export async function notifyWitness(
  witnessId: string,
  periodDays: number = 7
): Promise<ActionResult<WitnessNotification>> {
  try {
    const digestResult = await getWitnessDigest(witnessId, periodDays)
    if (!digestResult.success || !digestResult.data) {
      return fail(digestResult.error ?? 'Could not generate digest')
    }

    const digest = digestResult.data
    const { witness, overrides, summary } = digest

    // Build plain-text body
    const lines: string[] = [
      `Hi ${witness.witnessName},`,
      '',
      `Here is the commitment override digest for the last ${periodDays} days.`,
      '',
      summary,
    ]

    if (overrides.length > 0) {
      lines.push('', 'Details:')
      for (const o of overrides) {
        const dateStr = o.overriddenAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        const catStr = o.category ? ` [${o.category}]` : ''
        lines.push(`  - ${dateStr}: ${o.commitmentDomain}${catStr} -- ${o.reason}`)
      }
    }

    lines.push(
      '',
      'This digest was generated by ChefFlow Commitment System.',
      'You were designated as an accountability witness.'
    )

    const notification: WitnessNotification = {
      to: witness.witnessEmail,
      toName: witness.witnessName,
      subject: `Commitment Override Digest (${overrides.length} override${overrides.length === 1 ? '' : 's'})`,
      body: lines.join('\n'),
      generatedAt: new Date(),
    }

    return ok(notification)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to construct witness notification')
  }
}

/**
 * Remove a designated witness.
 */
export async function removeWitness(witnessId: string): Promise<ActionResult> {
  try {
    if (!witnessId || typeof witnessId !== 'string') {
      return fail('Invalid witness ID')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    const { data: existing } = await client
      .from('commitment_witnesses' as any)
      .select('id')
      .eq('id', witnessId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!existing || existing.length === 0) {
      return fail('Witness not found')
    }

    const { error } = await client
      .from('commitment_witnesses' as any)
      .delete()
      .eq('id', witnessId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to remove witness: ${error.message}`)
    }

    return ok()
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to remove witness')
  }
}
