// Client Management Server Actions
// Chef-only: Invitation-based client signup
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { UnknownAppError, ValidationError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'

const InviteClientSchema = z.object({
  email: z.string().email('Valid email required'),
  full_name: z.string().min(1, 'Name required'),
})

const CreateClientSchema = z.object({
  // Required
  full_name: z.string().min(1, 'Name required').max(255, 'Name too long'),
  // Optional identity
  email: z.string().email('Valid email').optional(),
  phone: z.string().max(50).optional(),
  preferred_name: z.string().max(255).optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  referral_source: z
    .enum(['take_a_chef', 'instagram', 'referral', 'website', 'phone', 'email', 'other'])
    .optional(),
  referral_source_detail: z.string().optional(),
  // Demographics
  occupation: z.string().optional(),
  company_name: z.string().optional(),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  instagram_handle: z.string().optional(),
  social_media_links: z.array(z.object({ platform: z.string(), url: z.string() })).optional(),
  // Household
  partner_name: z.string().optional(),
  children: z.array(z.string()).optional(),
  pets: z
    .array(z.object({ name: z.string(), type: z.string(), notes: z.string().optional() }))
    .optional(),
  family_notes: z.string().optional(),
  // Dietary
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().optional(),
  dietary_protocols: z.array(z.string()).optional(),
  // Address / Access
  address: z.string().optional(),
  parking_instructions: z.string().optional(),
  access_instructions: z.string().optional(),
  gate_code: z.string().optional(),
  wifi_password: z.string().optional(),
  security_notes: z.string().optional(),
  house_rules: z.string().optional(),
  // Kitchen
  kitchen_size: z.string().optional(),
  kitchen_constraints: z.string().optional(),
  has_dishwasher: z.boolean().optional(),
  outdoor_cooking_notes: z.string().optional(),
  nearest_grocery_store: z.string().optional(),
  water_quality_notes: z.string().optional(),
  available_place_settings: z.number().int().optional(),
  equipment_available: z.array(z.string()).optional(),
  equipment_must_bring: z.array(z.string()).optional(),
  kitchen_oven_notes: z.string().optional(),
  kitchen_burner_notes: z.string().optional(),
  kitchen_counter_notes: z.string().optional(),
  kitchen_refrigeration_notes: z.string().optional(),
  kitchen_plating_notes: z.string().optional(),
  kitchen_sink_notes: z.string().optional(),
  // Service Defaults
  preferred_service_style: z.string().optional(),
  typical_guest_count: z.string().optional(),
  preferred_event_days: z.array(z.string()).optional(),
  budget_range_min_cents: z.number().int().optional(),
  budget_range_max_cents: z.number().int().optional(),
  recurring_pricing_model: z.enum(['none', 'flat_rate', 'per_person']).optional(),
  recurring_price_cents: z.number().int().optional(),
  recurring_pricing_notes: z.string().optional(),
  cleanup_expectations: z.string().optional(),
  leftovers_preference: z.string().optional(),
  // Personality / Communication
  formality_level: z.enum(['casual', 'semi_formal', 'formal']).optional(),
  communication_style_notes: z.string().optional(),
  vibe_notes: z.string().optional(),
  what_they_care_about: z.string().optional(),
  wow_factors: z.string().optional(),
  payment_behavior: z.string().optional(),
  tipping_pattern: z.string().optional(),
  farewell_style: z.string().optional(),
  complaint_handling_notes: z.string().optional(),
  // Business Intelligence
  referral_potential: z.enum(['low', 'medium', 'high']).optional(),
  red_flags: z.string().optional(),
  acquisition_cost_cents: z.number().int().optional(),
  // Status
  status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).optional(),
  idempotency_key: z.string().optional(),
})

const UpdateClientSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  preferred_name: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  referral_source: z
    .enum(['take_a_chef', 'instagram', 'referral', 'website', 'phone', 'email', 'other'])
    .optional(),
  referral_source_detail: z.string().optional(),
  // Demographics
  occupation: z.string().optional(),
  company_name: z.string().optional(),
  birthday: z.string().nullable().optional(),
  anniversary: z.string().nullable().optional(),
  instagram_handle: z.string().optional(),
  social_media_links: z.array(z.object({ platform: z.string(), url: z.string() })).optional(),
  // Household
  partner_name: z.string().optional(),
  children: z.array(z.string()).optional(),
  pets: z
    .array(z.object({ name: z.string(), type: z.string(), notes: z.string().optional() }))
    .optional(),
  family_notes: z.string().optional(),
  // Dietary
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().optional(),
  dietary_protocols: z.array(z.string()).optional(),
  // Address / Access
  address: z.string().optional(),
  parking_instructions: z.string().optional(),
  access_instructions: z.string().optional(),
  gate_code: z.string().optional(),
  wifi_password: z.string().optional(),
  security_notes: z.string().optional(),
  house_rules: z.string().optional(),
  // Kitchen
  kitchen_size: z.string().optional(),
  kitchen_constraints: z.string().optional(),
  has_dishwasher: z.boolean().nullable().optional(),
  outdoor_cooking_notes: z.string().optional(),
  nearest_grocery_store: z.string().optional(),
  water_quality_notes: z.string().optional(),
  available_place_settings: z.number().int().nullable().optional(),
  equipment_available: z.array(z.string()).optional(),
  equipment_must_bring: z.array(z.string()).optional(),
  kitchen_oven_notes: z.string().optional(),
  kitchen_burner_notes: z.string().optional(),
  kitchen_counter_notes: z.string().optional(),
  kitchen_refrigeration_notes: z.string().optional(),
  kitchen_plating_notes: z.string().optional(),
  kitchen_sink_notes: z.string().optional(),
  kitchen_profile_updated_at: z.string().optional(),
  // Service Defaults
  preferred_service_style: z.string().optional(),
  typical_guest_count: z.string().optional(),
  preferred_event_days: z.array(z.string()).optional(),
  budget_range_min_cents: z.number().int().nullable().optional(),
  budget_range_max_cents: z.number().int().nullable().optional(),
  recurring_pricing_model: z.enum(['none', 'flat_rate', 'per_person']).nullable().optional(),
  recurring_price_cents: z.number().int().nullable().optional(),
  recurring_pricing_notes: z.string().nullable().optional(),
  cleanup_expectations: z.string().optional(),
  leftovers_preference: z.string().optional(),
  // Personality / Communication
  formality_level: z.enum(['casual', 'semi_formal', 'formal']).nullable().optional(),
  communication_style_notes: z.string().optional(),
  vibe_notes: z.string().optional(),
  what_they_care_about: z.string().optional(),
  wow_factors: z.string().optional(),
  payment_behavior: z.string().optional(),
  tipping_pattern: z.string().optional(),
  farewell_style: z.string().optional(),
  complaint_handling_notes: z.string().optional(),
  // Business Intelligence
  referral_potential: z.enum(['low', 'medium', 'high']).nullable().optional(),
  red_flags: z.string().optional(),
  acquisition_cost_cents: z.number().int().nullable().optional(),
  // Status
  status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).optional(),
  expected_updated_at: z.union([z.string(), z.date().transform((d) => d.toISOString())]).optional(),
  idempotency_key: z.string().optional(),
})

