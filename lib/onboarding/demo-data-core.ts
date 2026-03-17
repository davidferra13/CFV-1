import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoClient } from '@/lib/onboarding/demo-data-utils'

export const ONBOARDING_SAMPLE_CLIENTS = [
  {
    full_name: 'Sample Client One',
    email: 'sample.client.one@example.com',
    phone: '617-555-0191',
    dietary_restrictions: ['vegetarian'],
    allergies: [] as string[],
    status: 'active',
    referral_source: 'website',
    vibe_notes: 'Starter sample profile for onboarding exploration.',
  },
  {
    full_name: 'Sample Client Two',
    email: 'sample.client.two@example.com',
    phone: '617-555-0192',
    dietary_restrictions: [],
    allergies: ['tree nuts'],
    status: 'active',
    referral_source: 'instagram',
    vibe_notes: 'Example repeat client with a saved allergy.',
  },
  {
    full_name: 'Demo Planning Group',
    email: 'demo.planning.group@example.com',
    phone: '617-555-0193',
    dietary_restrictions: ['gluten-free'],
    allergies: [],
    status: 'active',
    referral_source: 'referral',
    vibe_notes: 'Example planning contact for an upcoming dinner series.',
  },
]

export const ONBOARDING_SAMPLE_EVENTS = [
  {
    clientIndex: 0,
    occasion: 'Sample Anniversary Dinner',
    status: 'confirmed',
    daysOut: 10,
    guest_count: 6,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 1,
    occasion: 'Sample Team Supper',
    status: 'proposed',
    daysOut: 18,
    guest_count: 12,
    serve_time: '18:30:00',
    location_city: 'Cambridge',
    location_state: 'MA',
    service_style: 'family_style',
  },
]

export const ONBOARDING_SAMPLE_INQUIRY = {
  clientIndex: 2,
  channel: 'website',
  status: 'new',
  source_message:
    'Hi, I found ChefFlow and want to test the inquiry workflow for a private dinner club kickoff.',
  confirmed_occasion: 'Sample Dinner Club Kickoff',
  confirmed_guest_count: 10,
  confirmed_budget_cents: 180000,
  next_action_by: 'chef',
  daysAgo: 1,
}

export type SeedDemoDataResult = {
  created: boolean
  clientsCreated: number
  eventsCreated: number
  inquiriesCreated: number
  error?: string
}

export type ClearDemoDataResult = {
  cleared: boolean
  clientsDeleted: number
  eventsDeleted: number
  inquiriesDeleted: number
  error?: string
}

export async function getDemoClientRows(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select('id, email, full_name')
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to load sample data state: ${error.message}`)
  }

  return (data ?? []).filter((client) => isDemoClient(client))
}

export async function hasDemoDataForTenant(tenantId: string) {
  const demoClients = await getDemoClientRows(tenantId)
  return demoClients.length > 0
}
