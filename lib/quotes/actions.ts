// Quote Pipeline Server Actions - Chef-side
// Create, manage, and track quotes through the pricing pipeline
// Quotes bridge inquiries to confirmed pricing before events are created

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'
import type { PricingInput } from '@/lib/pricing/compute'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import type { PricingDecision } from '@/lib/pricing/pricing-decision'
import { validatePricingDecision } from '@/lib/pricing/pricing-decision'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { AuthError, UnknownAppError, ValidationError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { QUOTE_SENT_REPAIR_KIND } from '@/lib/monitoring/failure-repair'
import { executeInteraction } from '@/lib/interactions'

type QuoteStatus = Database['public']['Enums']['quote_status']
type PricingModel = Database['public']['Enums']['pricing_model']

// Valid transitions (matches DB trigger)
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [], // terminal
  rejected: [], // terminal
  expired: ['draft'], // can revise and resend
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const PricingDecisionSchema = z
  .object({
    pricingSourceKind: z
      .enum([
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy',
      ])
      .optional(),
    baselineTotalCents: z.number().int().nonnegative().nullable().optional(),
    baselinePricePerPersonCents: z.number().int().positive().nullable().optional(),
    overrideKind: z.enum(['none', 'per_person', 'custom_total']).optional(),
    overrideReason: z.string().nullable().optional(),
    pricingContext: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .optional()

const CreateQuoteSchema = z.object({
  client_id: z.string().uuid(),
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  quote_name: z.string().max(255).optional().or(z.literal('')),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']),
  total_quoted_cents: z.number().int().positive('Total must be positive'),
  price_per_person_cents: z.number().int().positive().nullable().optional(),
  guest_count_estimated: z.number().int().positive().nullable().optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().nonnegative().nullable().optional(),
  deposit_percentage: z.number().min(0).max(100).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  pricing_notes: z.string().max(2000).optional().or(z.literal('')),
  internal_notes: z.string().max(2000).optional().or(z.literal('')),
  idempotency_key: z.string().optional(),
  pricingDecision: PricingDecisionSchema,
})

const UpdateQuoteSchema = z.object({
  quote_name: z.string().max(255).optional().or(z.literal('')),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  total_quoted_cents: z.number().int().positive().optional(),
  price_per_person_cents: z.number().int().positive().nullable().optional(),
  guest_count_estimated: z.number().int().positive().nullable().optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().nonnegative().nullable().optional(),
  deposit_percentage: z.number().min(0).max(100).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  pricing_notes: z.string().max(2000).nullable().optional(),
  internal_notes: z.string().max(2000).nullable().optional(),
  expected_updated_at: z.union([z.string(), z.date().transform((d) => d.toISOString())]).optional(),
  idempotency_key: z.string().optional(),
  pricingDecision: PricingDecisionSchema,
})

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>

// ============================================
// 1. CREATE QUOTE
// ============================================

export async function createQuote(input: CreateQuoteInput) {
  const user = await requireChef()
  const validated = CreateQuoteSchema.parse(input)
  const db: any = createServerClient()

  // For per_person pricing with all values present, validate total consistency.
  // Allow up to $1 (100 cents) tolerance for rounding/fees.
  if (
    validated.pricing_model === 'per_person' &&
    validated.price_per_person_cents &&
    validated.guest_count_estimated
  ) {
    const expectedTotal = validated.price_per_person_cents * validated.guest_count_estimated
    if (Math.abs(validated.total_quoted_cents - expectedTotal) > 100) {
      throw new ValidationError(
        `Quote total ($${(validated.total_quoted_cents / 100).toFixed(2)}) does not match price per person \u00d7 guest count ($${(expectedTotal / 100).toFixed(2)})`
      )
    }
  }

  // Verify client belongs to tenant
  const { data: client } = await db
    .from('clients')
    .select('tenant_id')
    .eq('id', validated.client_id)
    .single()

  if (!client || client.tenant_id !== user.tenantId) {
    throw new AuthError('Client not found or does not belong to your tenant')
  }

  // Verify inquiry belongs to tenant if provided
  if (validated.inquiry_id) {
    const { data: inquiry } = await db
      .from('inquiries')
      .select('tenant_id')
      .eq('id', validated.inquiry_id)
      .single()

    if (!inquiry || inquiry.tenant_id !== user.tenantId) {
      throw new AuthError('Inquiry not found or does not belong to your tenant')
    }
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'quotes.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      const { data: quote, error } = await db
        .from('quotes')
        .insert({
          tenant_id: user.tenantId!,
          client_id: validated.client_id,
          inquiry_id: validated.inquiry_id || null,
          event_id: validated.event_id || null,
          quote_name: validated.quote_name || null,
          pricing_model: validated.pricing_model,
          total_quoted_cents: validated.total_quoted_cents,
          price_per_person_cents: validated.price_per_person_cents ?? null,
          guest_count_estimated: validated.guest_count_estimated ?? null,
          deposit_required: validated.deposit_required ?? false,
          deposit_amount_cents: validated.deposit_amount_cents ?? null,
          deposit_percentage: validated.deposit_percentage ?? null,
          valid_until: validated.valid_until || null,
          pricing_notes: validated.pricing_notes || null,
          internal_notes: validated.internal_notes || null,
          created_by: user.id,
          updated_by: user.id,
          pricing_source_kind: validated.pricingDecision?.pricingSourceKind ?? 'manual_only',
          baseline_total_cents: validated.pricingDecision?.baselineTotalCents ?? null,
          baseline_price_per_person_cents:
            validated.pricingDecision?.baselinePricePerPersonCents ?? null,
          override_kind: validated.pricingDecision?.overrideKind ?? 'none',
          override_reason: validated.pricingDecision?.overrideReason ?? null,
          pricing_context: validated.pricingDecision?.pricingContext ?? null,
        })
        .select()
        .single()

      if (error || !quote) {
        console.error('[createQuote] Error:', error)
        throw new UnknownAppError('Failed to create quote')
      }

      revalidatePath('/quotes')
      invalidateRemyContextCache(user.tenantId!)
      return { success: true, quote }
    },
  })

  const quote = result.quote

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const amount = validated.total_quoted_cents
      ? `$${(validated.total_quoted_cents / 100).toFixed(2)}`
      : ''
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'quote_created',
      domain: 'quote',
      entityType: 'quote',
      entityId: quote.id,
      summary: `Created quote${validated.quote_name ? `: ${validated.quote_name}` : ''} - ${amount}`,
      context: {
        quote_name: validated.quote_name,
        total_cents: validated.total_quoted_cents,
        amount_display: amount,
      },
      clientId: validated.client_id,
    })
  } catch (err) {
    console.error('[createQuote] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'quote.created', {
      quote_id: quote.id,
      client_id: validated.client_id,
      total_quoted_cents: validated.total_quoted_cents,
      pricing_model: validated.pricing_model,
    })
  } catch (err) {
    console.error('[createQuote] Webhook emit failed (non-blocking):', err)
  }

  return result
}

