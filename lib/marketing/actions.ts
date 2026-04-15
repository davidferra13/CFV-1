'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { dateToDateString } from '@/lib/utils/format'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/sms/send'
import { getResendClient, FROM_EMAIL } from '@/lib/email/resend-client'
import { renderTokens, splitName } from '@/lib/marketing/tokens'
import { CAMPAIGN_TYPE_LABELS, SEGMENT_OPTIONS, SYSTEM_TEMPLATES } from '@/lib/marketing/constants'
import { CampaignEmail } from '@/lib/email/templates/campaign'
import { subDays, addDays, format, isAfter, isBefore } from 'date-fns'
import React from 'react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
const HIGH_VALUE_THRESHOLD_CENTS = 150_000 // $1,500

// ============================================
// SCHEMAS
// ============================================

const CampaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  campaign_type: z
    .enum(['re_engagement', 'seasonal', 'announcement', 'thank_you', 'promotion', 'other'])
    .default('re_engagement'),
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Body is required'),
  target_segment: z.record(z.string(), z.unknown()).default({}),
  scheduled_at: z.string().datetime().optional(),
})

export type CampaignInput = z.infer<typeof CampaignSchema>

// ============================================
// AUDIENCE RESOLUTION (shared helper)
// ============================================

type AudienceClient = {
  id: string
  full_name: string
  email: string
  phone: string | null
  preferred_contact_method: string | null
  last_event_date?: string | null
}

async function resolveAudience(
  chefEntityId: string,
  segment: Record<string, unknown>
): Promise<AudienceClient[]> {
  const db: any = createServerClient()
  const baseSelect = 'id, full_name, email, phone, preferred_contact_method'

  // Base query factory
  const base = () =>
    db
      .from('clients')
      .select(baseSelect)
      .eq('tenant_id', chefEntityId)
      .eq('marketing_unsubscribed', false)
      .not('email', 'is', null)

  switch (segment.type) {
    case 'all_clients': {
      const { data } = await base()
      return data ?? []
    }

    case 'dormant_90_days': {
      const _m90 = new Date()
      const _c90 = new Date(_m90.getFullYear(), _m90.getMonth(), _m90.getDate() - 90)
      const cutoff = `${_c90.getFullYear()}-${String(_c90.getMonth() + 1).padStart(2, '0')}-${String(_c90.getDate()).padStart(2, '0')}`
      const { data: recentEvents } = await db
        .from('events')
        .select('client_id')
        .eq('tenant_id', chefEntityId)
        .gte('event_date', cutoff)

      const activeIds = new Set((recentEvents ?? []).map((r: any) => r.client_id))
      const { data: clients } = await base()
      return (clients ?? []).filter((c: any) => !activeIds.has(c.id))
    }

    case 'vip': {
      const { data } = await base().eq('loyalty_tier', 'vip')
      return data ?? []
    }

    case 'birthday_next_30': {
      // Clients whose personal_milestones JSONB contains a birthday within next 30 days.
      // We fetch all clients and filter in JS since JSONB birthday logic is complex.
      const { data: clients } = await base().not('personal_milestones', 'is', null)
      const today = new Date()
      const in30 = addDays(today, 30)
      return (clients ?? []).filter((c: any) => {
        const milestones: Array<{ type: string; date: string }> = c.personal_milestones ?? []
        return milestones.some((m) => {
          if (m.type !== 'birthday' && m.type !== 'Birthday') return false
          try {
            // Replace year with current year to get this year's birthday
            const bday = new Date(m.date)
            const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
            const nextYear = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
            const upcoming = isAfter(thisYear, today) ? thisYear : nextYear
            return isBefore(upcoming, in30)
          } catch {
            return false
          }
        })
      })
    }

    case 'post_event_30_60': {
      const _mn = new Date()
      const _mf = new Date(_mn.getFullYear(), _mn.getMonth(), _mn.getDate() - 60)
      const _mt = new Date(_mn.getFullYear(), _mn.getMonth(), _mn.getDate() - 30)
      const from = `${_mf.getFullYear()}-${String(_mf.getMonth() + 1).padStart(2, '0')}-${String(_mf.getDate()).padStart(2, '0')}`
      const to = `${_mt.getFullYear()}-${String(_mt.getMonth() + 1).padStart(2, '0')}-${String(_mt.getDate()).padStart(2, '0')}`
      const { data: events } = await db
        .from('events')
        .select('client_id, event_date')
        .eq('tenant_id', chefEntityId)
        .gte('event_date', from)
        .lte('event_date', to)

      const clientIdToDate: Record<string, string> = {}
      for (const e of events ?? []) {
        if (
          !clientIdToDate[e.client_id] ||
          dateToDateString(e.event_date as Date | string) > clientIdToDate[e.client_id]
        ) {
          clientIdToDate[e.client_id] = dateToDateString(e.event_date as Date | string)
        }
      }
      if (Object.keys(clientIdToDate).length === 0) return []

      const { data: clients } = await base().in('id', Object.keys(clientIdToDate))
      return (clients ?? []).map((c: any) => ({
        ...c,
        last_event_date: clientIdToDate[c.id]
          ? format(new Date(clientIdToDate[c.id]), 'MMMM d, yyyy')
          : null,
      }))
    }

    case 'high_value': {
      const { data } = await base().gte('lifetime_value_cents', HIGH_VALUE_THRESHOLD_CENTS)
      return data ?? []
    }

    case 'never_booked': {
      const { data: eventClients } = await db
        .from('events')
        .select('client_id')
        .eq('tenant_id', chefEntityId)

      const bookedIds = new Set((eventClients ?? []).map((r: any) => r.client_id))
      const { data: clients } = await base()
      return (clients ?? []).filter((c: any) => !bookedIds.has(c.id))
    }

    case 'client_ids': {
      const ids = Array.isArray(segment.ids) ? (segment.ids as string[]) : []
      if (ids.length === 0) return []
      const { data } = await base().in('id', ids)
      return data ?? []
    }

    default:
      return []
  }
}

