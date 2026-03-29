// @ts-nocheck
import { randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import { createAdminClient } from '@/lib/db/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

type AuthUser = {
  id: string
  email?: string | null
}

const DEMO_CHEF = {
  email: 'chef.demo@local.chefflow',
  password: 'CHEF.jdgyuegf9924092.FLOW',
  businessName: 'ChefFlow Demo Kitchen',
  displayName: 'Chef Demo',
  phone: '617-555-0101',
  slug: 'chef-demo',
}

const DEMO_CLIENT = {
  email: 'client.demo@local.chefflow',
  password: 'CHEF.jdgyuegf9924092.FLOW',
  fullName: 'Client Demo',
  phone: '617-555-0202',
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function ensureLocalDb(url: string) {
  if (!url.includes('127.0.0.1:54321') && !url.includes('localhost:54321')) {
    throw new Error(
      `Refusing to seed non-local database URL (${url}). Point database URL to local first.`
    )
  }
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function ensureAuthUser(
  admin: any,
  input: { email: string; password: string; metadata: Record<string, unknown> }
): Promise<AuthUser> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) throw new Error(`Failed to list auth users: ${listError.message}`)

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === input.email.toLowerCase()
  )

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: input.metadata,
    })

    if (updateError) {
      throw new Error(`Failed to update auth user ${input.email}: ${updateError.message}`)
    }

    return { id: existing.id, email: existing.email }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.metadata,
  })

  if (createError || !created.user) {
    throw new Error(`Failed to create auth user ${input.email}: ${createError?.message}`)
  }

  return { id: created.user.id, email: created.user.email }
}

