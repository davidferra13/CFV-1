'use server'

// Demo Data Seeder — Creates realistic sample data for new chef accounts.
// All records are flagged with is_demo=true so they can be cleared cleanly.
// Requires migration 20260307000007_demo_data_flag.sql to be applied first.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DemoDataResult {
  created: boolean
  clientsCreated: number
  eventsCreated: number
  inquiriesCreated: number
  error?: string
}

export async function seedDemoData(): Promise<DemoDataResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const chefId = user.entityId

  // Check if demo data already exists
  const { count: existingCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_demo', true)

  if ((existingCount ?? 0) > 0) {
    return {
      created: false,
      clientsCreated: 0,
      eventsCreated: 0,
      inquiriesCreated: 0,
      error: 'Demo data already exists',
    }
  }

  // Sample clients
  const DEMO_CLIENTS = [
    {
      full_name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      phone: '555-0101',
      dietary_restrictions: ['pescatarian'],
      allergies: [],
      notes: '[Sample] Hosts quarterly dinner parties. Prefers modern Japanese fusion.',
      lifetime_value_cents: 420000, // $4,200
    },
    {
      full_name: 'Marcus & Julia Rivera',
      email: 'mrivera@example.com',
      phone: '555-0102',
      dietary_restrictions: [],
      allergies: ['tree nuts'],
      notes: '[Sample] Anniversary dinners each spring. Loves Mediterranean.',
      lifetime_value_cents: 280000, // $2,800
    },
    {
      full_name: 'The Harrington Family',
      email: 'james.harrington@example.com',
      phone: '555-0103',
      dietary_restrictions: ['gluten-free'],
      allergies: [],
      notes: '[Sample] Monthly family dinners for 8-10 guests. Very loyal.',
      lifetime_value_cents: 1200000, // $12,000
    },
  ]

  const { data: createdClients, error: clientError } = await supabase
    .from('clients')
    .insert(
      DEMO_CLIENTS.map((c) => ({
        tenant_id: tenantId,
        chef_id: chefId,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        dietary_restrictions: c.dietary_restrictions,
        allergies: c.allergies,
        notes: c.notes,
        lifetime_value_cents: c.lifetime_value_cents,
        is_demo: true,
      }))
    )
    .select('id')

  if (clientError || !createdClients) {
    return {
      created: false,
      clientsCreated: 0,
      eventsCreated: 0,
      inquiriesCreated: 0,
      error: clientError?.message,
    }
  }

  const [chenId, riveiraId, harringtonId] = createdClients.map((c: any) => c.id)

  // Sample events — one completed, one confirmed upcoming
  const today = new Date()
  const pastDate = new Date(today)
  pastDate.setDate(pastDate.getDate() - 45) // 45 days ago
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + 21) // 3 weeks from now

  const DEMO_EVENTS = [
    {
      client_id: chenId,
      occasion: 'Quarterly Dinner Party',
      event_date: pastDate.toISOString().split('T')[0],
      status: 'completed',
      guest_count: 8,
      quoted_price_cents: 120000, // $1,200
      service_style: 'plated',
      location_address: '123 Oak Street',
      location_city: 'San Francisco',
      notes:
        '[Sample] Three-course Japanese fusion. Miso-glazed black cod, seasonal greens, yuzu panna cotta.',
    },
    {
      client_id: harringtonId,
      occasion: 'Monthly Family Dinner',
      event_date: futureDate.toISOString().split('T')[0],
      status: 'confirmed',
      guest_count: 10,
      quoted_price_cents: 180000, // $1,800
      service_style: 'family_style',
      location_address: '456 Maple Avenue',
      location_city: 'San Francisco',
      notes: '[Sample] Mediterranean spread — lamb chops, mezze, baklava.',
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: createdEvents, error: eventError } = await supabase
    .from('events')
    .insert(
      DEMO_EVENTS.map((e) => ({
        tenant_id: tenantId,
        chef_id: chefId,
        ...e,
        is_demo: true,
      })) as any
    )
    .select('id')

  if (eventError) {
    // Clients were created — partial success
    return {
      created: true,
      clientsCreated: createdClients.length,
      eventsCreated: 0,
      inquiriesCreated: 0,
    }
  }

  // Sample inquiry — a hot lead
  const DEMO_INQUIRY = {
    tenant_id: tenantId,
    chef_id: chefId,
    client_id: riveiraId,
    status: 'quoted',
    channel: 'email',
    confirmed_occasion: 'Anniversary Dinner',
    confirmed_date: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    confirmed_guest_count: 6,
    confirmed_budget_cents: 90000, // $900
    source_message:
      "[Sample] Hi! We'd love to book you for our 10th anniversary. Six guests, Italian or French cuisine preferred. Do you have availability?",
    next_action_required: 'Follow up — quote has been open 3 days with no response',
    is_demo: true,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: inquiryError } = await supabase.from('inquiries').insert(DEMO_INQUIRY as any)

  revalidatePath('/clients')
  revalidatePath('/events')
  revalidatePath('/inquiries')
  revalidatePath('/dashboard')

  return {
    created: true,
    clientsCreated: createdClients.length,
    eventsCreated: createdEvents?.length ?? 0,
    inquiriesCreated: inquiryError ? 0 : 1,
  }
}

export async function clearDemoData(): Promise<{ cleared: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Delete in reverse dependency order
  const [inquiryResult, eventResult, clientResult] = await Promise.all([
    supabase.from('inquiries').delete().eq('tenant_id', tenantId).eq('is_demo', true),
    supabase.from('events').delete().eq('tenant_id', tenantId).eq('is_demo', true),
    supabase.from('clients').delete().eq('tenant_id', tenantId).eq('is_demo', true),
  ])

  const errors = [inquiryResult.error, eventResult.error, clientResult.error].filter(Boolean)
  if (errors.length > 0) {
    return { cleared: false, error: errors[0]?.message }
  }

  revalidatePath('/clients')
  revalidatePath('/events')
  revalidatePath('/inquiries')
  revalidatePath('/dashboard')

  return { cleared: true }
}

export async function hasDemoData(): Promise<boolean> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', true)

  return (count ?? 0) > 0
}