// ============================================
// CAMPAIGNS - CRUD
// ============================================

export async function createCampaign(input: CampaignInput) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()
  const data = CampaignSchema.parse(input)

  const { data: campaign, error } = await db
    .from('marketing_campaigns')
    .insert({
      ...data,
      chef_id: chef.entityId,
      status: data.scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: data.scheduled_at ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/marketing')
  return campaign.id as string
}

export async function updateCampaign(id: string, input: Partial<CampaignInput>) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { error } = await db
    .from('marketing_campaigns')
    .update(input)
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
  revalidatePath('/marketing')
}

export async function deleteCampaign(id: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { error } = await db
    .from('marketing_campaigns')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .in('status', ['draft', 'cancelled'])

  if (error) throw new Error(error.message)
  revalidatePath('/marketing')
}

export async function listCampaigns() {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('marketing_campaigns')
    .select('*')
    .eq('chef_id', chef.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCampaign(id: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .single()

  if (error) return null
  return data
}

// ============================================
// AUDIENCE PREVIEW
// ============================================

export async function previewCampaignAudience(segment: Record<string, unknown>) {
  const chef = await requireChef()
  await requirePro('marketing')
  return resolveAudience(chef.entityId, segment)
}

// ============================================
// CHANNEL SPLIT
// ============================================

export type ChannelSplit = {
  email: AudienceClient[]
  sms: AudienceClient[]
  call: AudienceClient[]
  instagram: AudienceClient[]
  no_method: AudienceClient[]
}

/**
 * Splits the audience for a segment into groups by preferred_contact_method.
 * Clients without a preference are grouped under 'email' (default delivery).
 */
export async function getChannelSplit(segment: Record<string, unknown>): Promise<ChannelSplit> {
  const chef = await requireChef()
  await requirePro('marketing')
  const audience = await resolveAudience(chef.entityId, segment)

  const split: ChannelSplit = { email: [], sms: [], call: [], instagram: [], no_method: [] }

  for (const client of audience) {
    const method = client.preferred_contact_method?.toLowerCase()
    if (!method || method === 'email') {
      split.email.push(client)
    } else if (method === 'text' || method === 'sms') {
      split.sms.push(client)
    } else if (method === 'phone') {
      split.call.push(client)
    } else if (method === 'instagram') {
      split.instagram.push(client)
    } else {
      split.no_method.push(client)
    }
  }

  return split
}

// ============================================
// SEND CAMPAIGN
// ============================================

async function getChefDisplayName(chefEntityId: string): Promise<string> {
  const db: any = createServerClient()
  // Try chef_preferences for display_name first, fall back to chefs.name
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('display_name, business_name')
    .eq('chef_id', chefEntityId)
    .maybeSingle()

  return prefs?.display_name || prefs?.business_name || 'Your Chef'
}

export async function sendCampaignNow(campaignId: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data: campaign, error: campErr } = await db
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('chef_id', chef.entityId)
    .single()

  if (campErr || !campaign) throw new Error('Campaign not found')
  if (campaign.status === 'sent') throw new Error('Campaign already sent')

  await db.from('marketing_campaigns').update({ status: 'sending' }).eq('id', campaignId)

  const audience = await resolveAudience(
    chef.entityId,
    campaign.target_segment as Record<string, unknown>
  )
  const chefName = await getChefDisplayName(chef.entityId)

  let sentCount = 0
  let skippedCount = 0

  // Hard cap per campaign run: prevents an oversized audience or cron overlap
  // from blasting thousands of emails in one execution. Adjust if needed.
  const MAX_SENDS_PER_RUN = 500

  for (const client of audience) {
    if (sentCount >= MAX_SENDS_PER_RUN) {
      console.warn(
        `[campaign] sendCampaignNow hit MAX_SENDS_PER_RUN (${MAX_SENDS_PER_RUN}) for campaign ${campaignId}. Remaining recipients will be sent on the next run.`
      )
      break
    }
    if (!client.email) {
      skippedCount++
      continue
    }

    const { first, last } = splitName(client.full_name)

    // Guard against duplicate sends if cron fires twice for the same campaign
    const { data: existing } = await (db as any)
      .from('campaign_recipients')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('client_id', client.id)
      .maybeSingle()
    if (existing) {
      skippedCount++
      continue
    }

    // Insert recipient row first - its ID is the unsubscribe token
    const { data: recipientRow } = await db
      .from('campaign_recipients')
      .insert({
        campaign_id: campaignId,
        chef_id: chef.entityId,
        client_id: client.id,
        email: client.email,
      })
      .select('id')
      .single()

    if (!recipientRow) continue

    const unsubscribeUrl = `${APP_URL}/unsubscribe?rid=${recipientRow.id}`

    const tokenCtx = {
      first_name: first,
      last_name: last,
      full_name: client.full_name,
      chef_name: chefName,
      last_event_date: client.last_event_date ?? '',
      unsubscribe_url: unsubscribeUrl,
    }

    const renderedSubject = renderTokens(campaign.subject, tokenCtx)
    const renderedBody = renderTokens(campaign.body_html, tokenCtx)

    try {
      // Call Resend directly to capture the message ID
      if (!process.env.RESEND_API_KEY) {
        console.log('[campaign] RESEND_API_KEY not configured, skipping email to client', client.id)
        await db
          .from('campaign_recipients')
          .update({ error_message: 'Email not configured' })
          .eq('id', recipientRow.id)
        continue
      }

      const resend = getResendClient()
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: `${chefName} via ChefFlow <${FROM_EMAIL}>`,
        to: client.email,
        subject: renderedSubject,
        react: React.createElement(CampaignEmail, {
          chefName,
          bodyText: renderedBody,
          previewText: renderedBody.slice(0, 90),
          unsubscribeUrl,
        }),
      })

      if (sendError) {
        await db
          .from('campaign_recipients')
          .update({ error_message: sendError.message })
          .eq('id', recipientRow.id)
      } else {
        await db
          .from('campaign_recipients')
          .update({
            sent_at: new Date().toISOString(),
            resend_message_id: sendData?.id ?? null,
          })
          .eq('id', recipientRow.id)
        sentCount++
      }
    } catch (err) {
      await db
        .from('campaign_recipients')
        .update({ error_message: err instanceof Error ? err.message : 'Delivery failed' })
        .eq('id', recipientRow.id)
    }

    // Throttle: ~5 sends/sec to stay well under Resend's rate limits
    await new Promise((r) => setTimeout(r, 200))
  }

  await db
    .from('marketing_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sentCount,
    })
    .eq('id', campaignId)

  revalidatePath('/marketing')
  return { sentCount, skippedCount }
}

