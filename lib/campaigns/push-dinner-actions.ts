'use server'

// Push Dinner Campaign Actions
// CRUD + launch logic for push dinner campaigns.
// Push dinners are 1:1 personalised invites: every recipient gets an
// individually AI-drafted message that the chef approves before it's sent.

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { getResendClient, FROM_EMAIL } from '@/lib/email/resend-client'
import { CampaignEmail } from '@/lib/email/templates/campaign'
import { splitName } from '@/lib/marketing/tokens'
import React from 'react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

// ============================================================
// TYPES
// ============================================================

export type PushDinnerInput = {
  name: string
  occasion: string
  proposed_date: string // ISO date string YYYY-MM-DD
  proposed_time?: string // HH:MM
  price_per_person_cents?: number
  guest_count_min?: number
  guest_count_max?: number
  seats_available?: number
  concept_description?: string
  menu_id?: string
}

export type PushDinner = {
  id: string
  chef_id: string
  name: string
  status: string
  campaign_type: string
  occasion: string | null
  proposed_date: string | null
  proposed_time: string | null
  price_per_person_cents: number | null
  guest_count_min: number | null
  guest_count_max: number | null
  seats_available: number | null
  seats_booked: number
  concept_description: string | null
  public_booking_token: string | null
  menu_id: string | null
  created_at: string
  updated_at: string
}

export type PushDinnerRecipient = {
  id: string
  campaign_id: string
  client_id: string | null
  email: string
  draft_subject: string | null
  draft_body: string | null
  chef_approved: boolean
  chef_approved_at: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  responded_at: string | null
  converted_to_inquiry_id: string | null
  chef_notes: string | null
  error_message: string | null
}

// ============================================================
// HELPERS
// ============================================================

function generateToken(): string {
  // 32-char URL-safe hex token
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getChefDisplayName(chefEntityId: string, supabase: any): Promise<string> {
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('display_name, business_name')
    .eq('chef_id', chefEntityId)
    .maybeSingle()
  return prefs?.display_name || prefs?.business_name || 'Your Chef'
}

// ============================================================
// CRUD
// ============================================================

export async function createPushDinner(input: PushDinnerInput): Promise<string> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const token = generateToken()
  const seats = input.seats_available ?? input.guest_count_max ?? 12

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      chef_id: chef.entityId,
      name: input.name,
      campaign_type: 'push_dinner',
      status: 'draft',
      subject: '', // not used for push dinners — per-recipient draft_subject is used
      body_html: '', // not used — per-recipient draft_body is used
      target_segment: {},
      occasion: input.occasion,
      proposed_date: input.proposed_date,
      proposed_time: input.proposed_time ?? null,
      price_per_person_cents: input.price_per_person_cents ?? null,
      guest_count_min: input.guest_count_min ?? 4,
      guest_count_max: input.guest_count_max ?? 12,
      seats_available: seats,
      seats_booked: 0,
      concept_description: input.concept_description ?? null,
      public_booking_token: token,
      menu_id: input.menu_id ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/marketing/push-dinners')
  return data.id as string
}

export async function updatePushDinner(id: string, input: Partial<PushDinnerInput>): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('marketing_campaigns')
    .update(input)
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
  revalidatePath(`/marketing/push-dinners/${id}`)
}

export async function getPushDinner(id: string): Promise<PushDinner | null> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .single()

  if (error || !data) return null
  return data as PushDinner
}

export async function listPushDinners(): Promise<PushDinner[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('chef_id', chef.entityId)
    .eq('campaign_type', 'push_dinner')
    .order('proposed_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PushDinner[]
}

export async function cancelPushDinner(id: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('marketing_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('chef_id', chef.entityId)
    .neq('status', 'sent')

  if (error) throw new Error(error.message)
  revalidatePath('/marketing/push-dinners')
}

// ============================================================
// RECIPIENTS
// ============================================================

export async function addRecipientsToCampaign(
  campaignId: string,
  clients: Array<{ id: string; email: string }>
): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .eq('chef_id', chef.entityId)
    .single()

  if (!campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Campaign is no longer in draft')

  // Fetch existing recipients to avoid duplicates
  const { data: existing } = await supabase
    .from('campaign_recipients')
    .select('client_id')
    .eq('campaign_id', campaignId)

  const existingIds = new Set((existing ?? []).map((r: any) => r.client_id))

  const toInsert = clients
    .filter((c) => !existingIds.has(c.id) && c.email)
    .map((c) => ({
      campaign_id: campaignId,
      chef_id: chef.entityId,
      client_id: c.id,
      email: c.email,
    }))

  if (toInsert.length === 0) return

  const { error } = await supabase.from('campaign_recipients').insert(toInsert)

  if (error) throw new Error(error.message)
  revalidatePath(`/marketing/push-dinners/${campaignId}`)
}

export async function getCampaignRecipients(campaignId: string): Promise<PushDinnerRecipient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as PushDinnerRecipient[]
}

// ============================================================
// DRAFT MANAGEMENT
// ============================================================

export async function updateDraft(
  recipientId: string,
  subject: string,
  body: string
): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('campaign_recipients')
    .update({
      draft_subject: subject,
      draft_body: body,
      chef_approved: false,
      chef_approved_at: null,
    })
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)

  if (error) throw new Error(error.message)
}