async function upsertChef(admin: any, authUserId: string) {
  const { data: existingChef } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (existingChef?.id) {
    const { data: updated, error } = await admin
      .from('chefs')
      .update({
        business_name: DEMO_CHEF.businessName,
        display_name: DEMO_CHEF.displayName,
        email: DEMO_CHEF.email,
        phone: DEMO_CHEF.phone,
        slug: DEMO_CHEF.slug,
        tagline: 'Operations-powered private dining, powered by ChefFlow.',
        bio: 'Demo chef profile used for local end-to-end testing.',
        website_url: 'https://example.com/demo-chef',
        show_website_on_public_profile: true,
        preferred_inquiry_destination: 'both',
      })
      .eq('id', existingChef.id)
      .select('id')
      .single()

    if (error || !updated) throw new Error(`Failed to update chef: ${error?.message}`)
    return updated.id as string
  }

  const { data: inserted, error } = await admin
    .from('chefs')
    .insert({
      auth_user_id: authUserId,
      business_name: DEMO_CHEF.businessName,
      display_name: DEMO_CHEF.displayName,
      email: DEMO_CHEF.email,
      phone: DEMO_CHEF.phone,
      slug: DEMO_CHEF.slug,
      tagline: 'Operations-powered private dining, powered by ChefFlow.',
      bio: 'Demo chef profile used for local end-to-end testing.',
      website_url: 'https://example.com/demo-chef',
      show_website_on_public_profile: true,
      preferred_inquiry_destination: 'both',
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`Failed to insert chef: ${error?.message}`)
  return inserted.id as string
}

async function ensureChefRole(admin: any, authUserId: string, chefId: string) {
  const { error } = await admin.from('user_roles').upsert(
    {
      auth_user_id: authUserId,
      role: 'chef',
      entity_id: chefId,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error(`Failed to upsert chef role: ${error.message}`)
}

async function ensureChefPreferences(admin: any, chefId: string) {
  const { error } = await (admin as any).from('chef_preferences').upsert(
    {
      chef_id: chefId,
      tenant_id: chefId,
      home_city: 'Boston',
      home_state: 'MA',
      network_discoverable: true,
    },
    { onConflict: 'chef_id' }
  )

  if (error) throw new Error(`Failed to upsert chef preferences: ${error.message}`)
}

async function upsertClient(admin: any, authUserId: string, chefId: string) {
  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (existingClient?.id) {
    const { data: updated, error } = await admin
      .from('clients')
      .update({
        tenant_id: chefId,
        full_name: DEMO_CLIENT.fullName,
        email: DEMO_CLIENT.email,
        phone: DEMO_CLIENT.phone,
        status: 'active',
      })
      .eq('id', existingClient.id)
      .select('id')
      .single()

    if (error || !updated) throw new Error(`Failed to update client: ${error?.message}`)
    return updated.id as string
  }

  const { data: inserted, error } = await admin
    .from('clients')
    .insert({
      auth_user_id: authUserId,
      tenant_id: chefId,
      full_name: DEMO_CLIENT.fullName,
      email: DEMO_CLIENT.email,
      phone: DEMO_CLIENT.phone,
      status: 'active',
      referral_source: 'website',
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`Failed to insert client: ${error?.message}`)
  return inserted.id as string
}

async function ensureClientRole(admin: any, authUserId: string, clientId: string) {
  const { error } = await admin.from('user_roles').upsert(
    {
      auth_user_id: authUserId,
      role: 'client',
      entity_id: clientId,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error(`Failed to upsert client role: ${error.message}`)
}

async function ensureInquiry(admin: any, chefId: string, clientId: string) {
  const { data: existing } = await admin
    .from('inquiries')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .ilike('source_message', '%Local bootstrap demo inquiry%')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('inquiries')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      channel: 'website',
      status: 'awaiting_chef',
      source_message: 'Local bootstrap demo inquiry from a sample client.',
      confirmed_date: new Date(`${daysFromNow(14)}T00:00:00.000Z`).toISOString(),
      confirmed_guest_count: 8,
      confirmed_location: 'Beacon Hill, Boston',
      confirmed_occasion: 'Anniversary Dinner',
      confirmed_budget_cents: 180000,
      unknown_fields: [],
      next_action_required: 'Review and send quote',
      next_action_by: 'chef',
      first_contact_at: new Date().toISOString(),
      last_response_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`Failed to insert inquiry: ${error?.message}`)
  return inserted.id as string
}

async function ensureEvent(admin: any, chefId: string, clientId: string, inquiryId: string) {
  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('occasion', 'Anniversary Dinner')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('events')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      inquiry_id: inquiryId,
      event_date: daysFromNow(21),
      serve_time: '18:30:00',
      guest_count: 8,
      occasion: 'Anniversary Dinner',
      location_address: '123 Beacon St',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02108',
      status: 'draft',
      service_style: 'plated',
      dietary_restrictions: ['gluten free option'],
      allergies: ['tree nuts'],
      special_requests: 'Coursed tasting menu with wine pairing suggestions.',
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`Failed to insert event: ${error?.message}`)
  return inserted.id as string
}

async function linkInquiryToEvent(admin: any, inquiryId: string, eventId: string) {
  const { error } = await admin
    .from('inquiries')
    .update({ converted_to_event_id: eventId })
    .eq('id', inquiryId)

  if (error) throw new Error(`Failed to link inquiry to event: ${error.message}`)
}

async function ensureIntegrationConnections(admin: any, chefId: string) {
  const providers: Array<{ provider: string; label: string; authType: 'oauth2' | 'none' }> = [
    { provider: 'square', label: 'Demo Square Location', authType: 'oauth2' },
    { provider: 'calendly', label: 'Demo Calendly Workspace', authType: 'oauth2' },
    { provider: 'hubspot', label: 'Demo HubSpot Portal', authType: 'oauth2' },
  ]

  for (const item of providers) {
    const { data: existing } = await (admin as any)
      .from('integration_connections')
      .select('id')
      .eq('tenant_id', chefId)
      .eq('provider', item.provider)
      .maybeSingle()

    if (existing?.id) continue

    const { error } = await (admin as any).from('integration_connections').insert({
      chef_id: chefId,
      tenant_id: chefId,
      provider: item.provider,
      auth_type: item.authType,
      status: 'connected',
      external_account_name: item.label,
      webhook_secret: randomBytes(32).toString('hex'),
      config: { demo: true },
    })

    if (error)
      throw new Error(`Failed to seed integration connection ${item.provider}: ${error.message}`)
  }
}

async function ensureIntegrationEvents(admin: any, chefId: string) {
  const events = [
    {
      provider: 'square',
      source_event_id: 'demo_square_payment_1',
      source_event_type: 'payment.created',
      canonical_event_type: 'payment_captured',
    },
    {
      provider: 'calendly',
      source_event_id: 'demo_calendly_invitee_1',
      source_event_type: 'invitee.created',
      canonical_event_type: 'appointment_booked',
    },
    {
      provider: 'hubspot',
      source_event_id: 'demo_hubspot_contact_1',
      source_event_type: 'contact.creation',
      canonical_event_type: 'lead_created',
    },
  ]

  for (const item of events) {
    const { data: existing } = await (admin as any)
      .from('integration_events')
      .select('id')
      .eq('tenant_id', chefId)
      .eq('provider', item.provider)
      .eq('source_event_id', item.source_event_id)
      .maybeSingle()

    if (existing?.id) continue

    const now = new Date().toISOString()
    const { error } = await (admin as any).from('integration_events').insert({
      tenant_id: chefId,
      provider: item.provider,
      source_event_id: item.source_event_id,
      source_event_type: item.source_event_type,
      canonical_event_type: item.canonical_event_type,
      occurred_at: now,
      raw_payload: { demo: true, provider: item.provider, event: item.source_event_type },
      normalized_payload: { demo: true },
      status: 'completed',
      processed_at: now,
    })

    if (error)
      throw new Error(`Failed to seed integration event ${item.provider}: ${error.message}`)
  }
}

async function updatePlatformOwnerEnv(chefId: string) {
  const envPath = '.env.local'
  const current = await fs.readFile(envPath, 'utf8')
  const next = current.match(/^PLATFORM_OWNER_CHEF_ID=/m)
    ? current.replace(/^PLATFORM_OWNER_CHEF_ID=.*$/m, `PLATFORM_OWNER_CHEF_ID=${chefId}`)
    : `${current.trimEnd()}\nPLATFORM_OWNER_CHEF_ID=${chefId}\n`

  if (next !== current) {
    await fs.writeFile(envPath, next, 'utf8')
  }
}

async function main() {
  const dbUrl = requireEnv('NEXT_PUBLIC_DB_URL')
  ensureLocalDb(dbUrl)

  const admin = createAdminClient()

  console.log('Seeding local demo users and data...')

  const chefAuth = await ensureAuthUser(admin, {
    email: DEMO_CHEF.email,
    password: DEMO_CHEF.password,
    metadata: { role: 'chef', demo: true },
  })

  const chefId = await upsertChef(admin, chefAuth.id)
  await ensureChefRole(admin, chefAuth.id, chefId)
  await ensureChefPreferences(admin, chefId)

  const clientAuth = await ensureAuthUser(admin, {
    email: DEMO_CLIENT.email,
    password: DEMO_CLIENT.password,
    metadata: { role: 'client', demo: true },
  })

  const clientId = await upsertClient(admin, clientAuth.id, chefId)
  await ensureClientRole(admin, clientAuth.id, clientId)

  const inquiryId = await ensureInquiry(admin, chefId, clientId)
  const eventId = await ensureEvent(admin, chefId, clientId, inquiryId)
  await linkInquiryToEvent(admin, inquiryId, eventId)

  await ensureIntegrationConnections(admin, chefId)
  await ensureIntegrationEvents(admin, chefId)
  await updatePlatformOwnerEnv(chefId)

  console.log('Local demo seed complete.')
  console.log(`Chef login:   ${DEMO_CHEF.email} / ${DEMO_CHEF.password}`)
  console.log(`Client login: ${DEMO_CLIENT.email} / ${DEMO_CLIENT.password}`)
  console.log(`Chef slug:    /chef/${DEMO_CHEF.slug}`)
  console.log(`PLATFORM_OWNER_CHEF_ID set to: ${chefId}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
