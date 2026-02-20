// Wix Submission Processor
// Async pipeline: extract fields → dedup vs Gmail → create client → create inquiry → notify
// Runs with admin Supabase client (no user session) so it works from the cron endpoint.
// Follows the same pattern as lib/gmail/sync.ts handleInquiry().

import { createServerClient } from '@/lib/supabase/server'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { isCommTriageEnabled } from '@/lib/features'
import type { Json } from '@/types/database'
import type { ProcessResult } from './types'

// ─── Process a Single Wix Submission ─────────────────────────────────────

export async function processWixSubmission(submissionId: string): Promise<ProcessResult> {
  const supabase = createServerClient({ admin: true })

  // 1. Fetch the pending submission
  const { data: submission, error: fetchError } = await supabase
    .from('wix_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (fetchError || !submission) {
    return { submissionId, status: 'failed', error: `Submission not found: ${fetchError?.message}` }
  }

  // Mark as processing
  await supabase
    .from('wix_submissions')
    .update({ status: 'processing', processing_attempts: submission.processing_attempts + 1 })
    .eq('id', submissionId)

  try {
    const payload = submission.raw_payload as Record<string, unknown>

    // 2. Extract contact info from payload
    const extracted = extractContactInfo(payload)

    // Update submission with extracted fields
    await supabase
      .from('wix_submissions')
      .update({
        submitter_name: extracted.name || null,
        submitter_email: extracted.email || null,
        submitter_phone: extracted.phone || null,
      })
      .eq('id', submissionId)

    // 3. Dedup check against Gmail sync log
    // If the same person submitted a form on Wix, the form notification email
    // might also arrive in Gmail. Check for matching email within a 10-min window.
    if (extracted.email) {
      const tenMinAgo = new Date(new Date(submission.created_at).getTime() - 10 * 60 * 1000).toISOString()
      const tenMinAhead = new Date(new Date(submission.created_at).getTime() + 10 * 60 * 1000).toISOString()

      const { data: gmailMatch } = await supabase
        .from('gmail_sync_log')
        .select('id, inquiry_id')
        .eq('tenant_id', submission.tenant_id)
        .ilike('from_address', `%${extracted.email}%`)
        .gte('synced_at', tenMinAgo)
        .lte('synced_at', tenMinAhead)
        .limit(1)
        .single()

      if (gmailMatch) {
        await supabase
          .from('wix_submissions')
          .update({
            status: 'duplicate',
            gmail_duplicate_of: gmailMatch.id,
            inquiry_id: gmailMatch.inquiry_id,
            processed_at: new Date().toISOString(),
          })
          .eq('id', submissionId)

        return {
          submissionId,
          status: 'duplicate',
          inquiryId: gmailMatch.inquiry_id || undefined,
        }
      }
    }

    // 4. Build source text for AI parsing
    const sourceText = buildSourceText(payload, extracted)

    // Communication intake signal layer (non-blocking, additive)
    if (isCommTriageEnabled()) {
      try {
        const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')
        await ingestCommunicationEvent({
          tenantId: submission.tenant_id,
          source: 'website_form',
          externalId: submission.id,
          externalThreadKey: submission.wix_form_id || extracted.email || extracted.phone || submission.id,
          timestamp: new Date(submission.created_at).toISOString(),
          senderIdentity: extracted.email
            ? `${extracted.name || extracted.email} <${extracted.email}>`
            : extracted.name || extracted.phone || 'Unknown website form sender',
          rawContent: sourceText,
          direction: 'inbound',
          ingestionSource: 'webhook',
        })
      } catch (intakeErr) {
        console.error('[processWixSubmission] Communication intake failed (non-fatal):', intakeErr)
      }
    }

    // 5. Parse with AI (same function Gmail sync uses)
    const parseResult = await parseInquiryFromText(sourceText)

    // 6. Find or create client
    let clientId: string | null = null
    const leadName = extracted.name || parseResult.parsed.client_name || 'Wix Lead'
    const leadEmail = extracted.email || parseResult.parsed.client_email

    if (leadEmail) {
      try {
        const clientResult = await createClientFromLead(submission.tenant_id, {
          email: leadEmail,
          full_name: leadName,
          phone: extracted.phone || parseResult.parsed.client_phone || null,
          dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions?.length
            ? parseResult.parsed.confirmed_dietary_restrictions
            : null,
          source: 'website',
        })
        clientId = clientResult.id
      } catch (clientErr) {
        console.error('[processWixSubmission] Client creation failed (non-fatal):', clientErr)
      }
    }

    // 7. Build unknown_fields for audit trail
    const unknownFields: Record<string, string> = {}
    if (extracted.name) unknownFields.original_submitter_name = extracted.name
    if (extracted.email) unknownFields.original_submitter_email = extracted.email
    if (extracted.phone) unknownFields.client_phone = extracted.phone
    unknownFields.submission_source = 'wix_form'
    if (submission.wix_form_id) unknownFields.wix_form_id = submission.wix_form_id

    // 8. Create the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: submission.tenant_id,
        channel: 'wix' as const,
        client_id: clientId,
        first_contact_at: new Date(submission.created_at).toISOString(),
        confirmed_date: parseResult.parsed.confirmed_date || null,
        confirmed_guest_count: parseResult.parsed.confirmed_guest_count ?? null,
        confirmed_location: parseResult.parsed.confirmed_location || null,
        confirmed_occasion: parseResult.parsed.confirmed_occasion || null,
        confirmed_budget_cents: parseResult.parsed.confirmed_budget_cents ?? null,
        confirmed_dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions?.length
          ? parseResult.parsed.confirmed_dietary_restrictions
          : null,
        confirmed_service_expectations: parseResult.parsed.confirmed_service_expectations || null,
        confirmed_cannabis_preference: parseResult.parsed.confirmed_cannabis_preference || null,
        source_message: sourceText,
        unknown_fields: Object.keys(unknownFields).length > 0
          ? (unknownFields as unknown as Json)
          : null,
        next_action_required: 'Review Wix form submission',
        next_action_by: 'chef',
      })
      .select()
      .single()

    if (inquiryError) throw new Error(`Inquiry creation failed: ${inquiryError.message}`)

    // 9. Log the raw message in the messages table (CRM record)
    await supabase
      .from('messages')
      .insert({
        tenant_id: submission.tenant_id,
        inquiry_id: inquiry.id,
        client_id: clientId,
        channel: 'email' as const,
        direction: 'inbound' as const,
        status: 'logged' as const,
        subject: 'Wix Form Submission',
        body: sourceText,
        sent_at: new Date(submission.created_at).toISOString(),
      })

    // 10. Update submission as completed
    await supabase
      .from('wix_submissions')
      .update({
        status: 'completed',
        inquiry_id: inquiry.id,
        client_id: clientId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    // 11. Update connection stats
    const { data: conn } = await supabase
      .from('wix_connections')
      .select('total_submissions')
      .eq('tenant_id', submission.tenant_id)
      .single()

    await supabase
      .from('wix_connections')
      .update({
        last_submission_at: new Date().toISOString(),
        total_submissions: (conn?.total_submissions ?? 0) + 1,
      })
      .eq('tenant_id', submission.tenant_id)

    // 12. Notify the chef (non-blocking)
    try {
      const chefUserId = await getChefAuthUserId(submission.tenant_id)
      if (chefUserId) {
        await createNotification({
          tenantId: submission.tenant_id,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'wix_submission',
          title: 'New Wix form submission',
          body: `${leadName}${extracted.email ? ` (${extracted.email})` : ''} submitted a form on your website`,
          actionUrl: `/inquiries/${inquiry.id}`,
          inquiryId: inquiry.id,
          clientId: clientId || undefined,
        })
      }
    } catch (notifErr) {
      console.error('[processWixSubmission] Notification failed (non-fatal):', notifErr)
    }

    // Email the chef directly about the new Wix submission (non-blocking)
    try {
      const chefProfile = await getChefProfile(submission.tenant_id)
      if (chefProfile) {
        const { sendNewInquiryChefEmail } = await import('@/lib/email/notifications')
        await sendNewInquiryChefEmail({
          chefEmail: chefProfile.email,
          chefName: chefProfile.name,
          clientName: leadName,
          occasion: parseResult.parsed.confirmed_occasion || null,
          eventDate: parseResult.parsed.confirmed_date || null,
          guestCount: parseResult.parsed.confirmed_guest_count ?? null,
          source: 'wix',
          inquiryId: inquiry.id,
        })
      }
    } catch (emailErr) {
      console.error('[processWixSubmission] Chef email failed (non-fatal):', emailErr)
    }

    // 13. Fire automations (non-blocking)
    try {
      const { evaluateAutomations } = await import('@/lib/automations/engine')
      await evaluateAutomations(submission.tenant_id, 'wix_submission_received', {
        entityId: inquiry.id,
        entityType: 'inquiry',
        fields: {
          client_name: leadName,
          client_email: leadEmail || null,
          channel: 'wix',
          occasion: parseResult.parsed.confirmed_occasion || null,
          guest_count: parseResult.parsed.confirmed_guest_count ?? null,
        },
      })
    } catch (autoErr) {
      console.error('[processWixSubmission] Automation evaluation failed (non-fatal):', autoErr)
    }

    return {
      submissionId,
      status: 'completed',
      inquiryId: inquiry.id,
      clientId: clientId || undefined,
    }
  } catch (err) {
    const error = err as Error
    console.error('[processWixSubmission] Processing failed:', error.message)

    // Mark as failed
    await supabase
      .from('wix_submissions')
      .update({
        status: 'failed',
        error: error.message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    return { submissionId, status: 'failed', error: error.message }
  }
}

// ─── Extract Contact Info from Wix Payload ───────────────────────────────
// Wix form payloads vary by form design. We look for common field name patterns.

function extractContactInfo(payload: Record<string, unknown>): {
  name: string | null
  email: string | null
  phone: string | null
} {
  let name: string | null = null
  let email: string | null = null
  let phone: string | null = null

  // Common field name patterns from Wix forms
  const namePatterns = ['name', 'full_name', 'fullname', 'first_name', 'client_name', 'your_name']
  const emailPatterns = ['email', 'email_address', 'e-mail', 'your_email']
  const phonePatterns = ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'your_phone']

  // Flatten payload: handle both flat and nested structures
  const fields = flattenPayload(payload)

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_')

    if (!name && namePatterns.some(p => lowerKey.includes(p))) {
      name = value.trim()
    }
    if (!email && (emailPatterns.some(p => lowerKey.includes(p)) || value.includes('@'))) {
      // Validate it looks like an email
      if (value.includes('@') && value.includes('.')) {
        email = value.trim().toLowerCase()
      }
    }
    if (!phone && phonePatterns.some(p => lowerKey.includes(p))) {
      phone = value.trim()
    }
  }

  return { name, email, phone }
}

