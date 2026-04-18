// API v2: Inquiries - List & Create
// GET  /api/v2/inquiries?status=new&page=1&per_page=50
// POST /api/v2/inquiries
//
// NOTE: V2 POST creates the inquiry record with validation but does NOT fire
// the full side-effect pipeline (notifications, GOLDMINE scoring, automations,
// Dinner Circle creation, Remy reactive AI). Those trigger when the chef
// interacts with the inquiry in the app UI. Use this route for lightweight
// integrations (Zapier, CRM sync, etc.) where side effects are unwanted.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
  parsePagination,
  paginationMeta,
} from '@/lib/api/v2'

const VALID_CHANNELS = [
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
  'kiosk',
  'thumbtack',
  'theknot',
  'bark',
  'cozymeal',
  'google_business',
  'gigsalad',
  'privatechefmanager',
  'hireachef',
  'cuisineistchef',
  'campaign_response',
  'outbound_prospecting',
  'wix',
] as const

const CreateInquiryBody = z.object({
  client_name: z.string().min(1),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  channel: z.enum(VALID_CHANNELS).optional().default('other'),
  confirmed_date: z.string().optional(),
  confirmed_guest_count: z.number().int().positive().optional(),
  confirmed_occasion: z.string().optional(),
  confirmed_location: z.string().optional(),
  confirmed_budget_cents: z.number().int().nonnegative().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).optional(),
  confirmed_service_expectations: z.string().optional(),
  source_message: z.string().optional(),
  notes: z.string().optional(),
  referral_source: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  idempotency_key: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')

    let query = ctx.db
      .from('inquiries')
      .select(
        'id, tenant_id, contact_name, contact_email, contact_phone, confirmed_date, confirmed_guest_count, confirmed_occasion, confirmed_location, confirmed_budget_cents, channel, source_message, confirmed_dietary_restrictions, location_city, location_state, status, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at' as any, null)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status as any)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch inquiries', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['inquiries:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateInquiryBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Idempotency guard
    if (input.idempotency_key) {
      const { data: existing } = await ctx.db
        .from('inquiries')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('idempotency_key' as any, input.idempotency_key)
        .maybeSingle()
      if (existing) {
        const { data: full } = await ctx.db
          .from('inquiries')
          .select('*')
          .eq('id', (existing as any).id)
          .single()
        return apiCreated(full)
      }
    }

    const { data: inquiry, error } = await ctx.db
      .from('inquiries')
      .insert({
        tenant_id: ctx.tenantId,
        contact_name: input.client_name,
        contact_email: input.client_email,
        contact_phone: input.client_phone,
        channel: input.channel,
        confirmed_date: input.confirmed_date,
        confirmed_guest_count: input.confirmed_guest_count,
        confirmed_occasion: input.confirmed_occasion,
        confirmed_location: input.confirmed_location,
        confirmed_budget_cents: input.confirmed_budget_cents,
        confirmed_dietary_restrictions: input.confirmed_dietary_restrictions,
        confirmed_service_expectations: input.confirmed_service_expectations,
        source_message: input.source_message,
        notes: input.notes,
        referral_source: input.referral_source,
        location_city: input.location_city,
        location_state: input.location_state,
        idempotency_key: input.idempotency_key,
        status: 'new',
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inquiries] Create error:', error)
      return apiError('create_failed', 'Failed to create inquiry', 500)
    }

    return apiCreated(inquiry)
  },
  { scopes: ['inquiries:write'] }
)
