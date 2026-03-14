// Inquiry Pipeline Server Actions
// Chef-only: Track inquiries from all channels through qualification to booking
// Adapts spec requirements to actual DB schema (confirmed_* fields, unknown_fields JSON)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { UnknownAppError, ValidationError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import {
  resolveInquiryDateForEvent,
  inferEventTimesFromConversation,
  parseCityStateFromConversation,
  buildAutoMenuCourseNamesFromConversation,
} from '@/lib/inquiries/conversation-scaffold'

type InquiryStatus = Database['public']['Enums']['inquiry_status']
type InquiryChannel = Database['public']['Enums']['inquiry_channel']

// Valid transitions map (matches DB trigger)
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['awaiting_client', 'declined'],
  awaiting_client: ['awaiting_chef', 'declined', 'expired'],
  awaiting_chef: ['quoted', 'declined'],
  quoted: ['confirmed', 'declined', 'expired'],
  confirmed: [], // terminal — converts to event
  declined: [], // terminal
  expired: ['new'], // can be reopened
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateInquirySchema = z.object({
  channel: z.enum([
    'text',
    'email',
    'instagram',
    'take_a_chef',
    'yhangry',
    'phone',
    'website',
    'referral',
    'walk_in',
    'other',
  ]),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1, 'Client name required'),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  referral_partner_id: z.string().uuid().nullable().optional(),
  partner_location_id: z.string().uuid().nullable().optional(),
  confirmed_date: z.string().optional().or(z.literal('')),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().optional().or(z.literal('')),
  confirmed_occasion: z.string().optional().or(z.literal('')),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().optional().or(z.literal('')),
  confirmed_cannabis_preference: z.string().optional().or(z.literal('')),
  source_message: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  referral_source: z.string().optional().or(z.literal('')),
  idempotency_key: z.string().optional(),
})

const UpdateInquirySchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  confirmed_date: z.string().nullable().optional(),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().nullable().optional(),
  confirmed_occasion: z.string().nullable().optional(),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().nullable().optional(),
  confirmed_cannabis_preference: z.string().nullable().optional(),
  source_message: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  next_action_required: z.string().nullable().optional(),
  next_action_by: z.string().nullable().optional(),
  follow_up_due_at: z.string().nullable().optional(),
  expected_updated_at: z.string().optional(),
  idempotency_key: z.string().optional(),
})

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>
export type UpdateInquiryInput = z.infer<typeof UpdateInquirySchema>

function inferComponentCategoryFromDishName(
  dishName: string
): Database['public']['Enums']['component_category'] {
  const value = dishName.toLowerCase()
  if (/\b(sauce|jus|vinaigrette|aioli|broth|glaze)\b/.test(value)) return 'sauce'
  if (/\b(steak|beef|ribeye|lobster|fish|haddock|chicken|duck|pork|shrimp|protein)\b/.test(value))
    return 'protein'
  if (/\b(potato|rice|grain|pasta|starch)\b/.test(value)) return 'starch'
  if (/\b(salad|vegetable|veggie|squash|broccoli|tomato|pickle)\b/.test(value)) return 'vegetable'
  if (/\b(berry|fruit|peach|apple|pear|citrus)\b/.test(value)) return 'fruit'
  if (/\b(cake|mousse|dessert|cheesecake|tart|custard|gelato)\b/.test(value)) return 'dessert'
  if (/\b(garnish|herb)\b/.test(value)) return 'garnish'
  if (/\b(bread|toast)\b/.test(value)) return 'bread'
  if (/\b(cheese|parmesan|ricotta|goat)\b/.test(value)) return 'cheese'
  if (/\b(condiment|mustard|ketchup|relish)\b/.test(value)) return 'condiment'
  if (/\b(drink|cocktail|wine|beverage)\b/.test(value)) return 'beverage'
  return 'other'
}

// ============================================
// 1. CREATE INQUIRY
// ============================================

/**
 * Create inquiry (chef-only)
 * If client_id not provided, auto-link by email match
 * Stores lead contact info in unknown_fields for unlinked inquiries
 */
