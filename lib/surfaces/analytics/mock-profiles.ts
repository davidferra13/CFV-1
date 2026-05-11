/**
 * Mock usage profiles for development and testing.
 * DO NOT use in production. These seed deterministic usage data
 * so the adaptive surface system can be tested without real traffic.
 */

import { pgClient } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

type MockEvent = {
  route_path: string
  event_type: 'visit' | 'action' | 'pin' | 'unpin' | 'dismiss' | 'restore' | 'search_hit'
  count: number
}

type MockProfile = {
  description: string
  events: readonly MockEvent[]
}

// ── Profiles ───────────────────────────────────────────────────────────────

export const MOCK_PROFILES = {
  'new-chef': {
    description: 'Brand new chef, first week. Focused on core workflows.',
    events: [
      { route_path: '/dashboard', event_type: 'visit', count: 15 },
      { route_path: '/events', event_type: 'visit', count: 8 },
      { route_path: '/events/new', event_type: 'visit', count: 3 },
      { route_path: '/clients', event_type: 'visit', count: 5 },
      { route_path: '/clients/new', event_type: 'visit', count: 2 },
      { route_path: '/recipes', event_type: 'visit', count: 4 },
      { route_path: '/recipes/new', event_type: 'visit', count: 2 },
      { route_path: '/menus', event_type: 'visit', count: 3 },
      { route_path: '/settings', event_type: 'visit', count: 2 },
      { route_path: '/onboarding', event_type: 'visit', count: 4 },
      { route_path: '/remy', event_type: 'visit', count: 6 },
      { route_path: '/calendar', event_type: 'visit', count: 3 },
      { route_path: '/dashboard', event_type: 'action', count: 5 },
      { route_path: '/events/new', event_type: 'action', count: 3 },
      { route_path: '/clients/new', event_type: 'action', count: 2 },
    ],
  },
  'established-chef': {
    description: 'Chef with 3+ months of usage. Broader surface engagement.',
    events: [
      { route_path: '/dashboard', event_type: 'visit', count: 120 },
      { route_path: '/events', event_type: 'visit', count: 85 },
      { route_path: '/events/new', event_type: 'visit', count: 25 },
      { route_path: '/events/board', event_type: 'visit', count: 40 },
      { route_path: '/clients', event_type: 'visit', count: 60 },
      { route_path: '/clients/new', event_type: 'visit', count: 12 },
      { route_path: '/recipes', event_type: 'visit', count: 50 },
      { route_path: '/recipes/new', event_type: 'visit', count: 15 },
      { route_path: '/menus', event_type: 'visit', count: 45 },
      { route_path: '/menus/new', event_type: 'visit', count: 10 },
      { route_path: '/finance', event_type: 'visit', count: 35 },
      { route_path: '/finance/invoices', event_type: 'visit', count: 30 },
      { route_path: '/inbox', event_type: 'visit', count: 55 },
      { route_path: '/calendar', event_type: 'visit', count: 70 },
      { route_path: '/culinary', event_type: 'visit', count: 25 },
      { route_path: '/culinary/prep', event_type: 'visit', count: 20 },
      { route_path: '/quotes', event_type: 'visit', count: 28 },
      { route_path: '/quotes/new', event_type: 'visit', count: 14 },
      { route_path: '/inquiries', event_type: 'visit', count: 22 },
      { route_path: '/contracts', event_type: 'visit', count: 18 },
      { route_path: '/remy', event_type: 'visit', count: 40 },
      { route_path: '/settings', event_type: 'visit', count: 8 },
      { route_path: '/dashboard', event_type: 'action', count: 45 },
      { route_path: '/events/new', event_type: 'action', count: 25 },
      { route_path: '/clients/new', event_type: 'action', count: 12 },
      { route_path: '/recipes/new', event_type: 'action', count: 15 },
      { route_path: '/finance/invoices', event_type: 'action', count: 20 },
      { route_path: '/quotes/new', event_type: 'action', count: 14 },
      { route_path: '/dashboard', event_type: 'pin', count: 1 },
      { route_path: '/calendar', event_type: 'pin', count: 1 },
      { route_path: '/inbox', event_type: 'pin', count: 1 },
    ],
  },
  'power-user': {
    description: 'Chef using advanced features, deep into analytics, finance, marketing.',
    events: [
      { route_path: '/dashboard', event_type: 'visit', count: 300 },
      { route_path: '/events', event_type: 'visit', count: 200 },
      { route_path: '/events/new', event_type: 'visit', count: 60 },
      { route_path: '/events/board', event_type: 'visit', count: 90 },
      { route_path: '/clients', event_type: 'visit', count: 150 },
      { route_path: '/clients/new', event_type: 'visit', count: 30 },
      { route_path: '/recipes', event_type: 'visit', count: 120 },
      { route_path: '/recipes/new', event_type: 'visit', count: 40 },
      { route_path: '/menus', event_type: 'visit', count: 100 },
      { route_path: '/menus/new', event_type: 'visit', count: 25 },
      { route_path: '/finance', event_type: 'visit', count: 90 },
      { route_path: '/finance/invoices', event_type: 'visit', count: 75 },
      { route_path: '/finance/payments', event_type: 'visit', count: 40 },
      { route_path: '/inbox', event_type: 'visit', count: 130 },
      { route_path: '/calendar', event_type: 'visit', count: 160 },
      { route_path: '/culinary', event_type: 'visit', count: 70 },
      { route_path: '/culinary/prep', event_type: 'visit', count: 55 },
      { route_path: '/culinary/prep/shopping', event_type: 'visit', count: 35 },
      { route_path: '/quotes', event_type: 'visit', count: 65 },
      { route_path: '/quotes/new', event_type: 'visit', count: 30 },
      { route_path: '/inquiries', event_type: 'visit', count: 50 },
      { route_path: '/contracts', event_type: 'visit', count: 45 },
      { route_path: '/remy', event_type: 'visit', count: 100 },
      { route_path: '/marketing', event_type: 'visit', count: 35 },
      { route_path: '/marketing/social', event_type: 'visit', count: 25 },
      { route_path: '/prospecting', event_type: 'visit', count: 30 },
      { route_path: '/staff', event_type: 'visit', count: 20 },
      { route_path: '/analytics', event_type: 'visit', count: 40 },
      { route_path: '/meal-prep', event_type: 'visit', count: 30 },
      { route_path: '/settings', event_type: 'visit', count: 15 },
      { route_path: '/settings/security', event_type: 'visit', count: 8 },
      { route_path: '/dashboard', event_type: 'action', count: 120 },
      { route_path: '/events/new', event_type: 'action', count: 60 },
      { route_path: '/clients/new', event_type: 'action', count: 30 },
      { route_path: '/recipes/new', event_type: 'action', count: 40 },
      { route_path: '/finance/invoices', event_type: 'action', count: 50 },
      { route_path: '/quotes/new', event_type: 'action', count: 30 },
      { route_path: '/marketing/social', event_type: 'action', count: 15 },
      { route_path: '/prospecting', event_type: 'action', count: 20 },
      { route_path: '/staff', event_type: 'action', count: 10 },
      { route_path: '/dashboard', event_type: 'pin', count: 1 },
      { route_path: '/calendar', event_type: 'pin', count: 1 },
      { route_path: '/inbox', event_type: 'pin', count: 1 },
      { route_path: '/finance', event_type: 'pin', count: 1 },
      { route_path: '/analytics', event_type: 'pin', count: 1 },
      { route_path: '/culinary/prep', event_type: 'search_hit', count: 12 },
      { route_path: '/marketing', event_type: 'search_hit', count: 8 },
      { route_path: '/staff', event_type: 'search_hit', count: 5 },
    ],
  },
} as const satisfies Record<string, MockProfile>

