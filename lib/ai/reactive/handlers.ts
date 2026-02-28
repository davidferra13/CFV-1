'use server'

// Reactive Event Layer — Handler Implementations
// PRIVACY: All handlers deal with client PII → local Ollama only.
//
// Each handler is called by the queue worker when a reactive task is processed.
// They load context from the DB, call Ollama if needed, and return structured results.

import { createAdminClient } from '@/lib/supabase/admin'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { z } from 'zod'

// ============================================
// SHARED HELPERS
// ============================================

async function loadEventWithClient(supabase: any, eventId: string, tenantId: string) {
  const { data } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, location, client_id, client:clients(full_name, email, dietary_restrictions, allergies)'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
  return data
}

async function loadChefName(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', tenantId)
    .single()
  return data?.full_name ?? data?.business_name ?? 'Chef'
}

// ============================================
// HANDLER: reactive.inquiry_created
// Auto-score the lead based on available data
// ============================================

export async function handleInquiryCreated(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const inquiryId = String(payload.inquiryId ?? '')

  const { data: inquiry } = await (supabase
    .from('inquiries')
    .select(
      'id, status, created_at, confirmed_occasion, confirmed_budget_cents, confirmed_guest_count, channel, client:clients(full_name, email)'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)
    .single() as any)

  if (!inquiry) return { status: 'skipped', reason: 'Inquiry not found' }

  // Simple rule-based scoring (no LLM needed — fast, reliable)
  let score = 50
  const factors: string[] = []

  if (inquiry.confirmed_budget_cents && inquiry.confirmed_budget_cents > 100000) {
    score += 15
    factors.push('High budget')
  }
  if (inquiry.confirmed_guest_count && inquiry.confirmed_guest_count >= 20) {
    score += 10
    factors.push('Large party')
  }
  if (inquiry.channel === 'referral') {
    score += 20
    factors.push('Referral')
  } else if (inquiry.channel === 'website') {
    score += 5
    factors.push('Website inquiry')
  }
  if ((inquiry as any).client?.email) {
    score += 5
    factors.push('Email provided')
  }

  // Cap at 100
  score = Math.min(score, 100)

  // Store the score (update inquiry)
  await (supabase
    .from('inquiries')
    .update({ lead_score: score } as any)
    .eq('id', inquiryId) as any)

  return {
    inquiryId,
    score,
    factors,
    clientName: (inquiry as any).client?.full_name ?? payload.clientName ?? 'Unknown',
    summary: `Lead scored ${score}/100: ${factors.join(', ') || 'Base score'}`,
  }
}

// ============================================
// HANDLER: reactive.event_confirmed
// Generate staff briefing + flag prep needs
// ============================================