// ============================================
// 2. GET QUOTES (LIST)
// ============================================

export async function getQuotes(filters?: {
  status?: QuoteStatus | QuoteStatus[]
  client_id?: string
  inquiry_id?: string
  event_id?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  const buildQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('quotes')
      .select(
        `
      *,
      client:clients(id, full_name, email),
      inquiry:inquiries(id, confirmed_occasion, status),
      event:events(id, occasion, event_date, status)
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

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters?.inquiry_id) {
      query = query.eq('inquiry_id', filters.inquiry_id)
    }

    if (filters?.event_id) {
      query = query.eq('event_id', filters.event_id)
    }

    return query
  }

  let response = await buildQuery(true).order('created_at', { ascending: false })
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await buildQuery(false).order('created_at', { ascending: false })
  }

  const { data: quotes, error } = response

  if (error) {
    console.error('[getQuotes] Error:', error)
    throw new UnknownAppError('Failed to fetch quotes')
  }

  return quotes
}

// ============================================
// 3. GET QUOTE BY ID
// ============================================

export async function getQuoteById(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('quotes')
      .select(
        `
      *,
      client:clients(id, full_name, email, phone),
      inquiry:inquiries(id, confirmed_occasion, status, channel),
      event:events(id, occasion, event_date, status)
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

  const { data: quote, error } = response

  if (error) {
    console.error('[getQuoteById] Error:', error)
    return null
  }

  // Get transition history (tenant-scoped to prevent cross-tenant reads)
  const { data: transitions } = await db
    .from('quote_state_transitions')
    .select('*')
    .eq('quote_id', id)
    .eq('tenant_id', user.tenantId!)
    .order('transitioned_at', { ascending: true })

  return { ...quote, transitions: transitions || [] }
}

// ============================================
// 4. UPDATE QUOTE
// ============================================

export async function updateQuote(id: string, input: UpdateQuoteInput) {
  const user = await requireChef()
  const validated = UpdateQuoteSchema.parse(input)
  const { expected_updated_at, idempotency_key, pricingDecision, ...updateFields } = validated
  const db: any = createServerClient()

  // Verify quote exists and is in draft
  const { data: current } = await (db
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!current || current.deleted_at) {
    throw new ValidationError('Quote not found')
  }

  if (current.status !== 'draft') {
    throw new ValidationError('Can only edit quotes in draft status')
  }

  const _currentQuoteTs =
    current.updated_at instanceof Date
      ? current.updated_at.toISOString()
      : String(current.updated_at)
  if (expected_updated_at && _currentQuoteTs !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', _currentQuoteTs)
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'quotes.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = db
          .from('quotes')
          .update({
            ...updateFields,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
            ...(pricingDecision !== undefined
              ? {
                  pricing_source_kind: pricingDecision?.pricingSourceKind ?? 'manual_only',
                  baseline_total_cents: pricingDecision?.baselineTotalCents ?? null,
                  baseline_price_per_person_cents:
                    pricingDecision?.baselinePricePerPersonCents ?? null,
                  override_kind: pricingDecision?.overrideKind ?? 'none',
                  override_reason: pricingDecision?.overrideReason ?? null,
                  pricing_context: pricingDecision?.pricingContext ?? null,
                }
              : {}),
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

      const { data: quote, error } = response

      if (error || !quote) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = db
              .from('quotes')
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

          const _latestQuoteTs =
            latest.updated_at instanceof Date
              ? latest.updated_at.toISOString()
              : String(latest.updated_at)
          if (latest?.updated_at && _latestQuoteTs !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', _latestQuoteTs)
          }
        }

        console.error('[updateQuote] Error:', error)
        throw new UnknownAppError('Failed to update quote')
      }

      revalidatePath('/quotes')
      revalidatePath(`/quotes/${id}`)
      invalidateRemyContextCache(user.tenantId!)
      return { success: true, quote }
    },
  })

  const quote = result.quote

  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const changedFields = Object.keys(updateFields)
    const fieldDiffs = Object.fromEntries(
      changedFields.map((field) => [
        field,
        {
          before: (current as Record<string, unknown>)[field] ?? null,
          after: (quote as Record<string, unknown>)[field] ?? null,
        },
      ])
    )
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'quote_updated',
      domain: 'quote',
      entityType: 'quote',
      entityId: id,
      summary: `Updated quote: ${quote.quote_name || 'Untitled'} - ${changedFields.join(', ')}`,
      context: {
        quote_name: quote.quote_name,
        changed_fields: changedFields,
        field_diffs: fieldDiffs,
      },
      clientId: quote.client_id,
    })
  } catch (err) {
    console.error('[updateQuote] Activity log failed (non-blocking):', err)
  }

  return result
}