export async function approveDraft(recipientId: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('campaign_recipients')
    .update({ chef_approved: true, chef_approved_at: new Date().toISOString() })
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)

  if (error) throw new Error(error.message)
}

export async function approveAllDrafts(campaignId: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('campaign_recipients')
    .update({ chef_approved: true, chef_approved_at: now })
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .not('draft_body', 'is', null)
    .eq('chef_approved', false)

  if (error) throw new Error(error.message)
  revalidatePath(`/marketing/push-dinners/${campaignId}`)
}

export async function skipRecipient(recipientId: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('campaign_recipients')
    .delete()
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)
    .is('sent_at', null)

  if (error) throw new Error(error.message)
}

// ============================================================
// LAUNCH
// ============================================================

export type LaunchResult = {
  sent: number
  failed: number
  skipped: number // approved = false, no draft
}

export async function launchCampaign(campaignId: string): Promise<LaunchResult> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Verify ownership + status
  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('chef_id', chef.entityId)
    .single()

  if (campErr || !campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Campaign is not in draft status')

  // Mark as sending
  await supabase.from('marketing_campaigns').update({ status: 'sending' }).eq('id', campaignId)

  // Fetch all approved recipients not yet sent
  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .eq('chef_approved', true)
    .is('sent_at', null)

  const chefName = await getChefDisplayName(chef.entityId, supabase)
  const unsubscribeBase = `${APP_URL}/unsubscribe?rid=`
  const bookingUrl = `${APP_URL}/book/campaign/${campaign.public_booking_token}`

  let sent = 0
  let failed = 0
  let skipped = 0

  const resend = process.env.RESEND_API_KEY ? getResendClient() : null

  for (const recipient of recipients ?? []) {
    if (!recipient.email) {
      skipped++
      continue
    }
    if (!recipient.draft_subject || !recipient.draft_body) {
      skipped++
      continue
    }

    // Append booking link to body if not already present
    const bodyWithLink = recipient.draft_body.trim() + `\n\nTo reserve your spot: ${bookingUrl}`

    const unsubscribeUrl = `${unsubscribeBase}${recipient.id}`

    if (!resend) {
      console.log('[push-dinner] RESEND_API_KEY not set — skipping email to', recipient.email)
      await supabase
        .from('campaign_recipients')
        .update({ error_message: 'Email not configured' })
        .eq('id', recipient.id)
      failed++
      continue
    }

    try {
      const { first } = splitName(
        // We try to resolve the client name if possible — graceful fallback to email
        recipient.email.split('@')[0] ?? 'there'
      )

      const { error: sendError } = await resend.emails.send({
        from: `${chefName} via ChefFlow <${FROM_EMAIL}>`,
        to: recipient.email,
        subject: recipient.draft_subject,
        react: React.createElement(CampaignEmail, {
          chefName,
          bodyText: bodyWithLink,
          previewText: recipient.draft_body.slice(0, 90),
          unsubscribeUrl,
        }),
      })

      if (sendError) {
        await supabase
          .from('campaign_recipients')
          .update({ error_message: sendError.message })
          .eq('id', recipient.id)
        failed++
      } else {
        await supabase
          .from('campaign_recipients')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', recipient.id)
        sent++
      }
    } catch (err) {
      await supabase
        .from('campaign_recipients')
        .update({ error_message: err instanceof Error ? err.message : 'Delivery failed' })
        .eq('id', recipient.id)
      failed++
    }
  }

  // Mark campaign as sent
  await supabase
    .from('marketing_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    })
    .eq('id', campaignId)

  revalidatePath('/marketing/push-dinners')
  revalidatePath(`/marketing/push-dinners/${campaignId}`)

  return { sent, failed, skipped }
}

// ============================================================
// STATS
// ============================================================

export type PushDinnerStats = {
  total_recipients: number
  drafts_generated: number
  drafts_approved: number
  sent: number
  responded: number
  booked: number
}

export async function getPushDinnerStats(campaignId: string): Promise<PushDinnerStats> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('campaign_recipients')
    .select(
      'draft_body, chef_approved, sent_at, responded_at, converted_to_inquiry_id, error_message'
    )
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)

  const rows = (data ?? []) as any[]
  return {
    total_recipients: rows.length,
    drafts_generated: rows.filter((r) => r.draft_body).length,
    drafts_approved: rows.filter((r) => r.chef_approved).length,
    sent: rows.filter((r) => r.sent_at && !r.error_message).length,
    responded: rows.filter((r) => r.responded_at).length,
    booked: rows.filter((r) => r.converted_to_inquiry_id).length,
  }
}
