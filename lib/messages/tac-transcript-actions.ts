// TakeAChef Transcript Paste — Server actions for bulk-inserting pasted conversation messages.
// Used by the TacTranscriptPaste component.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TranscriptMessageSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  body: z.string().min(1),
  sentAt: z.string().nullable(),
})

const SaveTranscriptSchema = z.object({
  inquiryId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  messages: z.array(TranscriptMessageSchema).min(1).max(200),
})

export type SaveTranscriptInput = z.infer<typeof SaveTranscriptSchema>

/**
 * Bulk-insert a pasted TakeAChef conversation as individual messages.
 * Each message is saved with channel='take_a_chef' and status='logged'.
 */
export async function saveTacTranscript(input: SaveTranscriptInput) {
  const user = await requireChef()
  const validated = SaveTranscriptSchema.parse(input)
  const supabase: any = createServerClient()

  const now = new Date()
  const rows = validated.messages.map((msg, i) => ({
    tenant_id: user.tenantId!,
    inquiry_id: validated.inquiryId,
    client_id: validated.clientId,
    channel: 'take_a_chef' as const,
    status: 'logged' as const,
    direction: msg.direction,
    body: msg.body,
    // Use provided timestamp, or stagger by 1 second per message for ordering
    sent_at: msg.sentAt || new Date(now.getTime() + i * 1000).toISOString(),
    from_user_id: msg.direction === 'outbound' ? user.id : null,
    to_user_id: msg.direction === 'inbound' ? user.id : null,
  }))

  const { error } = await supabase.from('messages').insert(rows)

  if (error) {
    console.error('[saveTacTranscript] Error:', error)
    throw new Error('Failed to save transcript')
  }

  revalidatePath(`/inquiries/${validated.inquiryId}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'message_sent',
      domain: 'communication',
      entityType: 'inquiry',
      entityId: validated.inquiryId,
      summary: `Pasted TakeAChef transcript (${validated.messages.length} messages)`,
      context: { source: 'tac_transcript_paste', messageCount: validated.messages.length },
      clientId: validated.clientId || undefined,
    })
  } catch (err) {
    console.error('[saveTacTranscript] Activity log failed (non-blocking):', err)
  }

  return { success: true, count: rows.length }
}