export async function createInquiry(input: CreateInquiryInput) {
  const user = await requireChef()
  const validated = CreateInquirySchema.parse(input)
  const supabase: any = createServerClient()

  // Email validation (local-only — no external API call during form submission)
  if (validated.client_email) {
    try {
      const emailCheck = validateEmailLocal(validated.client_email)
      if (!emailCheck.isValid) {
        const suggestion = suggestEmailCorrection(validated.client_email)
        return {
          success: false,
          error: emailCheck.reason || 'Invalid email address',
          emailSuggestion: suggestion || undefined,
        }
      }
    } catch (err) {
      // Non-blocking — if the validator itself fails, let the inquiry through
      console.error('[createInquiry] Email validation failed (non-blocking):', err)
    }
  }

  let clientId = validated.client_id || null

  // Auto-link by email if no client_id provided
  if (!clientId && validated.client_email) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', validated.client_email)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    }
  }

  // Build unknown_fields for unlinked lead info and extra data
  const unknownFields: Record<string, string> = {}
  if (!clientId) {
    unknownFields.client_name = validated.client_name
    if (validated.client_email) unknownFields.client_email = validated.client_email
    if (validated.client_phone) unknownFields.client_phone = validated.client_phone
  }
  if (validated.notes) unknownFields.notes = validated.notes
  if (validated.referral_source) unknownFields.referral_source = validated.referral_source

  const result = await executeWithIdempotency({
    supabase,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'inquiries.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .insert({
          tenant_id: user.tenantId!,
          channel: validated.channel as any, // 'yhangry' added via migration, not yet in generated types
          client_id: clientId,
          referral_partner_id: validated.referral_partner_id || null,
          partner_location_id: validated.partner_location_id || null,
          first_contact_at: new Date().toISOString(),
          confirmed_date: validated.confirmed_date || null,
          confirmed_guest_count: validated.confirmed_guest_count ?? null,
          confirmed_location: validated.confirmed_location || null,
          confirmed_occasion: validated.confirmed_occasion || null,
          confirmed_budget_cents: validated.confirmed_budget_cents ?? null,
          confirmed_dietary_restrictions: validated.confirmed_dietary_restrictions ?? null,
          confirmed_service_expectations: validated.confirmed_service_expectations || null,
          confirmed_cannabis_preference: validated.confirmed_cannabis_preference || null,
          source_message: validated.source_message || null,
          unknown_fields:
            Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
        })
        .select()
        .single()

      if (error || !inquiry) {
        console.error('[createInquiry] Error:', error)
        throw new UnknownAppError('Failed to create inquiry')
      }

      revalidatePath('/inquiries')
      return { success: true, inquiry }
    },
  })

  const inquiry = result.inquiry

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: inquiry.id,
      summary: `Created inquiry from ${validated.client_name} via ${validated.channel}`,
      context: {
        client_name: validated.client_name,
        channel: validated.channel,
        occasion: validated.confirmed_occasion,
      },
      clientId: clientId || undefined,
    })
  } catch (err) {
    console.error('[createInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    const clientName = validated.client_name || 'Unknown'
    await evaluateAutomations(user.tenantId!, 'inquiry_created', {
      entityId: inquiry.id,
      entityType: 'inquiry',
      fields: {
        channel: validated.channel,
        client_name: clientName,
        occasion: validated.confirmed_occasion || null,
        guest_count: validated.confirmed_guest_count ?? null,
      },
    })
  } catch (err) {
    console.error('[createInquiry] Automation evaluation failed (non-blocking):', err)
  }

  // Enqueue Remy reactive AI task — auto-score lead (non-blocking)
  try {
    const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
    await onInquiryCreated(user.tenantId!, inquiry.id, clientId ?? null, {
      channel: validated.channel,
      clientName: validated.client_name,
      occasion: validated.confirmed_occasion ?? undefined,
      budgetCents: validated.confirmed_budget_cents ?? undefined,
      guestCount: validated.confirmed_guest_count ?? undefined,
    })
  } catch (err) {
    console.error('[createInquiry] Remy reactive enqueue failed (non-blocking):', err)
  }

  // Push notification — new inquiry (non-blocking)
  try {
    const { notifyNewInquiry } = await import('@/lib/notifications/onesignal')
    await notifyNewInquiry(user.id, validated.client_name, validated.confirmed_date || 'date TBD')
  } catch (err) {
    console.error('[createInquiry] Push notification failed (non-blocking):', err)
  }

  // Zapier/Make webhook dispatch (non-blocking)
  try {
    const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
    await dispatchWebhookEvent(user.tenantId!, 'inquiry.created', {
      inquiry_id: inquiry.id,
      client_name: validated.client_name,
      channel: validated.channel,
      occasion: validated.confirmed_occasion ?? null,
      date: validated.confirmed_date ?? null,
      guest_count: validated.confirmed_guest_count ?? null,
      budget_cents: validated.confirmed_budget_cents ?? null,
    })
  } catch (err) {
    console.error('[createInquiry] Zapier dispatch failed (non-blocking):', err)
  }

  return { success: true, inquiry }
}