// ============================================
// UNSUBSCRIBE
// ============================================

/**
 * Public unsubscribe - called from the /unsubscribe page.
 * Uses the campaign_recipient row ID as a token (no auth required).
 * NOTE: This action uses createServerClient but the /unsubscribe page uses
 * the admin DB client (lib/db/admin.ts) to bypass RLS.
 */
export async function recordUnsubscribeByRecipientId(recipientId: string) {
  // This is called server-side from the public unsubscribe page
  // The admin client bypasses RLS for this unauthenticated operation
  const { createAdminClient } = await import('@/lib/db/admin')
  const db: any = createAdminClient()

  // Find the recipient row to get client_id and chef_id
  const { data: recipient, error: rErr } = await db
    .from('campaign_recipients')
    .select('client_id, chef_id, unsubscribed_at')
    .eq('id', recipientId)
    .single()

  if (rErr || !recipient) throw new Error('Invalid unsubscribe link')
  if (recipient.unsubscribed_at) return // already unsubscribed

  // Mark the recipient row
  await db
    .from('campaign_recipients')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', recipientId)

  // Mark the client
  await db
    .from('clients')
    .update({
      marketing_unsubscribed: true,
      marketing_unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', recipient.client_id)
    .eq('tenant_id', recipient.chef_id)

  // Get chef name for confirmation page
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('display_name, business_name')
    .eq('chef_id', recipient.chef_id)
    .maybeSingle()

  return { chefName: prefs?.display_name || prefs?.business_name || 'this chef' }
}

// ============================================
// CAMPAIGN STATS
// ============================================

export async function getCampaignStats(campaignId: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data: recipients } = await db
    .from('campaign_recipients')
    .select('sent_at, opened_at, clicked_at, unsubscribed_at, error_message')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)

  const rows = recipients ?? []
  const sent = rows.filter((r: any) => r.sent_at && !r.error_message).length
  const total = rows.length

  return {
    total,
    sent,
    failed: rows.filter((r: any) => r.error_message).length,
    opened: rows.filter((r: any) => r.opened_at).length,
    clicked: rows.filter((r: any) => r.clicked_at).length,
    unsubscribed: rows.filter((r: any) => r.unsubscribed_at).length,
    open_rate:
      sent > 0 ? Math.round((rows.filter((r: any) => r.opened_at).length / sent) * 100) : 0,
    click_rate:
      sent > 0 ? Math.round((rows.filter((r: any) => r.clicked_at).length / sent) * 100) : 0,
  }
}

