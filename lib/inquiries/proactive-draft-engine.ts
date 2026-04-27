'use server'

// Proactive Draft Engine
// Auto-generates reply drafts for inquiries waiting on chef response.
// When the chef opens any inquiry, the draft is already there. Zero friction.
//
// Designed to run:
// 1. On-demand via the batch status update panel
// 2. On cron (e.g. every 6 hours) to keep drafts fresh
// 3. On inquiry detail page load (if no draft exists)
//
// The inquiry detail page already consumes pendingDraft from the messages table.
// This engine just fills that pipeline proactively.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { draftResponseForInquiry } from '@/lib/ai/correspondence'
import { createDraftMessage } from '@/lib/gmail/actions'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export type ProactiveDraftResult = {
  generated: number
  skipped: number
  errors: number
  details: Array<{
    inquiryId: string
    clientName: string
    status: 'generated' | 'skipped_has_draft' | 'skipped_no_email' | 'skipped_no_client' | 'error'
    error?: string
  }>
}

/**
 * Generate drafts for all inquiries awaiting chef response that don't already have one.
 * Safe to run repeatedly - skips inquiries that already have an outbound draft.
 */
export async function generateProactiveDrafts(): Promise<ProactiveDraftResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Get all inquiries needing chef action
  const { data: inquiries } = await db
    .from('inquiries')
    .select(
      'id, status, client_id, contact_name, contact_email, unknown_fields, client:clients(id, full_name, email)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])

  if (!inquiries || inquiries.length === 0) {
    return { generated: 0, skipped: 0, errors: 0, details: [] }
  }

  // 2. Check which already have outbound drafts
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: existingDrafts } = await db
    .from('messages')
    .select('inquiry_id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'draft')
    .eq('direction', 'outbound')
    .in('inquiry_id', inquiryIds)

  const hasExistingDraft = new Set(
    (existingDrafts || []).map((d: any) => d.inquiry_id)
  )

  const result: ProactiveDraftResult = {
    generated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }

  // 3. Generate drafts for those without one
  for (const inquiry of inquiries) {
    const clientName =
      inquiry.client?.full_name ||
      (inquiry.unknown_fields as Record<string, string> | null)?.client_name ||
      inquiry.contact_name ||
      'Unknown Lead'

    // Skip if already has a draft
    if (hasExistingDraft.has(inquiry.id)) {
      result.skipped++
      result.details.push({
        inquiryId: inquiry.id,
        clientName,
        status: 'skipped_has_draft',
      })
      continue
    }

    // Skip if no client or email
    const clientId = inquiry.client?.id || inquiry.client_id
    const clientEmail = inquiry.client?.email || inquiry.contact_email
    if (!clientId) {
      result.skipped++
      result.details.push({
        inquiryId: inquiry.id,
        clientName,
        status: 'skipped_no_client',
      })
      continue
    }
    if (!clientEmail) {
      result.skipped++
      result.details.push({
        inquiryId: inquiry.id,
        clientName,
        status: 'skipped_no_email',
      })
      continue
    }

    try {
      // Generate AI draft
      const aiResult = await draftResponseForInquiry(inquiry.id)

      // Parse subject from draft
      let subject = 'Following up on your inquiry'
      let body = aiResult.draft
      const subjectMatch = aiResult.draft.match(/^Subject:\s*(.+?)(?:\n\n|\r\n\r\n)/)
      if (subjectMatch) {
        subject = subjectMatch[1].trim()
        body = aiResult.draft.slice(subjectMatch[0].length).trim()
      }

      // Save as draft
      await createDraftMessage({
        inquiryId: inquiry.id,
        clientId,
        subject,
        body,
      })

      result.generated++
      result.details.push({
        inquiryId: inquiry.id,
        clientName,
        status: 'generated',
      })
    } catch (err) {
      // If Ollama is offline, stop generating (all subsequent will fail too)
      if (err instanceof OllamaOfflineError) {
        result.errors++
        result.details.push({
          inquiryId: inquiry.id,
          clientName,
          status: 'error',
          error: 'AI runtime offline',
        })
        break
      }

      result.errors++
      result.details.push({
        inquiryId: inquiry.id,
        clientName,
        status: 'error',
        error: err instanceof Error ? err.message : 'Draft generation failed',
      })
    }
  }

  return result
}

/**
 * Ensure a single inquiry has a draft ready. Called on inquiry detail page load.
 * Returns true if a draft was generated, false if one already exists or couldn't be created.
 */
export async function ensureInquiryDraft(inquiryId: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if draft already exists
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .eq('status', 'draft')
    .eq('direction', 'outbound')
    .limit(1)
    .maybeSingle()

  if (existing) return false

  // Check inquiry has client + email
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id, client_id, client:clients(id, email)')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])
    .single()

  if (!inquiry) return false
  const clientId = inquiry.client?.id || inquiry.client_id
  const clientEmail = inquiry.client?.email
  if (!clientId || !clientEmail) return false

  try {
    const aiResult = await draftResponseForInquiry(inquiryId)

    let subject = 'Following up on your inquiry'
    let body = aiResult.draft
    const subjectMatch = aiResult.draft.match(/^Subject:\s*(.+?)(?:\n\n|\r\n\r\n)/)
    if (subjectMatch) {
      subject = subjectMatch[1].trim()
      body = aiResult.draft.slice(subjectMatch[0].length).trim()
    }

    await createDraftMessage({
      inquiryId,
      clientId,
      subject,
      body,
    })

    return true
  } catch {
    return false
  }
}
