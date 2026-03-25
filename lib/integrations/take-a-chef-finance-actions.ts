'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { extractTakeAChefIntegrationSettings } from './take-a-chef-defaults'
import {
  calculateTakeAChefFinanceSummary,
  extractTakeAChefFinanceMeta,
  mergeTakeAChefFinanceMeta,
  TAKE_A_CHEF_PAYOUT_STATUS_VALUES,
} from './take-a-chef-finance'

const SaveTakeAChefEventFinanceSchema = z.object({
  eventId: z.string().uuid(),
  grossBookingCents: z.number().int().nonnegative().nullable().optional(),
  commissionPercent: z.number().min(0).max(50).nullable().optional(),
  payoutAmountCents: z.number().int().nonnegative().nullable().optional(),
  payoutStatus: z.enum(TAKE_A_CHEF_PAYOUT_STATUS_VALUES).default('untracked'),
  payoutArrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  payoutReference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  syncCommissionExpense: z.boolean().default(true),
})

async function findLinkedInquiry(params: {
  db: any
  tenantId: string
  eventId: string
  inquiryId: string | null
}) {
  if (params.inquiryId) {
    const { data } = await params.db
      .from('inquiries')
      .select('id, channel, external_platform, external_link, unknown_fields, first_contact_at')
      .eq('tenant_id', params.tenantId)
      .eq('id', params.inquiryId)
      .maybeSingle()

    if (data) return data
  }

  const { data } = await params.db
    .from('inquiries')
    .select('id, channel, external_platform, external_link, unknown_fields, first_contact_at')
    .eq('tenant_id', params.tenantId)
    .eq('converted_to_event_id', params.eventId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

export async function getTakeAChefEventFinance(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [{ data: event }, { data: tenantSettings }] = await Promise.all([
    db
      .from('events')
      .select(
        'id, inquiry_id, client_id, booking_source, quoted_price_cents, event_date, client:clients(referral_source, full_name)'
      )
      .eq('tenant_id', tenantId)
      .eq('id', eventId)
      .maybeSingle(),
    db
      .from('tenant_settings')
      .select('integration_connection_settings')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ])

  if (!event) return null

  const [inquiry, { data: expenses }] = await Promise.all([
    findLinkedInquiry({
      db,
      tenantId,
      eventId,
      inquiryId: event.inquiry_id ?? null,
    }),
    db
      .from('expenses')
      .select('id, amount_cents, description')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .eq('vendor_name', 'Take a Chef')
      .eq('category', 'professional_services')
      .order('created_at', { ascending: true }),
  ])

  const defaultCommissionPercent = extractTakeAChefIntegrationSettings(
    tenantSettings?.integration_connection_settings ?? null,
    inquiry?.first_contact_at ?? null
  ).defaultCommissionPercent

  const meta = extractTakeAChefFinanceMeta(inquiry?.unknown_fields ?? null)
  const loggedCommissionCents = (expenses ?? []).reduce(
    (sum: number, expense: { amount_cents: number | null }) => sum + (expense.amount_cents ?? 0),
    0
  )

  const summary = calculateTakeAChefFinanceSummary({
    grossBookingCents: meta.grossBookingCents ?? event.quoted_price_cents ?? null,
    explicitCommissionPercent: meta.commissionPercent,
    loggedCommissionCents,
    payoutAmountCents: meta.payoutAmountCents,
    payoutStatus: meta.payoutStatus,
    payoutArrivalDate: meta.payoutArrivalDate,
    payoutReference: meta.payoutReference,
    notes: meta.notes,
    updatedAt: meta.updatedAt,
    defaultCommissionPercent,
  })

  const client = Array.isArray(event.client) ? event.client[0] : event.client
  const isTakeAChef =
    inquiry?.channel === 'take_a_chef' ||
    inquiry?.external_platform === 'take_a_chef' ||
    event.booking_source === 'take_a_chef' ||
    client?.referral_source === 'take_a_chef'

  return {
    eventId,
    inquiryId: inquiry?.id ?? null,
    isTakeAChef,
    canEdit: isTakeAChef && !!inquiry?.id,
    clientName: client?.full_name ?? null,
    externalLink: inquiry?.external_link ?? null,
    defaultCommissionPercent,
    commissionExpenseId: expenses?.[0]?.id ?? null,
    commissionExpenseCount: expenses?.length ?? 0,
    ...summary,
  }
}

export async function saveTakeAChefEventFinance(input: {
  eventId: string
  grossBookingCents?: number | null
  commissionPercent?: number | null
  payoutAmountCents?: number | null
  payoutStatus?: (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number]
  payoutArrivalDate?: string | null
  payoutReference?: string | null
  notes?: string | null
  syncCommissionExpense?: boolean
}) {
  const user = await requireChef()
  const validated = SaveTakeAChefEventFinanceSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: event } = await db
    .from('events')
    .select(
      'id, inquiry_id, quoted_price_cents, event_date, booking_source, client:clients(referral_source)'
    )
    .eq('tenant_id', tenantId)
    .eq('id', validated.eventId)
    .maybeSingle()

  if (!event) {
    throw new Error('Event not found')
  }

  const inquiry = await findLinkedInquiry({
    db,
    tenantId,
    eventId: validated.eventId,
    inquiryId: event.inquiry_id ?? null,
  })

  if (!inquiry) {
    throw new Error('Link this event to its Take a Chef inquiry before tracking payout details.')
  }

  if (inquiry.channel !== 'take_a_chef' && inquiry.external_platform !== 'take_a_chef') {
    throw new Error('This event is not linked to a Take a Chef inquiry.')
  }

  const mergedUnknownFields = mergeTakeAChefFinanceMeta({
    unknownFields: inquiry.unknown_fields ?? null,
    updates: {
      grossBookingCents:
        validated.grossBookingCents === undefined
          ? (event.quoted_price_cents ?? null)
          : validated.grossBookingCents,
      commissionPercent: validated.commissionPercent,
      payoutAmountCents: validated.payoutAmountCents,
      payoutStatus: validated.payoutStatus,
      payoutArrivalDate: validated.payoutArrivalDate ?? null,
      payoutReference: validated.payoutReference ?? null,
      notes: validated.notes ?? null,
      updatedAt: new Date().toISOString(),
    },
  })

  const { error: inquiryError } = await db
    .from('inquiries')
    .update({
      unknown_fields: mergedUnknownFields,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', inquiry.id)

  if (inquiryError) {
    throw new Error(`Failed to save Take a Chef finance details: ${inquiryError.message}`)
  }

  if (validated.syncCommissionExpense) {
    const grossBookingCents =
      validated.grossBookingCents === undefined
        ? (event.quoted_price_cents ?? null)
        : validated.grossBookingCents
    const commissionPercent = validated.commissionPercent ?? null

    if (grossBookingCents && grossBookingCents > 0 && commissionPercent && commissionPercent > 0) {
      const expectedCommissionCents = Math.round((grossBookingCents * commissionPercent) / 100)
      const description = `Take a Chef platform commission (${commissionPercent}%)`
      const notes =
        'Synced from the Take a Chef payout panel. Represents platform commission withheld from payout.'

      const { data: existingExpenses } = await db
        .from('expenses')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('event_id', validated.eventId)
        .eq('vendor_name', 'Take a Chef')
        .eq('category', 'professional_services')
        .order('created_at', { ascending: true })

      const primaryExpense = existingExpenses?.[0]

      if (primaryExpense?.id) {
        const { error: expenseError } = await db
          .from('expenses')
          .update({
            amount_cents: expectedCommissionCents,
            description,
            expense_date: event.event_date,
            notes,
            updated_by: user.id,
          })
          .eq('tenant_id', tenantId)
          .eq('id', primaryExpense.id)

        if (expenseError) {
          throw new Error(`Failed to sync Take a Chef commission expense: ${expenseError.message}`)
        }
      } else {
        const { error: expenseError } = await db.from('expenses').insert({
          tenant_id: tenantId,
          event_id: validated.eventId,
          description,
          amount_cents: expectedCommissionCents,
          category: 'professional_services',
          payment_method: 'other',
          expense_date: event.event_date,
          vendor_name: 'Take a Chef',
          notes,
          is_business: true,
          created_by: user.id,
        })

        if (expenseError) {
          throw new Error(
            `Failed to create Take a Chef commission expense: ${expenseError.message}`
          )
        }
      }
    }
  }

  revalidatePath(`/events/${validated.eventId}`)
  revalidatePath('/events')
  revalidatePath('/expenses')
  revalidatePath('/insights')

  return getTakeAChefEventFinance(validated.eventId)
}