// ============================================
// 2. GET INQUIRIES (LIST)
// ============================================

/**
 * Get inquiries (chef-only, tenant-scoped)
 * Joins with clients for display info
 */
export async function getInquiries(filters?: {
  status?: InquiryStatus | InquiryStatus[]
  channel?: InquiryChannel
  dateFrom?: string
  dateTo?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const buildQuery = (withSoftDeleteFilter: boolean) => {
    let query = supabase
      .from('inquiries')
      .select(
        `
      *,
      client:clients(id, full_name, email, phone)
    `
      )
      .eq('tenant_id', user.tenantId!)

    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.channel) {
      query = query.eq('channel', filters.channel)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    return query
  }

  let response = await buildQuery(true).order('created_at', { ascending: false })
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await buildQuery(false).order('created_at', { ascending: false })
  }
  const { data: inquiries, error } = response

  if (error) {
    console.error('[getInquiries] Error:', error)
    throw new UnknownAppError('Failed to fetch inquiries')
  }

  return inquiries
}

// ============================================
// 3. GET INQUIRY BY ID
// ============================================

/**
 * Get single inquiry with full transition history
 */
export async function getInquiryById(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = supabase
      .from('inquiries')
      .select(
        `
      *,
      client:clients(id, full_name, email, phone)
    `
      )
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: inquiry, error } = response

  if (error) {
    console.error('[getInquiryById] Error:', error)
    return null
  }

  // Get transition history
  const { data: transitions } = await supabase
    .from('inquiry_state_transitions')
    .select('*')
    .eq('inquiry_id', id)
    .order('transitioned_at', { ascending: true })

  return { ...inquiry, transitions: transitions || [] }
}

// ============================================
// 4. UPDATE INQUIRY
// ============================================

/**
 * Update inquiry fields (NOT status — use transitionInquiry)
 */
export async function updateInquiry(id: string, input: UpdateInquiryInput) {
  const user = await requireChef()
  const validated = UpdateInquirySchema.parse(input)
  const { expected_updated_at, idempotency_key, ...validatedFields } = validated
  const supabase: any = createServerClient()

  // Separate unknown_fields data from DB columns
  const { client_name, client_email, client_phone, notes, ...dbFields } = validatedFields

  // Fetch current inquiry to merge unknown_fields
  const { data: current } = await (supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!current || (current as any).deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  if (expected_updated_at && current.updated_at !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', current.updated_at)
  }

  // Merge unknown_fields
  const existingUnknown = (current.unknown_fields as Record<string, string | undefined>) || {}
  const updatedUnknown: Record<string, string | undefined> = { ...existingUnknown }
  if (client_name !== undefined) updatedUnknown.client_name = client_name
  if (client_email !== undefined) updatedUnknown.client_email = client_email ?? undefined
  if (client_phone !== undefined) updatedUnknown.client_phone = client_phone ?? undefined
  if (notes !== undefined) updatedUnknown.notes = notes ?? undefined

  // Clean out undefined values
  const cleanedUnknown: Record<string, string> = {}
  for (const [k, v] of Object.entries(updatedUnknown)) {
    if (v !== undefined) cleanedUnknown[k] = v
  }

  const result = await executeWithIdempotency({
    supabase,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'inquiries.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = supabase
          .from('inquiries')
          .update({
            ...dbFields,
            unknown_fields:
              Object.keys(cleanedUnknown).length > 0 ? (cleanedUnknown as unknown as Json) : null,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
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
      const { data: inquiry, error } = response

      if (error || !inquiry) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = supabase
              .from('inquiries')
              .select('updated_at')
              .eq('id', id)
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

          if (latest?.updated_at && latest.updated_at !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', latest.updated_at)
          }
        }

        console.error('[updateInquiry] Error:', error)
        throw new UnknownAppError('Failed to update inquiry')
      }

      revalidatePath('/inquiries')
      revalidatePath(`/inquiries/${id}`)
      return { success: true, inquiry }
    },
  })

  const inquiry = result.inquiry

  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const changedFields = [
      ...Object.keys(dbFields),
      ...Object.keys(cleanedUnknown).map((key) => `unknown_fields.${key}`),
    ]
    const fieldDiffs = Object.fromEntries([
      ...Object.keys(dbFields).map((field) => [
        field,
        {
          before: (current as Record<string, unknown>)[field] ?? null,
          after: (inquiry as Record<string, unknown>)[field] ?? null,
        },
      ]),
      ...Object.keys(cleanedUnknown).map((key) => [
        `unknown_fields.${key}`,
        {
          before: (existingUnknown as Record<string, unknown>)[key] ?? null,
          after: (cleanedUnknown as Record<string, unknown>)[key] ?? null,
        },
      ]),
    ])

    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_updated',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: id,
      summary: `Updated inquiry - ${changedFields.join(', ')}`,
      context: {
        changed_fields: changedFields,
        field_diffs: fieldDiffs,
      },
      clientId: inquiry.client_id ?? undefined,
    })
  } catch (err) {
    console.error('[updateInquiry] Activity log failed (non-blocking):', err)
  }

  return result
}

