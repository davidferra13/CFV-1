// Health score display constants — pure, no 'use server', no DB access.
// Extracted here so they can be imported by both server and client components.

import type { ClientHealthTier } from './health-score'

export const TIER_LABELS: Record<ClientHealthTier, string> = {
  champion: 'Champion',
  loyal: 'Loyal',
  at_risk: 'At Risk',
  dormant: 'Dormant',
  new: 'New',
}

export const TIER_COLORS: Record<ClientHealthTier, string> = {
  champion: 'bg-emerald-100 text-emerald-800',
  loyal: 'bg-brand-100 text-brand-800',
  at_risk: 'bg-amber-100 text-amber-800',
  dormant: 'bg-stone-100 text-stone-600',
  new: 'bg-blue-100 text-blue-800',
}
