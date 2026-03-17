// Shared constants for client lifetime value display.
// Extracted from lifetime-value-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export function getClientTier(eventCount: number): 'new' | 'regular' | 'vip' | 'champion' {
  if (eventCount >= 20) return 'champion'
  if (eventCount >= 10) return 'vip'
  if (eventCount >= 3) return 'regular'
  return 'new'
}

export const TIER_CONFIG = {
  new: { label: 'New', color: 'bg-stone-800 text-stone-300 ring-1 ring-inset ring-stone-600' },
  regular: { label: 'Regular', color: 'bg-blue-950 text-blue-400 ring-1 ring-inset ring-blue-800' },
  vip: { label: 'VIP', color: 'bg-amber-950 text-amber-400 ring-1 ring-inset ring-amber-800' },
  champion: {
    label: 'Champion',
    color: 'bg-emerald-950 text-emerald-400 ring-1 ring-inset ring-emerald-800',
  },
} as const
