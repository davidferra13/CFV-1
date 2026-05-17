'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import type {
  GuestCountStage,
  GuestCountChange,
  ImpactAssessment,
  ChangeSeverity,
  CutoffPolicyMode,
  CutoffPolicy,
  GuestCountSummary,
} from './guest-count-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function classifySeverity(delta: number): ChangeSeverity {
  const abs = Math.abs(delta)
  if (abs <= 2) return 'minor'
  if (abs <= 5) return 'moderate'
  return 'major'
}

function buildImpact(fromCount: number, toCount: number): ImpactAssessment {
  const delta = toCount - fromCount
  const severity = classifySeverity(delta)

  const portionsNote =
    severity === 'minor'
      ? 'No action needed. Prep as planned.'
      : severity === 'moderate'
        ? `Adjust portions for ${Math.abs(delta)} ${delta > 0 ? 'additional' : 'fewer'} guests.`
        : `Significant change: review all portion calculations for ${toCount} guests.`

  const variantsNote =
    severity === 'minor'
      ? 'Variant counts unchanged.'
      : 'Dietary variant counts may have changed. Review guest dietary info.'

  const shoppingNote =
    severity === 'minor'
      ? 'Shopping list unchanged. Slight surplus expected.'
      : severity === 'moderate'
        ? `Shopping list may need adjustment for ${Math.abs(delta)} guests.`
        : 'Shopping list needs full review for the new guest count.'

  const pricingNote =
    delta === 0
      ? 'No pricing impact.'
      : `Guest count changed by ${delta > 0 ? '+' : ''}${delta}. Invoice may need adjustment based on pricing model.`

  return {
    severity,
    delta,
    message:
      severity === 'minor'
        ? `Guest count: ${fromCount} -> ${toCount}. No action needed.`
        : severity === 'moderate'
          ? `${Math.abs(delta)} guest${Math.abs(delta) > 1 ? 's' : ''} ${delta > 0 ? 'added' : 'removed'}. Review recommended.`
          : `Major change: ${fromCount} -> ${toCount}. Chef must review and acknowledge.`,
    portions: { affected: severity !== 'minor', note: portionsNote },
    variants: { affected: severity !== 'minor', note: variantsNote },
    shopping: { affected: severity !== 'minor', note: shoppingNote },
    pricing: {
      affected: delta !== 0,
      note: pricingNote,
      quoted_total_cents: null,
      projected_total_cents: null,
      difference_cents: null,
    },
  }
}

// ── Update Guest Count ────────────────────────────────────────────────────────

export async function updateGuestCount(
  eventId: string,
  stage: GuestCountStage,
  count: number,
  reason?: string
): Promise<GuestCountChange> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventId || !stage || count < 0) {
    throw new UnknownAppError('Invalid guest count parameters')
  }

  // Get the current count for this stage from the most recent change
  let fromCount = 0
  const { data: lastChange } = await db
    .from('guest_count_changes')
    .select('to_count')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('stage', stage)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single()

  if (lastChange) {
    fromCount = lastChange.to_count
  } else {
    // Fall back to the event's guest_count column if no prior changes
    try {
      const { data: event } = await db
        .from('events')
        .select('guest_count')
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .single()
      if (event?.guest_count) {
        fromCount = event.guest_count
      }
    } catch {
      // Non-blocking: use 0 if event lookup fails
      console.error('Could not read event guest_count for', eventId)
    }
  }

  // No change needed
  if (fromCount === count) {
    throw new UnknownAppError('Guest count is already set to this value')
  }

  const impact = buildImpact(fromCount, count)

  // Try to enrich pricing from event quote data
  try {
    const { data: event } = await db
      .from('events')
      .select('price_per_head_cents')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (event?.price_per_head_cents) {
      impact.pricing.quoted_total_cents = fromCount * event.price_per_head_cents
      impact.pricing.projected_total_cents = count * event.price_per_head_cents
      impact.pricing.difference_cents =
        impact.pricing.projected_total_cents - impact.pricing.quoted_total_cents
    }
  } catch {
    // Non-blocking: pricing enrichment is optional
    console.error('Could not enrich pricing data for', eventId)
  }

  const { data: change, error } = await db
    .from('guest_count_changes')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      from_count: fromCount,
      to_count: count,
      stage,
      changed_by: user.id,
      reason: reason ?? null,
      impact_json: impact,
    })
    .select()
    .single()

  if (error) throw new UnknownAppError('Failed to record guest count change')

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)

  return change as GuestCountChange
}

// ── Get Guest Count History ───────────────────────────────────────────────────