// ============================================
// 5. TRANSITION QUOTE (CHEF)
// ============================================

export async function transitionQuote(id: string, newStatus: QuoteStatus) {
  const user = await requireChef()
  const db: any = createServerClient()
  const warnings: string[] = []

  const getCurrentQuote = async (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('quotes')
      .select(
        'status, total_quoted_cents, price_per_person_cents, guest_count_estimated, pricing_model, deposit_amount_cents, deposit_percentage, deposit_required, valid_until'
      )
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)

    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let quoteResponse = await getCurrentQuote(true)
  if (isMissingSoftDeleteColumn(quoteResponse.error)) {
    quoteResponse = await getCurrentQuote(false)
  }
  const quote = quoteResponse.data

  if (!quote) {
    throw new ValidationError('Quote not found')
  }

  const currentStatus = quote.status as QuoteStatus
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed: ${allowed?.join(', ') || 'none (terminal state)'}`
    )
  }

  // Client-owned decisions must come from client flow (atomic response RPC).
  if (newStatus === 'accepted' || newStatus === 'rejected') {
    throw new ValidationError(
      'Clients must accept or reject quotes from the client portal. Use status "sent" or "expired" here.'
    )
  }

  // Prevent sending a quote with zero or missing total
  if (newStatus === 'sent' && (!quote.total_quoted_cents || quote.total_quoted_cents <= 0)) {
    throw new ValidationError('Cannot send a quote with a zero or missing total amount.')
  }

  // Prevent sending an already-expired quote
  if (newStatus === 'sent' && quote.valid_until && new Date(quote.valid_until) < new Date()) {
    throw new ValidationError(
      'This quote has already expired. Update the expiry date before sending.'
    )
  }

  const { data: rpcResponse, error: rpcError } = await db.rpc('transition_quote_atomic', {
    p_quote_id: id,
    p_tenant_id: user.tenantId!,
    p_actor_id: user.id,
    p_to_status: newStatus,
    p_reason: null,
    p_metadata: { source: 'chef_portal' },
  })

  if (rpcError || !rpcResponse) {
    console.error('[transitionQuote] RPC error:', rpcError)
    throw new UnknownAppError(rpcError?.message || 'Failed to transition quote')
  }

  const updated = rpcResponse as {
    quote_id: string
    status: QuoteStatus
    tenant_id: string
    client_id: string
    inquiry_id: string | null
    event_id: string | null
    quote_name: string | null
    total_quoted_cents: number
    deposit_required: boolean
    deposit_amount_cents: number | null
    valid_until: string | null
  }

  // Sync quoted price to linked event when sending a revised quote
  if (newStatus === 'sent' && updated.event_id && updated.total_quoted_cents > 0) {
    try {
      const updatePayload: Record<string, unknown> = {
        quoted_price_cents: updated.total_quoted_cents,
      }
      if (updated.deposit_amount_cents != null) {
        updatePayload.deposit_amount_cents = updated.deposit_amount_cents
      }
      await db
        .from('events')
        .update(updatePayload)
        .eq('id', updated.event_id)
        .eq('tenant_id', user.tenantId!)

      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'event_updated',
        domain: 'quote',
        entityType: 'event',
        entityId: updated.event_id,
        summary: `Event price updated to $${(updated.total_quoted_cents / 100).toFixed(2)} from quote ${id}`,
        context: { quote_id: id, total_cents: updated.total_quoted_cents },
      })
    } catch (syncErr) {
      console.error('[transitionQuote] Event price sync failed (non-blocking):', syncErr)
      warnings.push('Quote sent but event price may not reflect the latest amount.')
    }
  }

  // Send quote-sent email to client (non-blocking)
  if (newStatus === 'sent') {
    try {
      const { data: client } = await db
        .from('clients')
        .select('email, full_name')
        .eq('id', updated.client_id)
        .single()

      const { data: chef } = await db
        .from('chefs')
        .select('business_name')
        .eq('id', user.tenantId!)
        .single()

      // Get occasion from linked inquiry or event
      let occasion: string | null = null
      if (updated.inquiry_id) {
        const { data: inquiry } = await db
          .from('inquiries')
          .select('confirmed_occasion')
          .eq('id', updated.inquiry_id)
          .single()
        occasion = inquiry?.confirmed_occasion || null
      }
      if (!occasion && updated.event_id) {
        const { data: evt } = await db
          .from('events')
          .select('occasion')
          .eq('id', updated.event_id)
          .single()
        occasion = evt?.occasion || null
      }

      // Circle-first: post quote notification to circle, email points to circle
      if (chef) {
        const { createElement } = await import('react')
        const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
        const { createClientPortalLinkForClient } = await import('@/lib/client-portal/actions')
        const chefName = chef.business_name || 'Your Chef'
        const total = (updated.total_quoted_cents / 100).toFixed(2)
        const perPerson = quote.price_per_person_cents
          ? (quote.price_per_person_cents / 100).toFixed(2)
          : null
        const deposit = updated.deposit_amount_cents
          ? (updated.deposit_amount_cents / 100).toFixed(2)
          : null
        const portalLink = client?.email
          ? await createClientPortalLinkForClient({
              db,
              clientId: updated.client_id,
              tenantId: user.tenantId!,
              path: `/quotes/${id}`,
            })
          : null

        let body = `I've sent over a quote for $${total}.`
        if (perPerson) body += ` That's $${perPerson} per person.`
        if (updated.deposit_required && deposit) body += ` A $${deposit} deposit secures the date.`

        await circleFirstNotify({
          eventId: updated.event_id,
          inquiryId: updated.inquiry_id,
          notificationType: 'quote_sent',
          body,
          metadata: {
            quote_id: id,
            total_cents: updated.total_quoted_cents,
            per_person_cents: quote.price_per_person_cents ?? null,
            deposit_cents: updated.deposit_amount_cents ?? null,
          },
          actionUrl: `/my-quotes/${id}`,
          actionLabel: 'View & Accept Quote',
          fallbackEmail: client?.email
            ? {
                to: client.email,
                subject: `New quote from ${chefName}: $${total}`,
                react: createElement(
                  (await import('@/lib/email/templates/quote-sent')).QuoteSentEmail,
                  {
                    clientName: client.full_name,
                    chefName,
                    totalFormatted: `$${total}`,
                    depositFormatted: deposit ? `$${deposit}` : null,
                    depositRequired: updated.deposit_required ?? false,
                    occasion,
                    validUntil: updated.valid_until
                      ? new Date(updated.valid_until).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : null,
                    quoteUrl:
                      portalLink?.url ||
                      `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/my-quotes`,
                  }
                ),
              }
            : undefined,
        })
      }

      // In-app notification to client (non-blocking)
      if (client?.email && chef) {
        try {
          const { createClientNotification } = await import('@/lib/notifications/client-actions')
          await createClientNotification({
            tenantId: user.tenantId!,
            clientId: updated.client_id,
            category: 'quote',
            action: 'quote_sent_to_client',
            title: `New quote from ${chef.business_name || 'your chef'}`,
            body: `${((updated.total_quoted_cents ?? 0) / 100).toFixed(2)} for ${occasion || 'your event'}`,
            actionUrl: `/my-quotes/${id}`,
            inquiryId: updated.inquiry_id ?? undefined,
          })
        } catch {
          // Non-fatal
        }
      }
    } catch (emailErr) {
      warnings.push('Quote saved but email delivery failed. The client may not have received it.')
      const { recordSideEffectFailure } = await import('@/lib/monitoring/non-blocking')
      await recordSideEffectFailure({
        source: 'quote-transition',
        operation: 'send_quote_email',
        severity: 'critical',
        entityType: 'quote',
        entityId: id,
        tenantId: user.tenantId,
        errorMessage: emailErr instanceof Error ? emailErr.message : String(emailErr),
        context: {
          repairKind: QUOTE_SENT_REPAIR_KIND,
          clientId: updated.client_id,
          inquiryId: updated.inquiry_id ?? null,
          eventId: updated.event_id ?? null,
        },
      })
    }
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  revalidatePath('/dashboard')

  // Client-side cache invalidation
  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${id}`)

  if (newStatus === 'sent') {
    await executeInteraction({
      action_type: 'send_quote',
      actor_id: user.id,
      actor: { role: 'chef', actorId: user.id, entityId: user.entityId, tenantId: user.tenantId },
      target_type: updated.event_id ? 'event' : 'system',
      target_id: updated.event_id ?? id,
      context_type: updated.inquiry_id ? 'client' : null,
      context_id: updated.client_id ?? null,
      visibility: 'private',
      metadata: {
        tenant_id: user.tenantId!,
        client_id: updated.client_id,
        quote_id: id,
        inquiry_id: updated.inquiry_id ?? null,
        event_id: updated.event_id ?? null,
        total_quoted_cents: updated.total_quoted_cents,
        source: 'quote_transition',
        suppress_interaction_notifications: true,
        suppress_interaction_activity: true,
        suppress_interaction_automation: true,
      },
      idempotency_key: `send_quote:${id}`,
    })
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const action = newStatus === 'sent' ? 'quote_sent' : 'quote_updated'
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action,
      domain: 'quote',
      entityType: 'quote',
      entityId: id,
      summary: `Quote moved from ${currentStatus} → ${newStatus}`,
      context: {
        from_status: currentStatus,
        to_status: newStatus,
        total_cents: updated.total_quoted_cents,
      },
      clientId: updated.client_id,
    })
  } catch (err) {
    console.error('[transitionQuote] Activity log failed (non-blocking):', err)
    warnings.push('Quote saved but activity log failed to record.')
  }

  // Circle post is now handled by circleFirstNotify() above (quote_sent notification)

  // Zapier/Make webhook dispatch (non-blocking)
  try {
    const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
    const zapierEvent = newStatus === 'sent' ? ('quote.sent' as const) : null
    if (zapierEvent) {
      await dispatchWebhookEvent(user.tenantId!, zapierEvent, {
        quote_id: id,
        status: newStatus,
        total_quoted_cents: updated.total_quoted_cents,
        client_id: updated.client_id,
      })
    }
  } catch (err) {
    console.error('[transitionQuote] Zapier dispatch failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    const webhookEvent = newStatus === 'sent' ? ('quote.sent' as const) : null
    if (webhookEvent) {
      await emitWebhook(user.tenantId!, webhookEvent, {
        quote_id: id,
        status: newStatus,
        total_quoted_cents: updated.total_quoted_cents,
        client_id: updated.client_id,
      })
    }
  } catch (err) {
    console.error('[updateQuoteStatus] Webhook emit failed (non-blocking):', err)
  }

  return { success: true, quote: updated, warnings: warnings.length > 0 ? warnings : undefined }
}

// ============================================
// 6. GET CLIENT PRICING HISTORY
// ============================================

export async function getClientPricingHistory(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('quotes')
      .select(
        `
      id,
      total_quoted_cents,
      price_per_person_cents,
      guest_count_estimated,
      pricing_model,
      accepted_at,
      quote_name,
      event:events(id, occasion, event_date)
    `
      )
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .eq('status', 'accepted')

    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }

    return query.order('accepted_at', { ascending: false })
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }

  const { data: quotes, error } = response

  if (error) {
    console.error('[getClientPricingHistory] Error:', error)
    throw new Error('Failed to load client pricing history')
  }

  return quotes || []
}

// ============================================
// 7. GET QUOTES FOR INQUIRY
// ============================================

export async function getQuotesForInquiry(inquiryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('quotes')
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('inquiry_id', inquiryId)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.order('created_at', { ascending: false })
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }

  const { data: quotes, error } = response

  if (error) {
    console.error('[getQuotesForInquiry] Error:', error)
    throw new Error('Failed to load quotes for inquiry')
  }

  return quotes || []
}

// ============================================
// 8. DELETE QUOTE
// ============================================

export async function deleteQuote(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: quote } = await (db
    .from('quotes')
    .select('status, deleted_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!quote || quote.deleted_at) {
    throw new ValidationError('Quote not found')
  }

  if (quote.status !== 'draft') {
    throw new ValidationError('Can only delete quotes in draft status')
  }

  const { error } = await db
    .from('quotes')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteQuote] Error:', error)
    throw new UnknownAppError('Failed to delete quote')
  }

  revalidatePath('/quotes')
  invalidateRemyContextCache(user.tenantId!)
  return { success: true }
}

export async function restoreQuote(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('quotes')
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: user.id,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreQuote] Error:', error)
    throw new UnknownAppError('Failed to restore quote')
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return { success: true }
}

// ============================================
// 9. CREATE QUOTE FROM PRICING INPUT
// ============================================
// High-level action: runs the deterministic pricing engine, guards against
// requiresCustomPricing, then persists the quote via createQuote().
// Use this instead of calling computePricing + createQuote separately.

export async function createQuoteFromPricingInput(
  pricingInput: PricingInput & {
    clientId: string
    inquiryId?: string
    eventId?: string
    quoteName?: string
    pricingNotes?: string
    internalNotes?: string
  }
) {
  // Import at call site (compute.ts is 'use server' - safe for dynamic import)
  const { generateQuoteFromPricing } = await import('@/lib/pricing/compute')

  const result = await generateQuoteFromPricing(pricingInput)

  // Hard guard: never persist a quote that the engine cannot fully compute
  if (result._requiresCustomPricing) {
    const reasons =
      result._validationErrors.length > 0
        ? result._validationErrors.join('; ')
        : result._breakdown.notes
            .filter(
              (n) =>
                n.toLowerCase().includes('custom') ||
                n.toLowerCase().includes('requires') ||
                n.toLowerCase().includes('buyout')
            )
            .join('; ') || 'Pricing could not be fully determined'

    throw new ValidationError(`Cannot save quote: requires custom pricing. ${reasons}`)
  }

  // Strip internal underscore fields before handing off to createQuote
  const { _requiresCustomPricing, _validationErrors, _breakdown, ...quoteData } = result

  return createQuote({
    client_id: quoteData.client_id,
    inquiry_id: quoteData.inquiry_id ?? null,
    event_id: quoteData.event_id ?? null,
    quote_name: quoteData.quote_name ?? '',
    pricing_model: quoteData.pricing_model as 'per_person' | 'flat_rate' | 'custom',
    total_quoted_cents: quoteData.total_quoted_cents,
    price_per_person_cents: quoteData.price_per_person_cents ?? null,
    guest_count_estimated: quoteData.guest_count_estimated ?? null,
    deposit_required: quoteData.deposit_required,
    deposit_amount_cents: quoteData.deposit_amount_cents ?? null,
    deposit_percentage: quoteData.deposit_percentage ?? null,
    pricing_notes: quoteData.pricing_notes ?? '',
    internal_notes: pricingInput.internalNotes ?? '',
  })
}

// ============================================
// 10. REVISE QUOTE (Version Bump)
// ============================================

export type QuoteVersionSummary = {
  id: string
  version: number
  total_quoted_cents: number
  status: string
  created_at: string
  is_superseded: boolean
}

/**
 * Creates a revised (version n+1) copy of an existing quote.
 * Marks the original as superseded. The new draft quote can then be edited
 * and re-sent to the client.
 */
export async function reviseQuote(quoteId: string): Promise<{ success: true; newQuoteId: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: original } = await db
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!original) throw new ValidationError('Quote not found')
  if ((original as any).is_superseded) {
    throw new ValidationError('This quote has already been superseded by a newer version')
  }

  const currentVersion: number = (original as any).version ?? 1

  // Create the new version as draft
  const { data: newQuote, error } = await db
    .from('quotes')
    .insert({
      tenant_id: user.tenantId!,
      client_id: original.client_id,
      inquiry_id: original.inquiry_id,
      event_id: original.event_id,
      quote_name: original.quote_name,
      pricing_model: original.pricing_model,
      total_quoted_cents: original.total_quoted_cents,
      price_per_person_cents: original.price_per_person_cents,
      guest_count_estimated: original.guest_count_estimated,
      deposit_required: original.deposit_required,
      deposit_amount_cents: original.deposit_amount_cents,
      deposit_percentage: original.deposit_percentage,
      pricing_notes: original.pricing_notes,
      internal_notes: original.internal_notes,
      status: 'draft' as QuoteStatus,
      created_by: user.id,
      // Versioning fields
      ...({ version: currentVersion + 1, previous_version_id: quoteId } as any),
    } as any)
    .select('id')
    .single()

  if (error || !newQuote) {
    console.error('[reviseQuote] Create failed:', error)
    throw new UnknownAppError('Failed to create revised quote')
  }

  // Mark original as superseded
  await db
    .from('quotes')
    .update({ is_superseded: true } as any)
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/quotes')
  if (original.event_id) revalidatePath(`/events/${original.event_id}`)

  return { success: true, newQuoteId: newQuote.id }
}

// ============================================
// 11. GET MENU COST FOR EVENT
// ============================================

/**
 * Get the food cost from the menu linked to an event.
 * Returns null if no menu or no cost data available.
 */
export async function getEventMenuCost(eventId: string): Promise<{
  menuId: string
  menuName: string
  totalFoodCostCents: number
  costPerGuestCents: number | null
  foodCostPercentage: number | null
  hasAllCosts: boolean
  guestCount: number | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find the menu linked to this event
  const { data: menu } = await db
    .from('menus')
    .select('id, name, target_guest_count')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!menu) return null

  // Get cost summary
  const { data: cost } = await db
    .from('menu_cost_summary')
    .select(
      'total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, has_all_recipe_costs'
    )
    .eq('menu_id', menu.id)
    .maybeSingle()

  if (!cost?.total_recipe_cost_cents) return null

  // Get event guest count
  const { data: event } = await db
    .from('events')
    .select('guest_count')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  return {
    menuId: menu.id,
    menuName: menu.name,
    totalFoodCostCents: cost.total_recipe_cost_cents,
    costPerGuestCents: cost.cost_per_guest_cents,
    foodCostPercentage: cost.food_cost_percentage,
    hasAllCosts: cost.has_all_recipe_costs ?? false,
    guestCount: event?.guest_count ?? menu.target_guest_count ?? null,
  }
}

/**
 * Fetch the version history for a quote (all versions sharing the same lineage).
 */
export async function getQuoteVersionHistory(quoteId: string): Promise<QuoteVersionSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Walk back through the version chain to find the root
  let rootId = quoteId
  const seen = new Set<string>()

  while (rootId && !seen.has(rootId)) {
    seen.add(rootId)
    const { data } = await db
      .from('quotes')
      .select('previous_version_id')
      .eq('id', rootId)
      .eq('tenant_id', user.tenantId!)
      .single()
    const prev = (data as any)?.previous_version_id
    if (prev) rootId = prev
    else break
  }

  // Now fetch all quotes with this root in their chain using previous_version_id chain
  // Simplified: fetch all quotes for the same event/inquiry and return them sorted by version
  const { data: allQuotes } = await db
    .from('quotes')
    .select('id, total_quoted_cents, status, created_at, previous_version_id')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  // Filter to only those in the same lineage (connected by previous_version_id)
  const inChain = new Set<string>()
  const versionMap = new Map<string, any>()
  for (const q of (allQuotes ?? []) as any[]) {
    versionMap.set(q.id, q)
  }

  // Walk forward from root
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    inChain.add(id)
    // Find quotes that point to this as previous
    for (const [qid, q] of versionMap.entries()) {
      if (q.previous_version_id === id && !inChain.has(qid)) {
        queue.push(qid)
      }
    }
  }

  return Array.from(inChain)
    .map((id, i) => {
      const q = versionMap.get(id)
      return q
        ? {
            id: q.id,
            version: i + 1,
            total_quoted_cents: q.total_quoted_cents,
            status: q.status,
            created_at: q.created_at,
            is_superseded: q.id !== quoteId && inChain.has(q.id),
          }
        : null
    })
    .filter(Boolean) as QuoteVersionSummary[]
}