// ============================================
// 5. TRANSITION INQUIRY
// ============================================

/**
 * Transition inquiry status
 * Validates in app code for better error messages
 * DB trigger also enforces and auto-inserts into inquiry_state_transitions
 */
export async function transitionInquiry(id: string, newStatus: InquiryStatus) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current status
  const { data: inquiry } = await (supabase
    .from('inquiries')
    .select('status, deleted_at, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || (inquiry as any).deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed: ${allowed?.join(', ') || 'none (terminal state)'}`
    )
  }

  const runUpdate = async (withSoftDeleteFilter: boolean) => {
    let query = supabase
      .from('inquiries')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.select().single()
  }

  let updateResponse = await runUpdate(true)
  if (isMissingSoftDeleteColumn(updateResponse.error)) {
    updateResponse = await runUpdate(false)
  }
  const { data: updated, error } = updateResponse

  if (error) {
    console.error('[transitionInquiry] Error:', error)
    throw new UnknownAppError('Failed to transition inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_transitioned',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: id,
      summary: `Moved inquiry from ${currentStatus} → ${newStatus}`,
      context: { from_status: currentStatus, to_status: newStatus },
    })
  } catch (err) {
    console.error('[transitionInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: {
        from_status: currentStatus,
        to_status: newStatus,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('[transitionInquiry] Automation evaluation failed (non-blocking):', err)
  }

  // Non-blocking: notify client of inquiry status change
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')

      const statusNotifications: Record<
        string,
        { action: string; title: string; body: string; actionUrl: string }
      > = {
        quoted: {
          action: 'inquiry_quoted_to_client',
          title: 'Your quote is ready',
          body: 'A quote has been prepared for your inquiry',
          actionUrl: '/my-quotes',
        },
        declined: {
          action: 'inquiry_declined_to_client',
          title: 'Inquiry update',
          body: 'Your inquiry status has been updated',
          actionUrl: '/my-inquiries',
        },
        expired: {
          action: 'inquiry_expired_to_client',
          title: 'Inquiry expired',
          body: 'Your inquiry has expired — reach out to rebook',
          actionUrl: '/my-inquiries',
        },
      }

      const notif = statusNotifications[newStatus]
      if (notif) {
        await createClientNotification({
          tenantId: user.tenantId!,
          clientId: inquiry.client_id,
          category: newStatus === 'quoted' ? 'quote' : 'inquiry',
          action: notif.action as any,
          title: notif.title,
          body: notif.body,
          actionUrl: notif.actionUrl,
          inquiryId: id,
        })
      }
    }
  } catch (err) {
    console.error('[transitionInquiry] Client notification failed (non-blocking):', err)
  }

  // Client-side cache invalidation
  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${id}`)

  return { success: true, inquiry: updated }
}

// ============================================
// 6. CONVERT INQUIRY TO EVENT
// ============================================

/**
 * Convert confirmed inquiry to draft event
 * Bridges the inquiry pipeline to the event lifecycle
 * Requires: client linked, date confirmed
 */
export async function convertInquiryToEvent(inquiryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!inquiry) {
    throw new ValidationError('Inquiry not found')
  }

  if (inquiry.status !== 'confirmed') {
    throw new ValidationError('Only confirmed inquiries can be converted to events')
  }

  if (!inquiry.client_id) {
    throw new ValidationError('Inquiry must be linked to a client before converting to an event')
  }

  if (!inquiry.confirmed_date) {
    throw new ValidationError('Confirmed date is required before converting to an event')
  }

  const { data: inquiryMessages } = await supabase
    .from('messages')
    .select('body, sent_at')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiry.id)
    .order('sent_at', { ascending: true })
    .limit(100)

  const conversationText = [
    inquiry.source_message,
    ...(inquiryMessages || []).map((m: { body?: string | null }) => m.body ?? ''),
  ]
    .filter((chunk: string | null | undefined) => Boolean(chunk && chunk.trim().length > 0))
    .join('\n\n')

  const resolvedEventDate = resolveInquiryDateForEvent(
    inquiry.confirmed_date,
    inquiry.first_contact_at
  )
  if (!resolvedEventDate) {
    throw new ValidationError('Confirmed date could not be resolved to a calendar day')
  }

  const { serveTime, arrivalTime } = inferEventTimesFromConversation(conversationText)
  const parsedLocation = parseCityStateFromConversation(
    inquiry.confirmed_location,
    conversationText
  )

  // Check for accepted quote on this inquiry — use its pricing if available
  const { data: acceptedQuote } = await supabase
    .from('quotes')
    .select('id, total_quoted_cents, deposit_amount_cents, pricing_model')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  // Pricing: accepted quote wins over inquiry budget
  const quotedPriceCents =
    acceptedQuote?.total_quoted_cents ?? inquiry.confirmed_budget_cents ?? null
  const depositAmountCents = acceptedQuote?.deposit_amount_cents ?? null
  const pricingModel = acceptedQuote?.pricing_model ?? null

  // Map cannabis_preference string → boolean
  const cannabisPref = inquiry.confirmed_cannabis_preference
  const cannabisBoolean = cannabisPref
    ? ['yes', 'true', 'open'].some((v) => cannabisPref.toLowerCase().includes(v))
    : null

  // Create draft event from confirmed inquiry facts + accepted quote pricing
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: user.tenantId!,
      client_id: inquiry.client_id,
      inquiry_id: inquiry.id,
      referral_partner_id: inquiry.referral_partner_id || null,
      partner_location_id: inquiry.partner_location_id || null,
      event_date: resolvedEventDate,
      serve_time: serveTime,
      arrival_time: arrivalTime,
      guest_count: inquiry.confirmed_guest_count || 1,
      location_address: inquiry.confirmed_location || 'TBD',
      location_city: parsedLocation.city || 'TBD',
      location_state: parsedLocation.state || 'MA',
      location_zip: 'TBD',
      occasion: inquiry.confirmed_occasion,
      quoted_price_cents: quotedPriceCents,
      deposit_amount_cents: depositAmountCents,
      pricing_model: pricingModel,
      dietary_restrictions: inquiry.confirmed_dietary_restrictions || [],
      special_requests: inquiry.confirmed_service_expectations,
      cannabis_preference: cannabisBoolean,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (eventError) {
    console.error('[convertInquiryToEvent] Event creation error:', eventError)
    throw new UnknownAppError(`Failed to create event: ${eventError.message}`)
  }

  // Log initial event transition to 'draft'
  await supabase.from('event_state_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'converted_from_inquiry', inquiry_id: inquiry.id },
  })

  // Link inquiry to the created event
  await supabase
    .from('inquiries')
    .update({ converted_to_event_id: event.id })
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  // Link accepted quote to the new event
  if (acceptedQuote) {
    await supabase
      .from('quotes')
      .update({ event_id: event.id })
      .eq('id', acceptedQuote.id)
      .eq('tenant_id', user.tenantId!)
  }

  // Auto-scaffold an operational menu from inquiry conversation so event PDFs are
  // immediately usable even before manual menu entry.
  const { data: existingMenu } = await supabase
    .from('menus')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', event.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!existingMenu?.id) {
    const dishNames = buildAutoMenuCourseNamesFromConversation(conversationText)

    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert({
        tenant_id: user.tenantId!,
        event_id: event.id,
        name: `${inquiry.confirmed_occasion || 'Event'} Auto Menu`,
        description: 'Auto-scaffolded from inquiry conversation. Refine before final service.',
        target_guest_count: inquiry.confirmed_guest_count || 1,
        notes: 'Generated from inquiry conversion',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (menuError || !menu) {
      console.error('[convertInquiryToEvent] Menu scaffold creation error:', menuError)
      throw new UnknownAppError(`Failed to scaffold menu: ${menuError?.message || 'Unknown error'}`)
    }

    await supabase.from('menu_state_transitions').insert({
      tenant_id: user.tenantId!,
      menu_id: menu.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: user.id,
      reason: 'auto_scaffold_from_inquiry_conversion',
      metadata: { inquiry_id: inquiry.id, event_id: event.id },
    })

    const dishPayload = dishNames.map((dishName, index) => ({
      tenant_id: user.tenantId!,
      menu_id: menu.id,
      course_number: index + 1,
      course_name: `Course ${index + 1}`,
      name: dishName,
      description: dishName,
      dietary_tags: inquiry.confirmed_dietary_restrictions || [],
      allergen_flags: [],
      sort_order: index + 1,
      created_by: user.id,
      updated_by: user.id,
    }))

    const { data: insertedDishes, error: dishError } = await supabase
      .from('dishes')
      .insert(dishPayload)
      .select('id, name, course_number')

    if (dishError || !insertedDishes || insertedDishes.length === 0) {
      console.error('[convertInquiryToEvent] Dish scaffold creation error:', dishError)
      throw new UnknownAppError(
        `Failed to scaffold dishes: ${dishError?.message || 'Unknown error'}`
      )
    }

    const componentPayload = insertedDishes.map(
      (dish: { id: string; name: string | null; course_number: number }) => {
        const label = dish.name || `Course ${dish.course_number} Component`
        return {
          tenant_id: user.tenantId!,
          dish_id: dish.id,
          name: label,
          category: inferComponentCategoryFromDishName(label),
          is_make_ahead: true,
          execution_notes:
            'Auto-generated from inquiry conversation. Confirm final execution details.',
          storage_notes: 'Review storage and transport before service.',
          sort_order: 1,
          created_by: user.id,
          updated_by: user.id,
        }
      }
    )

    const { error: componentError } = await supabase.from('components').insert(componentPayload)
    if (componentError) {
      console.error('[convertInquiryToEvent] Component scaffold creation error:', componentError)
      throw new UnknownAppError(
        `Failed to scaffold components: ${componentError.message || 'Unknown error'}`
      )
    }

    await supabase
      .from('events')
      .update({
        menu_id: menu.id,
        course_count: insertedDishes.length,
        updated_by: user.id,
      })
      .eq('id', event.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/events')
  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${inquiryId}`)
  revalidatePath('/my-events')

  // Non-blocking: notify client their inquiry became an event
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: inquiry.client_id,
        category: 'event',
        action: 'inquiry_converted_to_client',
        title: 'Your event is being set up',
        body: `Your inquiry for "${inquiry.confirmed_occasion || 'your event'}" is now an event`,
        actionUrl: `/my-events/${event.id}`,
        eventId: event.id,
        inquiryId,
      })
    }
  } catch (err) {
    console.error('[convertInquiryToEvent] Client notification failed (non-blocking):', err)
  }

  return { success: true, event }
}