export async function getGuestCountHistory(
  eventId: string
): Promise<GuestCountChange[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guest_count_changes')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })

  if (error) throw new UnknownAppError('Failed to fetch guest count history')

  return (data ?? []) as GuestCountChange[]
}

// ── Get Guest Count Impact (Preview) ──────────────────────────────────────────

export async function getGuestCountImpact(
  eventId: string,
  newCount: number
): Promise<ImpactAssessment> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (newCount < 0) {
    throw new UnknownAppError('Guest count cannot be negative')
  }

  // Get current effective count (latest change across any stage, or event default)
  let currentCount = 0

  const { data: lastChange } = await db
    .from('guest_count_changes')
    .select('to_count')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single()

  if (lastChange) {
    currentCount = lastChange.to_count
  } else {
    try {
      const { data: event } = await db
        .from('events')
        .select('guest_count')
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .single()
      if (event?.guest_count) {
        currentCount = event.guest_count
      }
    } catch {
      console.error('Could not read event guest_count for impact preview', eventId)
    }
  }

  const impact = buildImpact(currentCount, newCount)

  // Enrich pricing
  try {
    const { data: event } = await db
      .from('events')
      .select('price_per_head_cents')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (event?.price_per_head_cents) {
      impact.pricing.quoted_total_cents = currentCount * event.price_per_head_cents
      impact.pricing.projected_total_cents = newCount * event.price_per_head_cents
      impact.pricing.difference_cents =
        impact.pricing.projected_total_cents - impact.pricing.quoted_total_cents
    }
  } catch {
    console.error('Could not enrich pricing for impact preview', eventId)
  }

  return impact
}

// ── Set Guest Count Cutoff ────────────────────────────────────────────────────

export async function setGuestCountCutoff(
  eventId: string,
  cutoffDate: string,
  policy: CutoffPolicyMode,
  message?: string
): Promise<CutoffPolicy> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventId || !cutoffDate || !policy) {
    throw new UnknownAppError('Missing cutoff policy parameters')
  }

  // Upsert: one cutoff policy per event per tenant
  const { data: existing } = await db
    .from('event_cutoff_policies')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()

  let result: CutoffPolicy

  if (existing) {
    const { data: updated, error } = await db
      .from('event_cutoff_policies')
      .update({
        cutoff_date: cutoffDate,
        mode: policy,
        message: message ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new UnknownAppError('Failed to update cutoff policy')
    result = updated as CutoffPolicy
  } else {
    const { data: created, error } = await db
      .from('event_cutoff_policies')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        cutoff_date: cutoffDate,
        mode: policy,
        message: message ?? null,
      })
      .select()
      .single()

    if (error) throw new UnknownAppError('Failed to create cutoff policy')
    result = created as CutoffPolicy
  }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)

  return result
}

// ── Get Guest Count Summary ───────────────────────────────────────────────────

export async function getGuestCountSummary(
  eventId: string
): Promise<GuestCountSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get latest count per stage
  const { data: changes } = await db
    .from('guest_count_changes')
    .select('stage, to_count, changed_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })

  const stageCounts: Record<string, number | null> = {
    quoted: null,
    confirmed: null,
    final: null,
    actual: null,
  }

  // Take the most recent value per stage
  if (changes) {
    for (const row of changes as Array<{ stage: string; to_count: number }>) {
      if (stageCounts[row.stage] === null) {
        stageCounts[row.stage] = row.to_count
      }
    }
  }

  // Fall back to event.guest_count for quoted if no explicit change recorded
  if (stageCounts.quoted === null) {
    try {
      const { data: event } = await db
        .from('events')
        .select('guest_count')
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .single()
      if (event?.guest_count) {
        stageCounts.quoted = event.guest_count
      }
    } catch {
      console.error('Could not read fallback guest_count for summary', eventId)
    }
  }

  // Get cutoff policy
  let cutoff: CutoffPolicy | null = null
  const { data: cutoffData } = await db
    .from('event_cutoff_policies')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()

  if (cutoffData) {
    cutoff = cutoffData as CutoffPolicy
  }

  // Get latest change overall
  let latestChange: GuestCountChange | null = null
  if (changes && (changes as unknown[]).length > 0) {
    latestChange = (changes as GuestCountChange[])[0]
  }

  return {
    event_id: eventId,
    quoted: stageCounts.quoted,
    confirmed: stageCounts.confirmed,
    final: stageCounts.final,
    actual: stageCounts.actual,
    cutoff,
    latest_change: latestChange,
  }
}