// ─── Build Source Text for AI Parsing ────────────────────────────────────
// Converts the Wix payload into human-readable text so parseInquiryFromText can extract structured data.

function buildSourceText(
  payload: Record<string, unknown>,
  extracted: { name: string | null; email: string | null; phone: string | null }
): string {
  const lines: string[] = []

  if (extracted.name) lines.push(`Name: ${extracted.name}`)
  if (extracted.email) lines.push(`Email: ${extracted.email}`)
  if (extracted.phone) lines.push(`Phone: ${extracted.phone}`)

  // Add all other fields from the payload
  const fields = flattenPayload(payload)
  const skipKeys = new Set(['submissionid', 'formid', 'name', 'email', 'phone'])

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (skipKeys.has(lowerKey)) continue

    // Use the original key as a label
    const label = key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    lines.push(`${label}: ${value.trim()}`)
  }

  return lines.length > 0 ? lines.join('\n') : 'Wix form submission (no parseable fields)'
}

// ─── Flatten Nested Payload ──────────────────────────────────────────────

function flattenPayload(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key

    if (typeof value === 'string') {
      result[fullKey] = value
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[fullKey] = String(value)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenPayload(value as Record<string, unknown>, fullKey))
    } else if (Array.isArray(value)) {
      result[fullKey] = value.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ')
    }
  }

  return result
}