// ============================================
// 7. GET INQUIRY STATS
// ============================================

/**
 * Return counts by status for dashboard/pipeline overview
 */
export async function getInquiryStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = supabase.from('inquiries').select('status').eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: inquiries, error } = response

  if (error) {
    console.error('[getInquiryStats] Error:', error)
    throw new UnknownAppError('Failed to fetch inquiry stats')
  }

  const stats: Record<InquiryStatus, number> = {
    new: 0,
    awaiting_client: 0,
    awaiting_chef: 0,
    quoted: 0,
    confirmed: 0,
    declined: 0,
    expired: 0,
  }

  for (const inquiry of inquiries || []) {
    const status = inquiry.status as InquiryStatus
    if (status in stats) {
      stats[status]++
    }
  }

  return stats
}

// ============================================
// 8. DELETE INQUIRY
// ============================================

/**
 * Delete inquiry (chef-only)
 * Only allowed for 'new' or 'declined' status
 */
export async function deleteInquiry(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: inquiry } = await (supabase
    .from('inquiries')
    .select('status, deleted_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || inquiry.deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  if (!['new', 'declined'].includes(inquiry.status)) {
    throw new ValidationError('Can only delete inquiries in "new" or "declined" status')
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteInquiry] Error:', error)
    throw new UnknownAppError('Failed to delete inquiry')
  }

  revalidatePath('/inquiries')
  return { success: true }
}