// ── Seeder ─────────────────────────────────────────────────────────────────

/**
 * Seed mock usage data for a chef. TEST/DEV ONLY.
 * Generates individual rows spread over the past N days for realistic time distribution.
 */
export async function seedMockProfile(
  chefId: string,
  profileName: keyof typeof MOCK_PROFILES
): Promise<void> {
  const profile = MOCK_PROFILES[profileName]
  if (!profile) {
    throw new Error(`Unknown mock profile: ${profileName}`)
  }

  // Spread events over the past 90 days for realistic distribution
  const spreadDays = profileName === 'new-chef' ? 7 : profileName === 'established-chef' ? 90 : 180

  const rows: Array<{
    chef_id: string
    route_path: string
    event_type: string
    metadata: string
    session_id: string
    created_at: Date
  }> = []

  for (const evt of profile.events) {
    for (let i = 0; i < evt.count; i++) {
      const daysAgo = Math.floor(Math.random() * spreadDays)
      const hoursAgo = Math.floor(Math.random() * 24)
      const ts = new Date()
      ts.setDate(ts.getDate() - daysAgo)
      ts.setHours(ts.getHours() - hoursAgo)

      rows.push({
        chef_id: chefId,
        route_path: evt.route_path,
        event_type: evt.event_type,
        metadata: '{}',
        session_id: `mock-${profileName}-${daysAgo}`,
        created_at: ts,
      })
    }
  }

  // Batch insert in chunks of 100
  const CHUNK = 100
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    await pgClient`
      INSERT INTO surface_usage_events ${pgClient(chunk, 'chef_id', 'route_path', 'event_type', 'metadata', 'session_id', 'created_at')}
    `
  }

  console.log(
    `[mock-profiles] Seeded ${rows.length} events for chef ${chefId} (profile: ${profileName})`
  )
}
