'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { scoreCollabRecipientSuggestion as scoreCollabSuggestion } from '@/lib/network/collab-logic'
import { z } from 'zod'
import { SuggestRecipientsSchema } from './schemas'
import { availabilitySignalsTable, trustedCircleTable } from './tables'
import { getChefCardsById, getConnectedChefIds } from './helpers'
import type { AvailabilityStatus, CollabRecipientSuggestion, TrustLevel } from './types'

export async function getCollabRecipientSuggestions(
  input: z.infer<typeof SuggestRecipientsSchema>
): Promise<CollabRecipientSuggestion[]> {
  const user = await requireChef()
  const validated = SuggestRecipientsSchema.parse(input)
  const db = createServerClient({ admin: true })

  const connectedIds = Array.from(await getConnectedChefIds(db, user.entityId))
  if (connectedIds.length === 0) return []

  const chefCards = await getChefCardsById(db, connectedIds)
  const trustedRows = await trustedCircleTable(db)
    .select('trusted_chef_id, trust_level')
    .eq('chef_id', user.entityId)
  const trustedMap = new Map<string, TrustLevel>()
  for (const row of (trustedRows.data ?? []) as any[]) {
    trustedMap.set(row.trusted_chef_id, row.trust_level as TrustLevel)
  }

  const boundaryDate =
    validated.eventDate ??
    ((_d) =>
      `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  const { data: signalRows } = await availabilitySignalsTable(db)
    .select(
      'chef_id, date_start, date_end, region_text, cuisines, max_guest_count, status, share_with_trusted_only, updated_at'
    )
    .in('chef_id', connectedIds)
    .gte('date_end', boundaryDate)
    .order('updated_at', { ascending: false })

  const signalByChef = new Map<string, any[]>()
  for (const row of (signalRows ?? []) as any[]) {
    const trustLevel = trustedMap.get(row.chef_id) ?? null
    if (row.share_with_trusted_only && !trustLevel) continue
    const list = signalByChef.get(row.chef_id) ?? []
    list.push(row)
    signalByChef.set(row.chef_id, list)
  }

  const suggestions: CollabRecipientSuggestion[] = []
  for (const chefId of connectedIds) {
    const chef = chefCards.get(chefId)
    if (!chef) continue

    const trustLevel = trustedMap.get(chefId) ?? null
    const candidateSignals = signalByChef.get(chefId) ?? []
    const baseline = scoreCollabSuggestion({
      trustLevel,
      signal: null,
      eventDate: validated.eventDate ?? null,
      guestCount: validated.guestCount ?? null,
      locationText: validated.locationText ?? null,
      cuisines: validated.cuisines ?? [],
    })

    let best = baseline
    for (const signal of candidateSignals) {
      const current = scoreCollabSuggestion({
        trustLevel,
        signal: {
          date_start: signal.date_start,
          date_end: signal.date_end,
          region_text: signal.region_text ?? null,
          cuisines: signal.cuisines ?? [],
          max_guest_count: signal.max_guest_count ?? null,
          status: signal.status as AvailabilityStatus,
        },
        eventDate: validated.eventDate ?? null,
        guestCount: validated.guestCount ?? null,
        locationText: validated.locationText ?? null,
        cuisines: validated.cuisines ?? [],
      })
      if (current.score > best.score) best = current
    }

    suggestions.push({
      chef,
      trust_level: trustLevel,
      score: best.score,
      reasons: best.reasons.slice(0, 3),
      has_active_signal: best.hasActiveSignal,
    })
  }

  return suggestions
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const nameA = (a.chef.display_name ?? a.chef.business_name).toLowerCase()
      const nameB = (b.chef.display_name ?? b.chef.business_name).toLowerCase()
      return nameA.localeCompare(nameB)
    })
    .slice(0, validated.maxResults ?? 8)
}