export type InviteClientInput = z.infer<typeof InviteClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>
export type CreateClientInput = z.infer<typeof CreateClientSchema>

/**
 * Send client invitation (chef-only)
 * Creates invitation record with unique token
 * V1: No email sending, just creates DB record
 */
export async function inviteClient(input: InviteClientInput) {
  const user = await requireChef()
  const validated = InviteClientSchema.parse(input)

  const db: any = createServerClient()

  // Check if client already exists with this email in this tenant
  const findExistingClient = async (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', validated.email)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let existingClientResponse = await findExistingClient(true)
  if (isMissingSoftDeleteColumn(existingClientResponse.error)) {
    existingClientResponse = await findExistingClient(false)
  }
  const existingClient = existingClientResponse.data

  if (existingClient) {
    throw new ValidationError('Client with this email already exists in your tenant')
  }

  // Check if pending invitation exists
  const { data: existingInvitation } = await db
    .from('client_invitations')
    .select('id, used_at')
    .eq('tenant_id', user.tenantId!)
    .eq('email', validated.email)
    .is('used_at', null)
    .single()

  if (existingInvitation) {
    throw new ValidationError('Pending invitation already exists for this email')
  }

  // Generate secure token and store its SHA-256 hash (not plaintext)
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Create invitation (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await db
    .from('client_invitations')
    .insert({
      tenant_id: user.tenantId!,
      email: validated.email,
      full_name: validated.full_name,
      token: tokenHash,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[inviteClient] Error:', error)
    throw new UnknownAppError('Failed to create invitation')
  }

  revalidatePath('/clients')

  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/client-signup?token=${token}`

  // Send invitation email to client (non-blocking)
  try {
    const { data: chef } = await db
      .from('chefs')
      .select('business_name')
      .eq('id', user.tenantId!)
      .single()

    if (chef) {
      const { sendClientInvitationEmail } = await import('@/lib/email/notifications')
      await sendClientInvitationEmail({
        clientEmail: validated.email,
        clientName: validated.full_name,
        chefName: chef.business_name || 'Your Chef',
        invitationUrl,
        expiresInDays: 7,
      })
    }
  } catch (emailErr) {
    console.error('[inviteClient] Email failed (non-blocking):', emailErr)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_created',
      domain: 'client',
      entityType: 'client_invitation',
      entityId: invitation.id,
      summary: `Invited new client: ${validated.full_name} (${validated.email})`,
      context: { client_name: validated.full_name, email: validated.email },
    })
  } catch (err) {
    console.error('[inviteClient] Activity log failed (non-blocking):', err)
  }

  return { success: true, invitation, invitationUrl }
}

/**
 * Create client directly (chef-only)
 * Used when chef wants to add a client record without sending an invitation
 */
export async function createClient(input: CreateClientInput) {
  const user = await requireChef()
  const validated = CreateClientSchema.parse(input)

  const db: any = createServerClient()

  // If email provided, ensure no existing client with same email in tenant
  if (validated.email) {
    const findExisting = async (withSoftDeleteFilter: boolean) => {
      let query = db
        .from('clients')
        .select('id')
        .eq('tenant_id', user.tenantId!)
        .eq('email', validated.email)
      if (withSoftDeleteFilter) {
        query = query.is('deleted_at' as any, null)
      }
      return query.single()
    }

    let existingResponse = await findExisting(true)
    if (isMissingSoftDeleteColumn(existingResponse.error)) {
      existingResponse = await findExisting(false)
    }
    const existing = existingResponse.data

    if (existing) {
      throw new ValidationError('Client with this email already exists in your tenant')
    }
  }

  // Build insert payload - only include fields that were provided
  const insertData: Record<string, unknown> = {
    tenant_id: user.tenantId!,
    full_name: validated.full_name,
    email: validated.email || null,
    phone: validated.phone || null,
    status: validated.status || 'active',
  }

  // Pass through all optional fields that were provided
  const optionalFields = [
    'preferred_name',
    'preferred_contact_method',
    'referral_source',
    'referral_source_detail',
    'occupation',
    'company_name',
    'birthday',
    'anniversary',
    'instagram_handle',
    'social_media_links',
    'partner_name',
    'children',
    'pets',
    'family_notes',
    'dietary_restrictions',
    'allergies',
    'dislikes',
    'spice_tolerance',
    'favorite_cuisines',
    'favorite_dishes',
    'wine_beverage_preferences',
    'dietary_protocols',
    'address',
    'parking_instructions',
    'access_instructions',
    'gate_code',
    'wifi_password',
    'security_notes',
    'house_rules',
    'kitchen_size',
    'kitchen_constraints',
    'has_dishwasher',
    'outdoor_cooking_notes',
    'nearest_grocery_store',
    'water_quality_notes',
    'available_place_settings',
    'equipment_available',
    'equipment_must_bring',
    'kitchen_oven_notes',
    'kitchen_burner_notes',
    'kitchen_counter_notes',
    'kitchen_refrigeration_notes',
    'kitchen_plating_notes',
    'kitchen_sink_notes',
    'preferred_service_style',
    'typical_guest_count',
    'preferred_event_days',
    'budget_range_min_cents',
    'budget_range_max_cents',
    'recurring_pricing_model',
    'recurring_price_cents',
    'recurring_pricing_notes',
    'cleanup_expectations',
    'leftovers_preference',
    'formality_level',
    'communication_style_notes',
    'vibe_notes',
    'what_they_care_about',
    'wow_factors',
    'payment_behavior',
    'tipping_pattern',
    'farewell_style',
    'complaint_handling_notes',
    'referral_potential',
    'red_flags',
    'acquisition_cost_cents',
  ] as const

  for (const key of optionalFields) {
    if ((validated as Record<string, unknown>)[key] !== undefined) {
      insertData[key] = (validated as Record<string, unknown>)[key]
    }
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'clients.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      const { data: client, error } = await db
        .from('clients')
        .insert(insertData as any)
        .select('*')
        .single()

      if (error || !client) {
        console.error('[createClient] Error:', error)
        throw new UnknownAppError(`Failed to create client: ${error?.message ?? 'unknown error'}`)
      }

      // Revalidate clients list
      revalidatePath('/clients')
      invalidateRemyContextCache(user.tenantId!)
      return { success: true, client }
    },
  })

  const client = result.client

  // Sync allergy flat array -> structured records if allergies were provided (non-blocking)
  try {
    if (validated.allergies && (validated.allergies as string[]).length > 0) {
      const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
      await syncFlatToStructured({ tenantId: user.tenantId!, clientId: client.id, db })
    }
  } catch (err) {
    console.error('[createClient] Allergy sync failed (non-blocking):', err)
  }

  // Log initial dietary data for audit trail (non-blocking)
  try {
    const { logDietaryChangeInternal } = await import('@/lib/clients/dietary-alert-actions')
    const allergies = validated.allergies as string[] | undefined
    const dietary = validated.dietary_restrictions as string[] | undefined
    if (allergies?.length) {
      await logDietaryChangeInternal(
        user.tenantId!,
        client.id,
        'allergy_added',
        'allergies',
        null,
        allergies.join(', ')
      )
    }
    if (dietary?.length) {
      await logDietaryChangeInternal(
        user.tenantId!,
        client.id,
        'restriction_added',
        'dietary_restrictions',
        null,
        dietary.join(', ')
      )
    }
  } catch (err) {
    console.error('[createClient] Dietary change log failed (non-blocking):', err)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_created',
      domain: 'client',
      entityType: 'client',
      entityId: client.id,
      summary: `Created client: ${validated.full_name} (${validated.email || 'no email'})`,
      context: { client_name: validated.full_name, email: validated.email || null },
    })
  } catch (err) {
    console.error('[createClient] Activity log failed (non-blocking):', err)
  }

  // Zapier/Make webhook dispatch (non-blocking)
  try {
    const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
    await dispatchWebhookEvent(user.tenantId!, 'client.created', {
      client_id: client.id,
      full_name: validated.full_name,
      email: validated.email || null,
      phone: validated.phone || null,
    })
  } catch (err) {
    console.error('[createClient] Zapier dispatch failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'client.created', {
      client_id: client.id,
      full_name: validated.full_name,
      email: validated.email || null,
      phone: validated.phone || null,
    })
  } catch (err) {
    console.error('[createClient] Webhook dispatch failed (non-blocking):', err)
  }

  return result
}

/**
 * Get all clients for chef's tenant
 */
export async function getClients() {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db.from('clients').select('*').eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.order('created_at', { ascending: false }).limit(5000)
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: clients, error } = response

  if (error) {
    console.error('[getClients] Error:', error)
    throw new UnknownAppError('Failed to fetch clients')
  }

  return clients
}

/**
 * Get single client by ID (chef-only, RLS enforces tenant scoping)
 */
export async function getClientById(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db.from('clients').select('*').eq('id', clientId).eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: client, error } = response

  if (error) {
    console.error('[getClientById] Error:', error)
    return null
  }

  return client
}

/**
 * Create a client record from lead data (used by Gmail sync pipeline).
 * Does NOT require auth session - uses admin client for automated pipelines.
 * Idempotent: returns existing client if email already exists in tenant.
 */
export async function createClientFromLead(
  tenantId: string,
  lead: {
    email: string
    full_name: string
    phone?: string | null
    dietary_restrictions?: string[] | null
    allergies?: string[] | null
    source?: string | null
  }
) {
  const db: any = createServerClient({ admin: true })
  const dietaryRestrictions = lead.dietary_restrictions?.map((item) => item.trim()).filter(Boolean)
  const allergies = lead.allergies?.map((item) => item.trim()).filter(Boolean)

  // Idempotent: check if client already exists with this email
  const findExisting = async (withSoftDeleteFilter: boolean) => {
    let query = db.from('clients').select('id').eq('tenant_id', tenantId).eq('email', lead.email)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let existingResponse = await findExisting(true)
  if (isMissingSoftDeleteColumn(existingResponse.error)) {
    existingResponse = await findExisting(false)
  }
  const existing = existingResponse.data

  if (existing) {
    return { id: existing.id, created: false }
  }

  const insertData: Record<string, unknown> = {
    tenant_id: tenantId,
    email: lead.email,
    full_name: lead.full_name,
    phone: lead.phone || null,
    status: 'active',
    referral_source:
      (lead.source as
        | 'email'
        | 'phone'
        | 'instagram'
        | 'take_a_chef'
        | 'referral'
        | 'website'
        | 'other') || 'email',
  }

  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    insertData.dietary_restrictions = dietaryRestrictions
  }

  if (allergies && allergies.length > 0) {
    insertData.allergies = allergies
  }

  // Create the client record
  const { data: client, error } = await db.from('clients').insert(insertData).select('id').single()

  if (error) {
    console.error('[createClientFromLead] Error:', error)
    throw new UnknownAppError(`Failed to create client: ${error.message}`)
  }

  return { id: client.id, created: true }
}

/**
 * Update client (chef-only)
 */
export async function updateClient(clientId: string, input: UpdateClientInput) {
  const user = await requireChef()
  const validated = UpdateClientSchema.parse(input)
  const { expected_updated_at, idempotency_key, ...updateFields } = validated

  const db: any = createServerClient()

  const { data: currentClient } = await (db
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!currentClient || currentClient.deleted_at) {
    throw new ValidationError('Client not found')
  }

  const _currentClientTs =
    currentClient.updated_at instanceof Date
      ? currentClient.updated_at.toISOString()
      : String(currentClient.updated_at)
  if (expected_updated_at && _currentClientTs !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', _currentClientTs)
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'clients.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = db
          .from('clients')
          .update({
            ...(updateFields as any),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', clientId)
          .eq('tenant_id', user.tenantId!)
        if (withSoftDeleteFilter) {
          query = query.is('deleted_at' as any, null)
        }
        if (expected_updated_at) {
          query = query.eq('updated_at', expected_updated_at)
        }
        return query.select().single()
      }

      let response = await runUpdate(true)
      if (isMissingSoftDeleteColumn(response.error)) {
        response = await runUpdate(false)
      }
      const { data: client, error } = response

      if (error || !client) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = db
              .from('clients')
              .select('updated_at')
              .eq('id', clientId)
              .eq('tenant_id', user.tenantId!)
            if (withSoftDeleteFilter) {
              query = query.is('deleted_at' as any, null)
            }
            return query.maybeSingle()
          }

          let latestResponse = await getLatest(true)
          if (isMissingSoftDeleteColumn(latestResponse.error)) {
            latestResponse = await getLatest(false)
          }
          const latest = latestResponse.data

          const _latestClientTs =
            latest.updated_at instanceof Date
              ? latest.updated_at.toISOString()
              : String(latest.updated_at)
          if (latest?.updated_at && _latestClientTs !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', _latestClientTs)
          }
        }

        console.error('[updateClient] Error:', error)
        throw new UnknownAppError('Failed to update client')
      }

      revalidatePath('/clients')
      revalidatePath(`/clients/${clientId}`)
      invalidateRemyContextCache(user.tenantId!)
      return { success: true, client }
    },
  })

  const client = result.client

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const changedFields = Object.keys(updateFields)
    const fieldDiffs = Object.fromEntries(
      changedFields.map((field) => [
        field,
        {
          before: (currentClient as Record<string, unknown>)[field] ?? null,
          after: (client as Record<string, unknown>)[field] ?? null,
        },
      ])
    )
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_updated',
      domain: 'client',
      entityType: 'client',
      entityId: clientId,
      summary: `Updated client: ${client.full_name} - ${changedFields.join(', ')}`,
      context: {
        client_name: client.full_name,
        changed_fields: changedFields,
        field_diffs: fieldDiffs,
      },
      clientId,
    })
  } catch (err) {
    console.error('[updateClient] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'client.updated', {
      client_id: clientId,
      full_name: client.full_name,
      changed_fields: Object.keys(updateFields),
    })
  } catch (err) {
    console.error('[updateClient] Webhook dispatch failed (non-blocking):', err)
  }

  // Log dietary changes for the alert pipeline (non-blocking)
  try {
    const dietaryFields = ['allergies', 'dietary_restrictions'] as const
    const changedDietaryFields = dietaryFields.filter((field) => field in updateFields)
    if (changedDietaryFields.length > 0) {
      const { logDietaryChange } = await import('@/lib/clients/dietary-alert-actions')
      for (const field of changedDietaryFields) {
        const oldVal = currentClient[field]
        const newVal = (updateFields as Record<string, unknown>)[field]
        const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal ?? '')
        const newStr = Array.isArray(newVal)
          ? (newVal as string[]).join(', ')
          : String(newVal ?? '')
        if (oldStr !== newStr) {
          const oldArr = Array.isArray(oldVal) ? oldVal : []
          const newArr = Array.isArray(newVal) ? (newVal as string[]) : []
          const isRemoval = newArr.length < oldArr.length
          const changeType =
            field === 'allergies'
              ? isRemoval
                ? 'allergy_removed'
                : 'allergy_added'
              : isRemoval
                ? 'restriction_removed'
                : 'restriction_added'
          await logDietaryChange(clientId, changeType, field, oldStr || null, newStr || null)
        }
      }
    }
  } catch (err) {
    console.error('[updateClient] Dietary change log failed (non-blocking):', err)
  }

  // Sync allergy stores bidirectionally (non-blocking)
  // Ensures client_allergy_records (readiness gates, menu checks) stays in sync
  // with clients.allergies (documents, Remy, staff briefings)
  try {
    if ('allergies' in updateFields) {
      const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
      await syncFlatToStructured({ tenantId: user.tenantId!, clientId, db })
    }
  } catch (err) {
    console.error('[updateClient] Allergy sync failed (non-blocking):', err)
  }

  // Recheck upcoming event menus for allergen conflicts (non-blocking)
  try {
    if ('allergies' in updateFields || 'dietary_restrictions' in updateFields) {
      const { recheckUpcomingMenusForClient } = await import('@/lib/dietary/menu-recheck')
      await recheckUpcomingMenusForClient({ tenantId: user.tenantId!, clientId, db })
    }
  } catch (err) {
    console.error('[updateClient] Menu recheck failed (non-blocking):', err)
  }

  // Propagate dietary/allergy changes to active events (non-blocking)
  // Ensures prep sheets and event detail show current data, not stale copy-at-creation data
  try {
    const dietaryFields = ['allergies', 'dietary_restrictions'] as const
    const changedDietaryForPropagation = dietaryFields.filter((field) => field in updateFields)
    if (changedDietaryForPropagation.length > 0) {
      const activeStatuses = ['accepted', 'paid', 'confirmed', 'in_progress']
      const propagateFields: Record<string, unknown> = {}
      for (const field of changedDietaryForPropagation) {
        propagateFields[field] = (updateFields as Record<string, unknown>)[field] ?? []
      }
      const { data: affectedEvents } = await db
        .from('events')
        .update(propagateFields)
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId!)
        .in('status', activeStatuses)
        .select('id')
      // Revalidate affected event pages so dietary badges update
      if (affectedEvents?.length) {
        for (const evt of affectedEvents) {
          revalidatePath(`/events/${evt.id}`)
        }
      }
    }
  } catch (err) {
    console.error('[updateClient] Dietary propagation to events failed (non-blocking):', err)
  }

  return result
}

/**
 * Soft delete client (chef-only)
 */
export async function deleteClient(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client } = await (db
    .from('clients')
    .select('id, deleted_at')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!client || client.deleted_at) {
    throw new ValidationError('Client not found')
  }

  // Prevent deletion when active events exist - deleting would orphan them
  const { data: activeEvents } = await (db
    .from('events')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .not('status', 'in', '("completed","cancelled")')
    .limit(1) as any)

  if (activeEvents && activeEvents.length > 0) {
    throw new ValidationError(
      'Cannot delete a client with active events. Close or cancel their events first.'
    )
  }

  const { error } = await db
    .from('clients')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteClient] Error:', error)
    throw new UnknownAppError('Failed to delete client')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  invalidateRemyContextCache(user.tenantId!)
  return { success: true }
}

/**
 * Restore soft deleted client (chef-only)
 */
export async function restoreClient(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('clients')
    .update({
      deleted_at: null,
      deleted_by: null,
    } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreClient] Error:', error)
    throw new UnknownAppError('Failed to restore client')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}
/**
 * Get pending invitations for tenant
 */
export async function getPendingInvitations() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: invitations, error } = await db
    .from('client_invitations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingInvitations] Error:', error)
    throw new UnknownAppError('Failed to fetch invitations')
  }

  return invitations
}

/**
 * Cancel invitation (chef-only)
 * V1: Just delete the record
 */
export async function cancelInvitation(invitationId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[cancelInvitation] Error:', error)
    throw new UnknownAppError('Failed to cancel invitation')
  }

  revalidatePath('/clients')
  return { success: true }
}

/**
 * Get clients with statistics (chef-only)
 * Uses client_financial_summary view for computed stats
 */
export async function getClientsWithStats() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all clients (hard cap at 2000 to prevent unbounded memory load)
  const { data: clients, error: clientsError } = await db
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (clientsError) {
    console.error('[getClientsWithStats] Error:', clientsError)
    throw new UnknownAppError('Failed to fetch clients')
  }

  // Use the client_financial_summary view for stats
  const { data: financialSummaries } = await db
    .from('client_financial_summary')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  // Build stats map from the view
  const statsMap = new Map<
    string,
    {
      totalEvents: number
      totalSpentCents: number
      lastEventDate: string | null
    }
  >()

  if (financialSummaries) {
    for (const summary of financialSummaries) {
      if (summary.client_id) {
        statsMap.set(summary.client_id, {
          totalEvents: summary.total_events_count ?? 0,
          totalSpentCents: summary.lifetime_value_cents ?? 0,
          lastEventDate: summary.last_event_date,
        })
      }
    }
  }

  // Merge clients with stats
  return clients.map((client: any) => ({
    ...client,
    totalEvents: statsMap.get(client.id)?.totalEvents ?? 0,
    totalSpentCents: statsMap.get(client.id)?.totalSpentCents ?? 0,
    lastEventDate: statsMap.get(client.id)?.lastEventDate ?? null,
  }))
}

/**
 * Get events for a specific client (chef-only)
 */
export async function getClientEvents(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!client) {
    throw new ValidationError('Client not found')
  }

  // Get events for this client
  const { data: events, error } = await db
    .from('events')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getClientEvents] Error:', error)
    throw new UnknownAppError('Failed to fetch client events')
  }

  return events
}

/**
 * Get client with detailed statistics
 * Uses client_financial_summary view for computed metrics
 */
export async function getClientWithStats(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get client
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (clientError || !client) {
    console.error('[getClientWithStats] Error:', clientError)
    return null
  }

  // Use the client_financial_summary view
  const { data: financialSummary } = await db
    .from('client_financial_summary')
    .select('*')
    .eq('client_id', clientId)
    .single()

  return {
    ...client,
    totalEvents: financialSummary?.total_events_count ?? 0,
    completedEvents: financialSummary?.total_events_completed ?? 0,
    totalSpentCents: financialSummary?.lifetime_value_cents ?? 0,
    averageEventValueCents: financialSummary?.average_spend_per_event ?? 0,
    lastEventDate: financialSummary?.last_event_date ?? null,
    outstandingBalanceCents: financialSummary?.outstanding_balance_cents ?? 0,
  }
}

/**
 * Server action: Update a client's household tag stored in the `household` JSONB.
 * Accepts a FormData payload from a client-side form with fields:
 * - clientId
 * - household_tag
 */
export async function updateClientHousehold(formData: FormData) {
  const user = await requireChef()

  const clientId = String(formData.get('clientId') ?? '')
  const tag = formData.get('household_tag') ? String(formData.get('household_tag')) : null

  if (!clientId) throw new ValidationError('Missing clientId')

  const db: any = createServerClient()

  const { data: client, error } = await db
    .from('clients')
    .update({ household: tag ? { tag } : null } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .select()
    .single()

  if (error) {
    console.error('[updateClientHousehold] Error:', error)
    throw new UnknownAppError('Failed to update client household')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)

  return { success: true, client }
}

/**
 * Get dormancy status for a client (days since last event, isDormant flag).
 */
export async function getClientDormancyInfo(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('client_financial_summary')
    .select('last_event_date, days_since_last_event, is_dormant')
    .eq('client_id', clientId)
    .single()

  if (!data) return null

  return {
    lastEventDate: data.last_event_date as string | null,
    daysSinceLastEvent: data.days_since_last_event as number | null,
    isDormant: data.is_dormant as boolean | null,
  }
}

/**
 * Update a client's lifecycle status.
 * Valid statuses: active, dormant, repeat_ready, vip
 */
export async function updateClientStatus(clientId: string, status: string) {
  const user = await requireChef()

  const validStatuses = ['active', 'dormant', 'repeat_ready', 'vip']
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status: ${status}`)
  }

  const db: any = createServerClient()

  const { error } = await db
    .from('clients')
    .update({ status } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[updateClientStatus] Error:', error)
    throw new UnknownAppError('Failed to update client status')
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
  return { success: true }
}

/**
 * Get comprehensive financial detail for a single client.
 * Returns per-event breakdown (quoted, paid, outstanding, payment status),
 * all ledger entries for the client, and summary totals.
 */
export async function getClientFinancialDetail(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify client belongs to this tenant
  const { data: clientCheck } = await db
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!clientCheck) throw new ValidationError('Client not found')

  // Parallel: events for this client + ledger entries for this client
  const [eventsResult, ledgerResult] = await Promise.all([
    db
      .from('events')
      .select(
        'id, occasion, event_date, status, quoted_price_cents, payment_status, deposit_amount_cents, guest_count'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .order('event_date', { ascending: false }),
    db
      .from('ledger_entries')
      .select(
        'id, entry_type, amount_cents, is_refund, description, payment_method, created_at, received_at, event_id, events(id, occasion, event_date)'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false }),
  ])

  const events = eventsResult.data ?? []
  const ledgerEntries = ledgerResult.data ?? []

  // Fetch financial summary for each event from the view
  const eventIds = events.map((e: any) => e.id)
  const { data: summaries } =
    eventIds.length > 0
      ? await db
          .from('event_financial_summary')
          .select(
            'event_id, total_paid_cents, total_refunded_cents, outstanding_balance_cents, tip_amount_cents, net_revenue_cents'
          )
          .in('event_id', eventIds)
      : { data: [] }

  const summaryMap = new Map<
    string,
    {
      total_paid_cents: number
      total_refunded_cents: number
      outstanding_balance_cents: number
      tip_amount_cents: number
      net_revenue_cents: number
    }
  >()
  for (const s of summaries ?? []) {
    if (s.event_id)
      summaryMap.set(s.event_id, {
        total_paid_cents: s.total_paid_cents ?? 0,
        total_refunded_cents: s.total_refunded_cents ?? 0,
        outstanding_balance_cents: s.outstanding_balance_cents ?? 0,
        tip_amount_cents: s.tip_amount_cents ?? 0,
        net_revenue_cents: s.net_revenue_cents ?? 0,
      })
  }

  // Build per-event breakdown
  const eventBreakdown = events.map((event: any) => {
    const fin = summaryMap.get(event.id) ?? {
      total_paid_cents: 0,
      total_refunded_cents: 0,
      outstanding_balance_cents: 0,
      tip_amount_cents: 0,
      net_revenue_cents: 0,
    }
    return {
      eventId: event.id,
      occasion: event.occasion ?? 'Untitled Event',
      eventDate: event.event_date,
      status: event.status,
      guestCount: event.guest_count ?? 0,
      quotedPriceCents: event.quoted_price_cents ?? 0,
      depositAmountCents: event.deposit_amount_cents ?? 0,
      paymentStatus: event.payment_status ?? 'unpaid',
      totalPaidCents: fin.total_paid_cents,
      totalRefundedCents: fin.total_refunded_cents,
      outstandingBalanceCents: fin.outstanding_balance_cents,
      tipAmountCents: fin.tip_amount_cents,
    }
  })

  // Compute summary totals (exclude cancelled events from outstanding)
  const activeEvents = eventBreakdown.filter((e: any) => e.status !== 'cancelled')
  const totalQuotedCents = activeEvents.reduce((sum: any, e: any) => sum + e.quotedPriceCents, 0)
  const totalPaidCents = activeEvents.reduce((sum: any, e: any) => sum + e.totalPaidCents, 0)
  const totalOutstandingCents = activeEvents.reduce(
    (sum: any, e: any) => sum + e.outstandingBalanceCents,
    0
  )
  const totalRefundedCents = eventBreakdown.reduce(
    (sum: any, e: any) => sum + e.totalRefundedCents,
    0
  )

  // Tips: compute from ledger entries (entry_type = 'tip') to stay consistent
  // with getTenantFinancialSummary - ledger is the source of truth, not events.tip_amount_cents
  const totalTipsCents = ledgerEntries
    .filter((e: any) => e.entry_type === 'tip')
    .reduce((sum: number, e: any) => sum + e.amount_cents, 0)

  return {
    eventBreakdown,
    ledgerEntries,
    summary: {
      totalQuotedCents,
      totalPaidCents,
      totalOutstandingCents,
      totalRefundedCents,
      totalTipsCents,
      collectionRatePercent:
        totalQuotedCents > 0 ? Math.round((totalPaidCents / totalQuotedCents) * 100) : 100,
    },
  }
}

/**
 * Toggle automated emails on/off for a specific client.
 * Chef-controlled only - the client does not see or manage this setting.
 */
export async function setClientAutomatedEmails(clientId: string, enabled: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('clients')
    .update({ automated_emails_enabled: enabled } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[setClientAutomatedEmails] Error:', error)
    throw new UnknownAppError('Failed to update client email preference')
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

/**
 * Create a client record directly from an inquiry (chef-only).
 * Used in the "Add as Client" flow on the inquiry detail page.
 * Creates the client without auth account - a "shadow client" the chef manages.
 * Also links the new client to the source inquiry.
 */
export async function addClientFromInquiry(input: {
  full_name: string
  email: string
  phone?: string
  inquiryId: string
}): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    if (!input.full_name.trim() || !input.email.trim()) {
      return { success: false, error: 'Name and email are required' }
    }

    // Check for duplicate email in this tenant
    const { data: existing } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', input.email.trim().toLowerCase())
      .is('deleted_at' as any, null)
      .maybeSingle()

    if (existing) {
      // Client already exists - just link the inquiry
      await db
        .from('inquiries')
        .update({ client_id: existing.id })
        .eq('id', input.inquiryId)
        .eq('tenant_id', user.tenantId!)

      revalidatePath(`/inquiries/${input.inquiryId}`)
      revalidatePath('/clients')
      return { success: true, clientId: existing.id }
    }

    // Read inquiry record to copy dietary/preference/context data
    const { data: inquiry } = await db
      .from('inquiries')
      .select(
        'confirmed_dietary_restrictions, confirmed_allergies, confirmed_guest_count, confirmed_occasion, confirmed_budget_cents, confirmed_location, service_style_pref, source_message, referral_source'
      )
      .eq('id', input.inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()

    // Build insert payload, copying all available inquiry data to client record
    const insertPayload: Record<string, unknown> = {
      tenant_id: user.tenantId!,
      full_name: input.full_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
    }

    if (inquiry?.confirmed_dietary_restrictions?.length) {
      insertPayload.dietary_restrictions = inquiry.confirmed_dietary_restrictions
    }

    if (inquiry?.confirmed_allergies?.length) {
      insertPayload.allergies = inquiry.confirmed_allergies
    }

    // Copy address from inquiry location
    if (inquiry?.confirmed_location) {
      insertPayload.address = inquiry.confirmed_location
    }

    // Copy budget as min range (best signal we have from a single number)
    if (inquiry?.confirmed_budget_cents) {
      insertPayload.budget_range_min_cents = inquiry.confirmed_budget_cents
    }

    // Copy service style preference
    if (inquiry?.service_style_pref) {
      insertPayload.preferred_service_style = inquiry.service_style_pref
    }

    // Copy typical guest count (clients column is text, inquiry is integer)
    if (inquiry?.confirmed_guest_count) {
      insertPayload.typical_guest_count = String(inquiry.confirmed_guest_count)
    }

    // Copy referral source (clients column is enum; only copy if value is valid)
    const validReferralSources = [
      'take_a_chef',
      'instagram',
      'referral',
      'website',
      'phone',
      'email',
      'other',
    ]
    if (inquiry?.referral_source && validReferralSources.includes(inquiry.referral_source)) {
      insertPayload.referral_source = inquiry.referral_source
    }

    // Create the client record
    const { data: client, error: clientErr } = await db
      .from('clients')
      .insert(insertPayload as any)
      .select('id')
      .single()

    if (clientErr || !client) {
      console.error('[addClientFromInquiry] Insert error:', clientErr)
      return { success: false, error: 'Failed to create client record' }
    }

    // Migrate any client_allergy_records that were created during inquiry submission
    // (submitPublicInquiry writes structured records keyed to inquiry context)
    try {
      const { syncAllergyStores } = await import('@/lib/dietary/allergy-sync')
      // If dietary restrictions or allergies were copied, sync both stores
      if (inquiry?.confirmed_dietary_restrictions?.length || inquiry?.confirmed_allergies?.length) {
        await syncAllergyStores({ tenantId: user.tenantId!, clientId: client.id, db })
      }
    } catch (syncErr) {
      console.error('[addClientFromInquiry] Allergy sync failed (non-blocking):', syncErr)
    }

    // Log initial dietary data for audit trail (non-blocking)
    try {
      const { logDietaryChangeInternal } = await import('@/lib/clients/dietary-alert-actions')
      if (inquiry?.confirmed_dietary_restrictions?.length) {
        await logDietaryChangeInternal(
          user.tenantId!,
          client.id,
          'restriction_added',
          'dietary_restrictions',
          null,
          inquiry.confirmed_dietary_restrictions.join(', ')
        )
      }
      if (inquiry?.confirmed_allergies?.length) {
        await logDietaryChangeInternal(
          user.tenantId!,
          client.id,
          'allergy_added',
          'allergies',
          null,
          inquiry.confirmed_allergies.join(', ')
        )
      }
    } catch (logErr) {
      console.error('[addClientFromInquiry] Dietary change log failed (non-blocking):', logErr)
    }

    // Link inquiry to new client
    await db
      .from('inquiries')
      .update({ client_id: client.id })
      .eq('id', input.inquiryId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/inquiries/${input.inquiryId}`)
    revalidatePath('/clients')
    revalidatePath('/inquiries')

    return { success: true, clientId: client.id }
  } catch (err) {
    console.error('[addClientFromInquiry] Error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Create a client record directly (chef-only).
 * Creates a "shadow client" without requiring an auth account.
 * Used by the Event Creation Wizard when a chef adds a new client inline.
 * Returns the new client's ID so the wizard can immediately create an event.
 */
export async function createClientDirect(input: {
  full_name: string
  email: string
}): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  try {
    const user = await requireChef()

    if (!input.full_name.trim()) {
      return { success: false, error: 'Client name is required' }
    }
    if (!input.email.trim()) {
      return { success: false, error: 'Client email is required' }
    }

    const db: any = createServerClient()

    // Check for duplicate email in this tenant
    const { data: existing } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', input.email.trim().toLowerCase())
      .is('deleted_at' as any, null)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'A client with this email already exists' }
    }

    const { data: client, error: clientErr } = await db
      .from('clients')
      .insert({
        tenant_id: user.tenantId!,
        full_name: input.full_name.trim(),
        email: input.email.trim().toLowerCase(),
        status: 'active',
      } as any)
      .select('id')
      .single()

    if (clientErr || !client) {
      console.error('[createClientDirect] Insert error:', clientErr)
      return { success: false, error: 'Failed to create client record' }
    }

    revalidatePath('/clients')

    // Log chef activity (non-blocking)
    try {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'client_created',
        domain: 'client',
        entityType: 'client',
        entityId: client.id,
        summary: `Created client: ${input.full_name.trim()} (${input.email.trim()}) via event wizard`,
        context: { client_name: input.full_name.trim(), email: input.email.trim() },
      })
    } catch (err) {
      console.error('[createClientDirect] Activity log failed (non-blocking):', err)
    }

    return { success: true, clientId: client.id }
  } catch (err) {
    console.error('[createClientDirect] Error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// CLIENT QUICK LOOKUP (Dashboard Widget)
// ============================================

export interface ClientQuickResult {
  id: string
  full_name: string
  loyalty_tier: string | null
  dietary_restrictions: string | null
  allergies: string | null
  event_count: number
  last_event_date: string | null
  lifetime_revenue_cents: number
}

/**
 * Quick client search for the dashboard lookup widget.
 * Searches by name, dietary restrictions, and allergies (case-insensitive).
 * Enriches with event count, last event date, and lifetime revenue.
 * Returns top 5 matches.
 */
export async function searchClientsQuick(query: string): Promise<ClientQuickResult[]> {
  const user = await requireChef()

  if (!query || query.trim().length < 2) return []

  const db: any = createServerClient()
  const q = query.trim()

  // Search clients by name, dietary_restrictions, or allergies
  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name, loyalty_tier, dietary_restrictions, allergies')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .or(`full_name.ilike.%${q}%,dietary_restrictions.ilike.%${q}%,allergies.ilike.%${q}%`)
    .order('full_name', { ascending: true })
    .limit(5)

  if (error || !clients?.length) {
    if (error) console.error('[searchClientsQuick] Error:', error)
    return []
  }

  // Enrich with event data and revenue in parallel
  const enriched = await Promise.all(
    clients.map(async (client: any) => {
      // Get event count + last event date
      const { data: eventData } = await db
        .from('events')
        .select('id, event_date')
        .eq('tenant_id', user.tenantId!)
        .eq('client_id', client.id)
        .is('deleted_at' as any, null)
        .order('event_date', { ascending: false })

      const events = eventData ?? []

      // Get lifetime revenue from ledger
      const { data: revenueData } = await db
        .from('ledger_entries')
        .select('amount_cents')
        .eq('tenant_id', user.tenantId!)
        .eq('client_id', client.id)
        .eq('entry_type', 'payment')

      const lifetimeRevenue = (revenueData ?? []).reduce(
        (sum: number, e: any) => sum + (e.amount_cents ?? 0),
        0
      )

      return {
        id: client.id,
        full_name: client.full_name ?? 'Unknown',
        loyalty_tier: client.loyalty_tier ?? null,
        dietary_restrictions: client.dietary_restrictions ?? null,
        allergies: client.allergies ?? null,
        event_count: events.length,
        last_event_date: events[0]?.event_date ?? null,
        lifetime_revenue_cents: lifetimeRevenue,
      } satisfies ClientQuickResult
    })
  )

  return enriched
}

/**
 * Search clients by name (case-insensitive partial match).
 * Used by the Ask Remy orchestrator for client lookup tasks.
 */
export async function searchClientsByName(
  query: string
): Promise<
  Array<{ id: string; full_name: string | null; email: string | null; status: string | null }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select('id, full_name, email, status')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[searchClientsByName] Error:', error)
    return []
  }

  return data ?? []
}

/** Pre-fill data pulled from a client's most recent completed or confirmed event.
 *  Used on the New Inquiry form to reduce re-entry friction for returning clients.
 */
export async function getClientLastEventPrefill(clientId: string): Promise<{
  occasion: string | null
  guest_count: number | null
  dietary_restrictions: string[]
  location: string | null
  event_count: number
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select(
      'occasion, guest_count, dietary_restrictions, location_address, location_city, event_status'
    )
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .in('event_status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .order('event_date', { ascending: false })
    .limit(5)

  if (!events || events.length === 0) return null

  const last = events[0]
  const locationParts = [last.location_address, last.location_city].filter(Boolean)

  return {
    occasion: last.occasion ?? null,
    guest_count: last.guest_count ?? null,
    dietary_restrictions: last.dietary_restrictions ?? [],
    location: locationParts.length > 0 ? locationParts.join(', ') : null,
    event_count: events.length,
  }
}
