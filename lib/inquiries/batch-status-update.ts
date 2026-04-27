'use server'

// Batch Status Update - Generate and send status updates to all waiting inquiries
// The anti-procrastination nuclear weapon: one click, everyone gets updated.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getResponseQueue } from './actions'
import { draftResponseForInquiry } from '@/lib/ai/correspondence'
import { createDraftMessage, approveAndSendMessage } from '@/lib/gmail/actions'
import { revalidatePath } from 'next/cache'

export type BatchDraftItem = {
  inquiryId: string
  clientName: string
  clientEmail: string | null
  clientId: string | null
  occasion: string | null
  waitingHours: number
  messageId: string | null
  subject: string
  body: string
  status: 'draft' | 'error' | 'no_email'
  error?: string
}

export type BatchDraftResult = {
  drafts: BatchDraftItem[]
  totalWaiting: number
  draftableCount: number
  errorCount: number
}

/**
 * Generate AI drafts for all inquiries in the response queue.
 * Returns drafts for chef review before sending.
 */
export async function generateBatchStatusDrafts(): Promise<BatchDraftResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all waiting inquiries
  const queue = await getResponseQueue(50)

  if (queue.length === 0) {
    return { drafts: [], totalWaiting: 0, draftableCount: 0, errorCount: 0 }
  }

  // Fetch full inquiry data with client info for each queue item
  const inquiryIds = queue.map((q) => q.id)
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, client_id, contact_name, contact_email, confirmed_occasion, unknown_fields, client:clients(id, full_name, email)')
    .eq('tenant_id', user.tenantId!)
    .in('id', inquiryIds)

  const inquiryMap = new Map<string, typeof inquiries[0]>()
  for (const inq of inquiries || []) {
    inquiryMap.set(inq.id, inq)
  }

  const drafts: BatchDraftItem[] = []
  let errorCount = 0

  // Generate drafts sequentially (Ollama calls, avoid overwhelming)
  for (const item of queue) {
    const inquiry = inquiryMap.get(item.id)
    const clientEmail = inquiry?.client?.email || inquiry?.contact_email || null
    const clientId = inquiry?.client?.id || inquiry?.client_id || null

    // Skip if no email - can't send
    if (!clientEmail || !clientId) {
      drafts.push({
        inquiryId: item.id,
        clientName: item.clientName,
        clientEmail,
        clientId,
        occasion: item.occasion,
        waitingHours: item.waitingHours,
        messageId: null,
        subject: '',
        body: '',
        status: 'no_email',
        error: !clientEmail ? 'No email address' : 'No linked client',
      })
      continue
    }

    try {
      // Generate AI draft
      const result = await draftResponseForInquiry(item.id)

      // Parse subject from draft
      let subject = `Following up on your inquiry`
      let body = result.draft
      const subjectMatch = result.draft.match(/^Subject:\s*(.+?)(?:\n\n|\r\n\r\n)/)
      if (subjectMatch) {
        subject = subjectMatch[1].trim()
        body = result.draft.slice(subjectMatch[0].length).trim()
      }

      // Save as draft message
      const { messageId } = await createDraftMessage({
        inquiryId: item.id,
        clientId,
        subject,
        body,
      })

      drafts.push({
        inquiryId: item.id,
        clientName: item.clientName,
        clientEmail,
        clientId,
        occasion: item.occasion,
        waitingHours: item.waitingHours,
        messageId,
        subject,
        body,
        status: 'draft',
      })
    } catch (err) {
      errorCount++
      drafts.push({
        inquiryId: item.id,
        clientName: item.clientName,
        clientEmail,
        clientId,
        occasion: item.occasion,
        waitingHours: item.waitingHours,
        messageId: null,
        subject: '',
        body: '',
        status: 'error',
        error: err instanceof Error ? err.message : 'Draft generation failed',
      })
    }
  }

  return {
    drafts,
    totalWaiting: queue.length,
    draftableCount: drafts.filter((d) => d.status === 'draft').length,
    errorCount,
  }
}

/**
 * Send all approved batch drafts via Gmail.
 * Accepts an array of message IDs to send.
 */
export async function sendBatchDrafts(
  messageIds: string[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  await requireChef()

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const messageId of messageIds) {
    try {
      await approveAndSendMessage(messageId)
      sent++
    } catch (err) {
      failed++
      errors.push(
        `Message ${messageId}: ${err instanceof Error ? err.message : 'Send failed'}`
      )
    }
  }

  revalidatePath('/inquiries')
  revalidatePath('/inbox')

  return { sent, failed, errors }
}

/**
 * Get count of inquiries needing chef response, for tab badges.
 */
export async function getInquiryStatusCounts(): Promise<Record<string, number>> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('inquiries')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (!data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.status] = (counts[row.status] || 0) + 1
  }

  // Add computed groups
  counts['respond_next'] = (counts['new'] || 0) + (counts['awaiting_chef'] || 0)
  counts['closed'] = (counts['declined'] || 0) + (counts['expired'] || 0)
  counts['all'] = data.length

  return counts
}