export async function restoreInquiry(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('inquiries')
    .update({
      deleted_at: null,
      deleted_by: null,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreInquiry] Error:', error)
    throw new UnknownAppError('Failed to restore inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
  return { success: true }
}

// ============================================
// 9. DECLINE WITH REASON
// ============================================

// COMMON_DECLINE_REASONS moved to lib/inquiries/constants.ts
// to avoid exporting a non-async value from a 'use server' file.

/**
 * Decline an inquiry and record the reason.
 * Combines the status transition + reason capture in one action.
 */
export async function declineInquiry(id: string, reason?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: inquiry } = await (supabase
    .from('inquiries')
    .select('status, deleted_at, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || inquiry.deleted_at) throw new ValidationError('Inquiry not found')

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes('declined')) {
    throw new ValidationError(`Cannot decline from status "${currentStatus}"`)
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[declineInquiry] Error:', error)
    throw new UnknownAppError('Failed to decline inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: {
        status: 'declined',
        from_status: currentStatus,
        to_status: 'declined',
        decline_reason: reason,
      },
    })
  } catch {
    /* non-blocking */
  }

  // Non-blocking: notify client
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: inquiry.client_id,
        category: 'inquiry',
        action: 'inquiry_declined_to_client',
        title: 'Inquiry update',
        body: 'Your inquiry status has been updated',
        actionUrl: '/my-inquiries',
        inquiryId: id,
      })
    }
  } catch (err) {
    console.error('[declineInquiry] Client notification failed (non-blocking):', err)
  }

  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${id}`)

  return { success: true }
}

// ============================================
// 10. LOST REASON ANALYTICS
// ============================================

export type LostReasonStat = { reason: string; count: number }

/**
 * Returns a breakdown of decline reasons, sorted by frequency.
 */
export async function getLostReasonStats(): Promise<LostReasonStat[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('inquiries')
    .select('decline_reason')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'declined')
    .not('decline_reason', 'is', null)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const r = row.decline_reason ?? 'Unknown'
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// NEEDS FIRST CONTACT
// ============================================

export interface FirstContactInquiry {
  id: string
  clientName: string
  channel: string
  confirmedDate: string | null
  confirmedOccasion: string | null
  confirmedLocation: string | null
  firstContactAt: string
  clientId: string | null
}

/**
 * Get inquiries that have never been contacted — no outbound messages,
 * no linked conversation. These leads need the chef's first response.
 */
export async function getInquiriesNeedingFirstContact(): Promise<FirstContactInquiry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all new/awaiting_chef inquiries (active leads waiting for chef action)
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      'id, client_id, channel, confirmed_date, confirmed_occasion, confirmed_location, first_contact_at, unknown_fields, source_message'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])
    .eq('next_action_by', 'chef')
    .order('first_contact_at', { ascending: false })
    .limit(50)

  if (!inquiries || inquiries.length === 0) return []

  // Filter out inquiries that already have outbound messages
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: outboundMessages } = await supabase
    .from('messages')
    .select('inquiry_id')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')

  const contactedInquiryIds = new Set(
    (outboundMessages || []).map((m: any) => m.inquiry_id).filter(Boolean)
  )

  // Also check if there's an existing conversation linked
  const { data: linkedConversations } = await supabase
    .from('conversations' as any)
    .select('context_id')
    .in('context_id', inquiryIds)
    .eq('context_type', 'inquiry')

  const conversationInquiryIds = new Set(
    (linkedConversations || []).map((c: any) => c.context_id).filter(Boolean)
  )

  // Build result — only inquiries without outbound contact
  const results: FirstContactInquiry[] = []

  for (const inq of inquiries) {
    if (contactedInquiryIds.has(inq.id)) continue
    if (conversationInquiryIds.has(inq.id)) continue

    // Resolve client name
    let clientName = 'Unknown'
    if (inq.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('full_name')
        .eq('id', inq.client_id)
        .single()
      if (client?.full_name) clientName = client.full_name
    }
    // Fallback to unknown_fields
    if (clientName === 'Unknown') {
      const fields = inq.unknown_fields as Record<string, string> | null
      clientName = fields?.original_sender_name || fields?.client_name || 'Unknown'
    }

    results.push({
      id: inq.id,
      clientName,
      channel: inq.channel,
      confirmedDate: inq.confirmed_date,
      confirmedOccasion: inq.confirmed_occasion,
      confirmedLocation: inq.confirmed_location,
      firstContactAt: inq.first_contact_at,
      clientId: inq.client_id,
    })
  }

  return results
}