export async function handleEventConfirmed(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')

  const event = await loadEventWithClient(supabase, eventId, tenantId)
  if (!event) return { status: 'skipped', reason: 'Event not found' }

  const chefName = await loadChefName(supabase, tenantId)
  const clientName = (event as any).client?.full_name ?? 'Client'

  const BriefingSchema = z.object({
    overview: z.string(),
    keyDetails: z.array(z.string()),
    dietaryAlerts: z.array(z.string()),
    prepNotes: z.array(z.string()),
  })

  try {
    const result = await parseWithOllama(
      `You are ${chefName}'s AI kitchen assistant. Generate a concise staff briefing for an upcoming confirmed event. Include key details staff need to know, dietary alerts, and prep notes. Return JSON: { "overview": "...", "keyDetails": ["..."], "dietaryAlerts": ["..."], "prepNotes": ["..."] }`,
      `Event: ${(event as any).occasion ?? 'Event'} on ${(event as any).event_date ?? 'TBD'}
Client: ${clientName}
Guests: ${(event as any).guest_count ?? 'Unknown'}
Location: ${(event as any).location ?? 'TBD'}
Client dietary: ${(event as any).client?.dietary_restrictions?.join(', ') ?? 'None'}
Client allergies: ${(event as any).client?.allergies?.join(', ') ?? 'None'}`,
      BriefingSchema,
      { modelTier: 'standard', maxTokens: 800 }
    )

    return {
      eventId,
      clientName,
      briefing: result,
      summary: `Staff briefing generated for ${(event as any).occasion ?? 'event'}: ${result.keyDetails.length} key details, ${result.dietaryAlerts.length} dietary alerts.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate briefing', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.event_completed
// Draft thank-you + review request
// ============================================

export async function handleEventCompleted(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')

  const event = await loadEventWithClient(supabase, eventId, tenantId)
  if (!event) return { status: 'skipped', reason: 'Event not found' }

  const chefName = await loadChefName(supabase, tenantId)
  const clientName = (event as any).client?.full_name ?? 'Client'

  const PostEventSchema = z.object({
    thankYouSubject: z.string(),
    thankYouBody: z.string(),
    reviewRequestSubject: z.string(),
    reviewRequestBody: z.string(),
    aarNotes: z.array(z.string()),
  })

  try {
    const result = await parseWithOllama(
      `You are ${chefName}, a private chef. An event just completed. Generate:
1. A warm thank-you email (subject + body)
2. A friendly review/testimonial request email (subject + body)
3. After-action review notes (3-5 bullet points about what to improve for next time)

Write all emails in first person "I". Be warm and genuine. Return JSON: { "thankYouSubject": "...", "thankYouBody": "...", "reviewRequestSubject": "...", "reviewRequestBody": "...", "aarNotes": ["..."] }`,
      `Event: ${(event as any).occasion ?? 'Event'} on ${(event as any).event_date}
Client: ${clientName}
Guests: ${(event as any).guest_count ?? 'Unknown'}`,
      PostEventSchema,
      { modelTier: 'standard', maxTokens: 1024 }
    )

    return {
      eventId,
      clientName,
      thankYou: { subject: result.thankYouSubject, body: result.thankYouBody },
      reviewRequest: { subject: result.reviewRequestSubject, body: result.reviewRequestBody },
      aarNotes: result.aarNotes,
      summary: `Post-event drafts ready for ${(event as any).occasion}: thank-you, review request, and ${result.aarNotes.length} AAR notes.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate post-event drafts', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.event_cancelled
// Draft empathetic cancellation response
// ============================================

export async function handleEventCancelled(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')

  const event = await loadEventWithClient(supabase, eventId, tenantId)
  if (!event) return { status: 'skipped', reason: 'Event not found' }

  const chefName = await loadChefName(supabase, tenantId)
  const clientName = (event as any).client?.full_name ?? 'Client'

  const CancelSchema = z.object({
    subject: z.string(),
    body: z.string(),
  })

  try {
    const result = await parseWithOllama(
      `You are ${chefName}, a private chef. A client's event was just cancelled. Draft a warm, empathetic response. Express understanding (never guilt-trip), handle any logistics references professionally, and warmly invite them to rebook when ready. First person "I", 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
      `Client: ${clientName}
Event: ${(event as any).occasion ?? 'event'} was on ${(event as any).event_date ?? 'N/A'}
Guests: ${(event as any).guest_count ?? 'Unknown'}`,
      CancelSchema,
      { modelTier: 'standard', maxTokens: 800 }
    )

    return {
      eventId,
      clientName,
      subject: result.subject,
      draftText: `Subject: ${result.subject}\n\n${result.body}`,
      summary: `Cancellation response draft ready for ${clientName}.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return {
      status: 'error',
      reason: 'Could not generate cancellation response',
      error: String(err),
    }
  }
}

// ============================================
// HANDLER: reactive.menu_approved
// Run allergen risk matrix
// ============================================

export async function handleMenuApproved(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')
  const clientId = String(payload.clientId ?? '')

  if (!clientId) return { status: 'skipped', reason: 'No client ID for allergen check' }

  // Use the existing dietary check logic
  const { checkEventDietaryConflicts } = await import('@/lib/ai/dietary-check-actions')

  try {
    const result = await checkEventDietaryConflicts(eventId, clientId)
    return {
      eventId,
      clientName: result.clientName,
      restrictions: result.restrictions,
      flags: result.flags,
      safeItems: result.safeItems,
      summary: result.summary,
    }
  } catch (err) {
    return { status: 'error', reason: 'Could not run allergen check', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.payment_received
// Quick confirmation summary
// ============================================

export async function handlePaymentReceived(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')
  const amountCents = Number(payload.amountCents ?? 0)

  const event = await loadEventWithClient(supabase, eventId, tenantId)
  if (!event) return { status: 'skipped', reason: 'Event not found' }

  const clientName = (event as any).client?.full_name ?? 'Client'

  // Pure data — no LLM needed
  return {
    eventId,
    clientName,
    amountCents,
    amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
    occasion: (event as any).occasion,
    eventDate: (event as any).event_date,
    summary: `Payment of $${(amountCents / 100).toFixed(2)} received from ${clientName} for ${(event as any).occasion ?? 'event'}.`,
  }
}

// ============================================
// HANDLER: reactive.guest_list_updated
// Re-run allergen check
// ============================================

export async function handleGuestListUpdated(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')

  // Load the event to get client_id
  const { data: event } = await supabase
    .from('events')
    .select('id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.client_id) return { status: 'skipped', reason: 'No client linked to event' }

  const { checkEventDietaryConflicts } = await import('@/lib/ai/dietary-check-actions')

  try {
    const result = await checkEventDietaryConflicts(eventId, event.client_id)
    return {
      eventId,
      clientName: result.clientName,
      flags: result.flags,
      summary: result.summary,
    }
  } catch (err) {
    return { status: 'error', reason: 'Could not re-run allergen check', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.temp_out_of_range
// Immediate alert (no LLM needed)
// ============================================

export async function handleTempOutOfRange(
  payload: Record<string, unknown>,
  _tenantId: string
): Promise<Record<string, unknown>> {
  const temperature = Number(payload.temperature ?? 0)
  const safeMin = Number(payload.safeMin ?? 0)
  const safeMax = Number(payload.safeMax ?? 165)
  const eventId = String(payload.eventId ?? '')

  return {
    eventId,
    alert: 'TEMPERATURE OUT OF SAFE RANGE',
    temperature,
    safeRange: `${safeMin}°F - ${safeMax}°F`,
    deviation:
      temperature < safeMin
        ? `${safeMin - temperature}°F below minimum`
        : `${temperature - safeMax}°F above maximum`,
    summary: `ALERT: Temperature ${temperature}°F is outside safe range (${safeMin}–${safeMax}°F). Immediate action required.`,
  }
}

// ============================================
// HANDLER: reactive.staff_no_show
// Alert + backup suggestion (no LLM needed)
// ============================================

export async function handleStaffNoShow(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')
  const staffName = String(payload.staffName ?? 'Unknown')

  // Look for backup chefs
  const { data: backups } = await (supabase
    .from('backup_chef_contacts' as any)
    .select('name, phone, email, specialties')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(3) as any)

  const backupList = (
    (backups ?? []) as Array<{ name: string; phone: string | null; email: string | null }>
  ).map((b) => `${b.name} (${b.phone ?? b.email ?? 'no contact'})`)

  return {
    eventId,
    staffName,
    alert: `STAFF NO-SHOW: ${staffName} did not arrive`,
    backupSuggestions: backupList,
    summary: `${staffName} is a no-show for event. ${backupList.length > 0 ? `Backup contacts: ${backupList.join(', ')}` : 'No backup contacts on file.'}`,
  }
}

// ============================================
// HANDLER: reactive.client_dormant
// Draft re-engagement email
// ============================================

export async function handleClientDormant(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const { generateReEngagementDraft } = await import('@/lib/ai/draft-actions')
  const clientName = String(payload.clientName ?? '')
  if (!clientName) return { status: 'skipped', reason: 'No client name provided' }

  try {
    const result = await generateReEngagementDraft(clientName)
    return result as unknown as Record<string, unknown>
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate re-engagement draft', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.client_birthday
// Draft birthday message
// ============================================

export async function handleClientBirthday(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const clientId = String(payload.clientId ?? '')

  const { data: client } = await supabase
    .from('clients')
    .select('full_name, vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return { status: 'skipped', reason: 'Client not found' }

  const chefName = await loadChefName(supabase, tenantId)
  const BirthdaySchema = z.object({ subject: z.string(), body: z.string() })

  try {
    const result = await parseWithOllama(
      `You are ${chefName}, a private chef sending a birthday message to a client. Be warm and personal. Reference your culinary relationship if possible. Keep it short (2-3 paragraphs). First person "I". Return JSON: { "subject": "...", "body": "..." }`,
      `Client: ${client.full_name}
Notes: ${client.vibe_notes ?? 'none'}`,
      BirthdaySchema,
      { modelTier: 'fast', maxTokens: 400 }
    )

    return {
      clientId,
      clientName: client.full_name,
      subject: result.subject,
      draftText: `Subject: ${result.subject}\n\n${result.body}`,
      summary: `Birthday message drafted for ${client.full_name}.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate birthday message', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.client_complaint
// Alert chef with context
// ============================================

export async function handleClientComplaint(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const clientId = String(payload.clientId ?? '')
  const complaint = String(payload.complaint ?? '')

  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  return {
    clientId,
    clientName: client?.full_name ?? 'Unknown',
    complaint,
    alert: 'CLIENT COMPLAINT DETECTED',
    summary: `Complaint from ${client?.full_name ?? 'client'}: "${complaint.substring(0, 100)}..."`,
  }
}

// ============================================
// HANDLER: reactive.food_recall
// Check if affected ingredients are in upcoming menus
// ============================================

export async function handleFoodRecall(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const recalledItem = String(payload.item ?? '')
  const reason = String(payload.reason ?? '')

  // Check upcoming events for the ingredient
  const supabase: any = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .limit(20)

  return {
    recalledItem,
    reason,
    alert: `FOOD RECALL: ${recalledItem}`,
    affectedEventsCount: upcomingEvents?.length ?? 0,
    upcomingEvents: (upcomingEvents ?? []).map((e: any) => ({
      id: e.id,
      occasion: (e as any).occasion,
      date: (e as any).event_date,
    })),
    summary: `Food recall for "${recalledItem}": ${reason}. ${upcomingEvents?.length ?? 0} upcoming events to check.`,
  }
}

// ============================================
// HANDLER: reactive.payment_overdue
// Detect overdue payments and draft reminder
// ============================================

export async function handlePaymentOverdue(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const eventId = String(payload.eventId ?? '')

  const event = await loadEventWithClient(supabase, eventId, tenantId)
  if (!event) return { status: 'skipped', reason: 'Event not found' }

  const clientName = (event as any).client?.full_name ?? 'Client'
  const chefName = await loadChefName(supabase, tenantId)

  // Calculate outstanding balance from ledger
  const { data: charges } = await supabase
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .eq('entry_type', 'charge')

  const { data: payments } = await supabase
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .eq('entry_type', 'payment')

  const totalCharges = (charges ?? []).reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0)
  const totalPayments = (payments ?? []).reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0)
  const balanceDueCents = totalCharges - totalPayments

  if (balanceDueCents <= 0) {
    return { status: 'skipped', reason: 'No outstanding balance' }
  }

  const ReminderSchema = z.object({ subject: z.string(), body: z.string() })

  try {
    const result = await parseWithOllama(
      `You are ${chefName}, a private chef sending a friendly payment reminder. Be warm and professional — never aggressive. Reference the event and outstanding amount. First person "I". 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
      `Client: ${clientName}
Event: ${(event as any).occasion ?? 'event'} on ${(event as any).event_date ?? 'N/A'}
Outstanding balance: $${(balanceDueCents / 100).toFixed(2)}`,
      ReminderSchema,
      { modelTier: 'standard', maxTokens: 600 }
    )

    return {
      eventId,
      clientName,
      balanceDueCents,
      balanceFormatted: `$${(balanceDueCents / 100).toFixed(2)}`,
      subject: result.subject,
      draftText: `Subject: ${result.subject}\n\n${result.body}`,
      summary: `Payment reminder drafted for ${clientName} — $${(balanceDueCents / 100).toFixed(2)} outstanding for ${(event as any).occasion ?? 'event'}.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate payment reminder', error: String(err) }
  }
}

// ============================================
// HANDLER: reactive.inquiry_stale
// Draft follow-up for stale inquiry
// ============================================

export async function handleInquiryStale(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase: any = createAdminClient()
  const inquiryId = String(payload.inquiryId ?? '')

  const { data: inquiry } = await (supabase
    .from('inquiries')
    .select('id, created_at, confirmed_occasion, client:clients(full_name)')
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)
    .single() as any)

  if (!inquiry) return { status: 'skipped', reason: 'Inquiry not found' }

  const clientName = (inquiry as any).client?.full_name ?? 'Client'
  const chefName = await loadChefName(supabase, tenantId)

  const FollowUpSchema = z.object({ subject: z.string(), body: z.string() })

  try {
    const hoursStale = Math.round(
      (Date.now() - new Date(inquiry.created_at).getTime()) / (1000 * 60 * 60)
    )

    const result = await parseWithOllama(
      `You are ${chefName}, a private chef following up on a stale inquiry. The client reached out but hasn't heard back yet. Be apologetic for the delay, warm, and professional. First person "I". 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
      `Client: ${clientName}
Inquiry: ${(inquiry as any).confirmed_occasion ?? 'event inquiry'} — received ${hoursStale}h ago`,
      FollowUpSchema,
      { modelTier: 'standard', maxTokens: 600 }
    )

    return {
      inquiryId,
      clientName,
      subject: result.subject,
      draftText: `Subject: ${result.subject}\n\n${result.body}`,
      hoursStale,
      summary: `Stale inquiry follow-up drafted for ${clientName} (${hoursStale}h waiting).`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { status: 'error', reason: 'Could not generate follow-up', error: String(err) }
  }
}