export async function getCampaignRecipients(campaignId: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data } = await db
    .from('campaign_recipients')
    .select('id, email, client_id, sent_at, opened_at, clicked_at, unsubscribed_at, error_message')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .order('sent_at', { ascending: true })

  return data ?? []
}

// ============================================
// REVENUE ATTRIBUTION
// ============================================

/**
 * Returns events booked within 30 days of campaign send by campaign recipients.
 */
export async function getCampaignRevenueAttribution(campaignId: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data: campaign } = await db
    .from('marketing_campaigns')
    .select('sent_at')
    .eq('id', campaignId)
    .eq('chef_id', chef.entityId)
    .single()

  if (!campaign?.sent_at) return { bookings: 0, revenue_cents: 0 }

  const sentAt = new Date(campaign.sent_at)
  const windowEnd = addDays(sentAt, 30).toISOString()

  // Get client IDs from this campaign
  const { data: recipients } = await db
    .from('campaign_recipients')
    .select('client_id')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .not('client_id', 'is', null)

  const clientIds = [...new Set((recipients ?? []).map((r: any) => r.client_id))]
  if (clientIds.length === 0) return { bookings: 0, revenue_cents: 0 }

  // Events created in the 30-day window after send
  const { data: events } = await db
    .from('events')
    .select('id, quoted_price_cents')
    .eq('tenant_id', chef.tenantId!)
    .in('client_id', clientIds)
    .gte('created_at', campaign.sent_at)
    .lte('created_at', windowEnd)
    .not('status', 'eq', 'cancelled')

  const evs = events ?? []
  return {
    bookings: evs.length,
    revenue_cents: evs.reduce((sum: number, e: any) => sum + (e.quoted_price_cents ?? 0), 0),
  }
}

