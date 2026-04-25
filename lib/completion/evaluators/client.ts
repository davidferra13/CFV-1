// Completion Evaluator - Client
// Wraps existing getClientProfileCompleteness() and maps to CompletionResult.

import { pgClient } from '@/lib/db/index'
import {
  getClientProfileCompleteness,
  type ProfileCompletenessResult,
} from '@/lib/clients/completeness'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

export async function evaluateClient(
  clientId: string,
  tenantId: string
): Promise<CompletionResult | null> {
  const [client] = await pgClient<Record<string, any>[]>`
    SELECT *
    FROM clients
    WHERE id = ${clientId} AND tenant_id = ${tenantId}
  `
  if (!client) return null

  const profile: ProfileCompletenessResult = getClientProfileCompleteness(client)
  const clientUrl = `/clients/${clientId}`

  // Map existing completeness fields to requirements
  const reqs: CompletionRequirement[] = [
    {
      key: 'allergies',
      label: 'Allergies confirmed',
      met: Array.isArray(client.allergies) && client.allergies.length > 0,
      blocking: true,
      weight: 14,
      category: 'safety',
      actionUrl: clientUrl,
      actionLabel: 'Confirm allergies',
    },
    {
      key: 'dietary',
      label: 'Dietary restrictions',
      met: Array.isArray(client.dietary_restrictions) && client.dietary_restrictions.length > 0,
      blocking: false,
      weight: 11,
      category: 'safety',
      actionUrl: clientUrl,
      actionLabel: 'Add dietary info',
    },
    {
      key: 'contact',
      label: 'Contact info (phone or email)',
      met:
        (typeof client.phone === 'string' && client.phone.trim().length > 0) ||
        (typeof client.email === 'string' && client.email.trim().length > 0),
      blocking: true,
      weight: 7,
      category: 'profile',
      actionUrl: clientUrl,
      actionLabel: 'Add contact info',
    },
    {
      key: 'kitchen_constraints',
      label: 'Kitchen constraints',
      met:
        typeof client.kitchen_constraints === 'string' &&
        client.kitchen_constraints.trim().length > 0,
      blocking: false,
      weight: 7,
      category: 'logistics',
      actionUrl: clientUrl,
      actionLabel: 'Document kitchen',
    },
    {
      key: 'cuisines',
      label: 'Preferred cuisines',
      met: Array.isArray(client.favorite_cuisines) && client.favorite_cuisines.length > 0,
      blocking: false,
      weight: 5,
      category: 'profile',
      actionUrl: clientUrl,
      actionLabel: 'Set cuisine prefs',
    },
    {
      key: 'dislikes',
      label: 'Dislikes documented',
      met: Array.isArray(client.dislikes) && client.dislikes.length > 0,
      blocking: false,
      weight: 5,
      category: 'safety',
      actionUrl: clientUrl,
      actionLabel: 'Add dislikes',
    },
    {
      key: 'vibe',
      label: 'Vibe notes',
      met: typeof client.vibe_notes === 'string' && client.vibe_notes.trim().length > 0,
      blocking: false,
      weight: 5,
      category: 'profile',
      actionUrl: clientUrl,
      actionLabel: 'Add vibe notes',
    },
    {
      key: 'remaining_profile',
      label: 'Extended profile fields',
      met: profile.score >= 60,
      blocking: false,
      weight: 26,
      category: 'profile',
      actionUrl: clientUrl,
      actionLabel: 'Complete profile',
    },
    // New fields not in existing completeness.ts
    {
      key: 'has_event',
      label: 'Has at least 1 event',
      met: Number(client.total_events_count || 0) > 0,
      blocking: false,
      weight: 10,
      category: 'profile',
    },
    {
      key: 'valid_contact',
      label: 'Has verified contact method',
      met:
        (typeof client.email === 'string' && client.email.includes('@')) ||
        (typeof client.phone === 'string' && client.phone.replace(/\D/g, '').length >= 10),
      blocking: false,
      weight: 10,
      category: 'communication',
      actionUrl: clientUrl,
      actionLabel: 'Verify contact',
    },
  ]

  return buildResult('client', clientId, reqs, {
    entityLabel: client.full_name || 'Unnamed client',
  })
}
