import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from './types'

// ── Future Self Letters ─────────────────────────────────────────────────────
// When a chef sets a commitment, they write a note to their future self
// explaining WHY this commitment matters. During override ceremony, this
// letter is shown to remind them of their original reasoning.

export interface FutureSelfletter {
  commitmentId: string
  domain: CommitmentDomain
  letter: string
  writtenAt: Date
}

/**
 * Save a future-self letter for a commitment.
 * Stored in the commitment record's future_self_letter column.
 */
export async function saveFutureSelfletter(
  commitmentId: string,
  tenantId: string,
  letter: string
): Promise<void> {
  if (!letter || letter.trim().length === 0) return

  const client = createServerClient()
  const { error } = await client
    .from('commitments' as any)
    .update({
      future_self_letter: letter.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`[commitment/future-self] save failed: ${error.message}`)
  }
}

/**
 * Get the future-self letter for a specific commitment.
 * Returns null if no letter exists.
 */
export async function getFutureSelfletter(
  commitmentId: string,
  tenantId: string
): Promise<FutureSelfletter | null> {
  const client = createServerClient()

  const { data, error } = await client
    .from('commitments' as any)
    .select('id, domain, future_self_letter, created_at')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null

  const letter = data.future_self_letter as string | null
  if (!letter) return null

  return {
    commitmentId: data.id as string,
    domain: data.domain as CommitmentDomain,
    letter,
    writtenAt: new Date(data.created_at as string),
  }
}

/**
 * Get all future-self letters for a tenant's active commitments.
 * Useful for displaying during override ceremonies or commitment reviews.
 */
export async function getAllFutureSelfletters(
  tenantId: string
): Promise<FutureSelfletter[]> {
  const client = createServerClient()

  const { data, error } = await client
    .from('commitments' as any)
    .select('id, domain, future_self_letter, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('future_self_letter', 'is', null)

  if (error || !data) return []

  return data
    .filter((row: any) => row.future_self_letter)
    .map((row: any) => ({
      commitmentId: row.id as string,
      domain: row.domain as CommitmentDomain,
      letter: row.future_self_letter as string,
      writtenAt: new Date(row.created_at as string),
    }))
}

/**
 * Format a future-self letter for display during override ceremony.
 * Adds context framing to make the reminder more impactful.
 */
export function formatLetterForOverride(letter: FutureSelfletter): string {
  const daysAgo = Math.floor(
    (Date.now() - letter.writtenAt.getTime()) / (24 * 60 * 60 * 1000)
  )

  const timeLabel =
    daysAgo === 0
      ? 'earlier today'
      : daysAgo === 1
        ? 'yesterday'
        : daysAgo < 30
          ? `${daysAgo} days ago`
          : daysAgo < 365
            ? `${Math.floor(daysAgo / 30)} months ago`
            : `over a year ago`

  return `You wrote this to yourself ${timeLabel}:\n\n"${letter.letter}"`
}