// ============================================
// CAMPAIGN TEMPLATES
// ============================================
// SYSTEM_TEMPLATES is defined in constants.ts and imported at the top of this file.

export async function listCampaignTemplates() {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Ensure system templates are seeded for this chef
  await ensureSystemTemplatesSeeded(chef.entityId, db)

  const { data, error } = await db
    .from('campaign_templates')
    .select('*')
    .eq('chef_id', chef.entityId)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function ensureSystemTemplatesSeeded(chefEntityId: string, db: any) {
  const { data: existing } = await db
    .from('campaign_templates')
    .select('id')
    .eq('chef_id', chefEntityId)
    .eq('is_system', true)
    .limit(1)

  if (existing && existing.length > 0) return // already seeded

  await db.from('campaign_templates').insert(
    SYSTEM_TEMPLATES.map((t) => ({
      ...t,
      chef_id: chefEntityId,
      is_system: true,
    }))
  )
}

export async function createCampaignTemplate(input: {
  name: string
  campaign_type: string
  subject: string
  body_html: string
}) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { error } = await db.from('campaign_templates').insert({
    ...input,
    chef_id: chef.entityId,
    is_system: false,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/marketing/templates')
}

export async function deleteCampaignTemplate(id: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { error } = await db
    .from('campaign_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .eq('is_system', false)

  if (error) throw new Error(error.message)
  revalidatePath('/marketing/templates')
}

export async function saveAsTemplate(campaignId: string, templateName: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data: campaign } = await db
    .from('marketing_campaigns')
    .select('campaign_type, subject, body_html')
    .eq('id', campaignId)
    .eq('chef_id', chef.entityId)
    .single()

  if (!campaign) throw new Error('Campaign not found')

  await db.from('campaign_templates').insert({
    name: templateName,
    campaign_type: campaign.campaign_type,
    subject: campaign.subject,
    body_html: campaign.body_html,
    chef_id: chef.entityId,
    is_system: false,
  })

  revalidatePath('/marketing/templates')
}

// ============================================
// DIRECT OUTREACH (1:1)
// ============================================

export async function sendDirectOutreach(input: {
  clientId: string
  channel: 'email' | 'sms' | 'call_note' | 'instagram_note'
  subject?: string
  body: string
}) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Fetch client
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('id', input.clientId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  let delivered: boolean | null = null
  let errorMsg: string | null = null

  if (input.channel === 'email') {
    if (!client.email) throw new Error('Client has no email address')
    const chefName = await getChefDisplayName(chef.entityId)
    const { first, last } = splitName(client.full_name)
    const tokenCtx = {
      first_name: first,
      last_name: last,
      full_name: client.full_name,
      chef_name: chefName,
      unsubscribe_url: '', // no unsubscribe for 1:1 outreach (not marketing)
    }
    const renderedBody = renderTokens(input.body, tokenCtx)
    const renderedSubject = renderTokens(input.subject ?? 'A note from your chef', tokenCtx)

    const ok = await sendEmail({
      to: client.email,
      subject: renderedSubject,
      react: React.createElement(CampaignEmail, {
        chefName,
        bodyText: renderedBody,
        previewText: renderedBody.slice(0, 90),
        unsubscribeUrl: '', // omitted for 1:1
      }),
    })
    delivered = ok
    if (!ok) errorMsg = 'Email delivery failed'
  }

  if (input.channel === 'sms') {
    if (!client.phone) throw new Error('Client has no phone number')
    const result = await sendSms(client.phone, input.body.slice(0, 1500))
    delivered = result === 'sent'
    if (result !== 'sent') errorMsg = `SMS ${result}`
  }

  // call_note and instagram_note are just logged, not delivered
  if (input.channel === 'call_note' || input.channel === 'instagram_note') {
    delivered = null
  }

  // Log to direct_outreach_log
  await db.from('direct_outreach_log').insert({
    chef_id: chef.entityId,
    client_id: input.clientId,
    channel: input.channel,
    subject: input.subject ?? null,
    body: input.body,
    delivered,
    error_msg: errorMsg,
  })

  revalidatePath(`/clients/${input.clientId}`)
}

export async function getClientOutreachHistory(clientId: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data } = await db
    .from('direct_outreach_log')
    .select('id, channel, subject, body, delivered, error_msg, sent_at')
    .eq('chef_id', chef.entityId)
    .eq('client_id', clientId)
    .order('sent_at', { ascending: false })
    .limit(20)

  return data ?? []
}

// ============================================
// SCHEDULED CAMPAIGN PROCESSING
// ============================================

/**
 * Fire all scheduled campaigns whose scheduled_at is now or in the past.
 * Called from /api/scheduled/campaigns cron.
 */
export async function processScheduledCampaigns() {
  const db: any = createServerClient()

  const { data: due } = await db
    .from('marketing_campaigns')
    .select('id, chef_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())

  if (!due || due.length === 0) return { processed: 0 }

  let processed = 0
  for (const campaign of due) {
    try {
      await sendCampaignNow(campaign.id)
      processed++
    } catch (err) {
      console.error('[campaigns] Failed to send scheduled campaign', campaign.id, err)
      await db.from('marketing_campaigns').update({ status: 'draft' }).eq('id', campaign.id)
    }
  }

  return { processed }
}

// ============================================
// SEQUENCES
// ============================================

const SequenceSchema = z.object({
  name: z.string().min(1),
  trigger_type: z.enum(['birthday', 'dormant_90', 'post_event', 'seasonal']),
  days_before_trigger: z.number().int().min(0).default(7),
})

export async function listSequences() {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('automated_sequences')
    .select('*, sequence_steps(*), sequence_enrollments(count)')
    .eq('chef_id', chef.entityId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSequence(input: {
  name: string
  trigger_type: 'birthday' | 'dormant_90' | 'post_event' | 'seasonal'
  days_before_trigger?: number
  steps: Array<{ step_number: number; delay_days: number; subject: string; body_html: string }>
}) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()
  const data = SequenceSchema.parse(input)

  const { data: seq, error } = await db
    .from('automated_sequences')
    .insert({ ...data, chef_id: chef.entityId })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (input.steps && input.steps.length > 0) {
    await db.from('sequence_steps').insert(input.steps.map((s) => ({ ...s, sequence_id: seq.id })))
  }

  revalidatePath('/marketing/sequences')
  return seq.id as string
}

export async function toggleSequence(id: string, isActive: boolean) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { error } = await db
    .from('automated_sequences')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('chef_id', chef.entityId)

  if (error) throw new Error(error.message)
  revalidatePath('/marketing/sequences')
}

export async function deleteSequence(id: string) {
  const chef = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  await db.from('automated_sequences').delete().eq('id', id).eq('chef_id', chef.entityId)

  revalidatePath('/marketing/sequences')
}

/**
 * Enroll a client in all active sequences whose trigger matches an event.
 * Called from event completion and birthday check cron.
 */
export async function enrollInSequence(
  chefEntityId: string,
  clientId: string,
  triggerType: 'birthday' | 'dormant_90' | 'post_event',
  firstSendAt: Date
) {
  const db: any = createServerClient()

  const { data: sequences } = await db
    .from('automated_sequences')
    .select('id, sequence_steps(*)')
    .eq('chef_id', chefEntityId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (!sequences || sequences.length === 0) return

  // Check client is not unsubscribed
  const { data: client } = await db
    .from('clients')
    .select('marketing_unsubscribed')
    .eq('id', clientId)
    .single()

  if (client?.marketing_unsubscribed) return

  for (const seq of sequences) {
    const steps = (seq.sequence_steps ?? []).sort((a: any, b: any) => a.step_number - b.step_number)
    if (steps.length === 0) continue

    // Upsert enrollment (ignore conflict = already enrolled)
    await db.from('sequence_enrollments').upsert(
      {
        sequence_id: seq.id,
        chef_id: chefEntityId,
        client_id: clientId,
        current_step: 1,
        next_send_at: addDays(firstSendAt, steps[0].delay_days).toISOString(),
      },
      { onConflict: 'sequence_id,client_id', ignoreDuplicates: true }
    )
  }
}

/**
 * Process pending sequence enrollments - send due emails and advance steps.
 * Called from /api/scheduled/sequences cron (daily).
 */
export async function processSequences() {
  const db: any = createServerClient()

  // Find all pending enrollments due to send
  const { data: pending } = await db
    .from('sequence_enrollments')
    .select(
      `
      id, sequence_id, chef_id, client_id, current_step, next_send_at,
      automated_sequences(chef_id, days_before_trigger),
      clients(full_name, email, marketing_unsubscribed)
    `
    )
    .is('completed_at', null)
    .is('cancelled_at', null)
    .lte('next_send_at', new Date().toISOString())

  if (!pending || pending.length === 0) return { processed: 0 }

  let processed = 0

  for (const enrollment of pending) {
    const client = enrollment.clients
    if (!client || client.marketing_unsubscribed || !client.email) {
      // Cancel enrollment
      await db
        .from('sequence_enrollments')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', enrollment.id)
      continue
    }

    // Fetch the current step
    const { data: step } = await db
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('step_number', enrollment.current_step)
      .single()

    if (!step) {
      await db
        .from('sequence_enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', enrollment.id)
      continue
    }

    // Send the email
    const chefName = await getChefDisplayName(enrollment.chef_id)
    const { first, last } = splitName(client.full_name)
    const tokenCtx = {
      first_name: first,
      last_name: last,
      full_name: client.full_name,
      chef_name: chefName,
      unsubscribe_url: `${APP_URL}/unsubscribe?rid=sequence-${enrollment.id}`,
    }

    const renderedSubject = renderTokens(step.subject, tokenCtx)
    const renderedBody = renderTokens(step.body_html, tokenCtx)

    await sendEmail({
      to: client.email,
      subject: renderedSubject,
      react: React.createElement(CampaignEmail, {
        chefName,
        bodyText: renderedBody,
        previewText: renderedBody.slice(0, 90),
        unsubscribeUrl: tokenCtx.unsubscribe_url,
      }),
    })

    // Find next step
    const { data: nextStep } = await db
      .from('sequence_steps')
      .select('step_number, delay_days')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('step_number', enrollment.current_step + 1)
      .maybeSingle()

    if (nextStep) {
      await db
        .from('sequence_enrollments')
        .update({
          current_step: nextStep.step_number,
          next_send_at: addDays(new Date(), nextStep.delay_days).toISOString(),
        })
        .eq('id', enrollment.id)
    } else {
      await db
        .from('sequence_enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', enrollment.id)
    }

    processed++
  }

  return { processed }
}

/**
 * Check all chefs' clients for upcoming birthdays and enroll in birthday sequences.
 * Called from the sequences cron.
 */
export async function processBirthdayEnrollments() {
  const db: any = createServerClient()

  // Find all active birthday sequences
  const { data: sequences } = await db
    .from('automated_sequences')
    .select('id, chef_id, days_before_trigger, sequence_steps(*)')
    .eq('trigger_type', 'birthday')
    .eq('is_active', true)

  if (!sequences || sequences.length === 0) return

  for (const seq of sequences) {
    const daysBefore = seq.days_before_trigger ?? 7
    const triggerDate = addDays(new Date(), daysBefore)

    // Fetch clients with milestones for this chef
    const { data: clients } = await db
      .from('clients')
      .select('id, full_name, email, personal_milestones')
      .eq('tenant_id', seq.chef_id)
      .eq('marketing_unsubscribed', false)
      .not('email', 'is', null)
      .not('personal_milestones', 'is', null)

    for (const client of clients ?? []) {
      const milestones: Array<{ type: string; date: string }> = client.personal_milestones ?? []
      const hasBirthday = milestones.some((m) => {
        if (m.type !== 'birthday' && m.type !== 'Birthday') return false
        try {
          const bday = new Date(m.date)
          const thisYear = new Date(triggerDate.getFullYear(), bday.getMonth(), bday.getDate())
          return (
            thisYear.getMonth() === triggerDate.getMonth() &&
            thisYear.getDate() === triggerDate.getDate()
          )
        } catch {
          return false
        }
      })

      if (hasBirthday) {
        await enrollInSequence(seq.chef_id, client.id, 'birthday', new Date())
      }
    }
  }
}
