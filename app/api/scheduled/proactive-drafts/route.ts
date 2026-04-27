// Proactive Draft Generation - Scheduled Cron Endpoint
// GET /api/scheduled/proactive-drafts
// POST /api/scheduled/proactive-drafts
//
// Auto-generates AI reply drafts for inquiries awaiting chef response.
// When a chef opens any stale inquiry, the draft is already waiting.
// Runs every 6 hours. Skips inquiries that already have a draft.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { draftResponseForInquiry } from '@/lib/ai/correspondence'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

async function handleProactiveDrafts(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('proactive-drafts', async () => {
      const db = createServerClient({ admin: true })

      // 1. Find all inquiries needing chef response across all tenants
      const { data: inquiries, error } = await db
        .from('inquiries')
        .select(
          'id, tenant_id, client_id, contact_email, client:clients(id, email, full_name)'
        )
        .in('status', ['new', 'awaiting_chef'])
        .limit(100)

      if (error) {
        console.error('[Proactive Drafts] Query failed:', error)
        throw new Error('Failed to query stale inquiries')
      }

      if (!inquiries || inquiries.length === 0) {
        return { message: 'No inquiries awaiting response', generated: 0, skipped: 0, errors: 0 }
      }

      // 2. Check which already have outbound drafts
      const inquiryIds = inquiries.map((i: any) => i.id)
      const { data: existingDrafts } = await db
        .from('messages')
        .select('inquiry_id')
        .eq('status', 'draft')
        .eq('direction', 'outbound')
        .in('inquiry_id', inquiryIds)

      const hasDraft = new Set((existingDrafts || []).map((d: any) => d.inquiry_id))

      let generated = 0
      let skipped = 0
      let errors = 0

      // 3. Generate drafts for each (skip those with existing drafts or no email)
      for (const inquiry of inquiries) {
        const clientId = (inquiry as any).client?.id || inquiry.client_id
        const clientEmail = (inquiry as any).client?.email || inquiry.contact_email

        if (hasDraft.has(inquiry.id)) {
          skipped++
          continue
        }

        if (!clientId || !clientEmail) {
          skipped++
          continue
        }

        try {
          const aiResult = await draftResponseForInquiry(inquiry.id)

          let subject = 'Following up on your inquiry'
          let body = aiResult.draft
          const subjectMatch = aiResult.draft.match(/^Subject:\s*(.+?)(?:\n\n|\r\n\r\n)/)
          if (subjectMatch) {
            subject = subjectMatch[1].trim()
            body = aiResult.draft.slice(subjectMatch[0].length).trim()
          }

          // Insert draft directly (admin context, no requireChef needed)
          const { error: insertErr } = await db
            .from('messages')
            .insert({
              tenant_id: inquiry.tenant_id,
              inquiry_id: inquiry.id,
              client_id: clientId,
              channel: 'email',
              direction: 'outbound',
              status: 'draft',
              subject,
              body,
            })

          if (insertErr) {
            console.error(`[Proactive Drafts] Insert failed for ${inquiry.id}:`, insertErr)
            errors++
          } else {
            generated++
          }
        } catch (err) {
          if (err instanceof OllamaOfflineError) {
            console.warn('[Proactive Drafts] AI runtime offline, stopping')
            errors++
            break
          }
          console.error(`[Proactive Drafts] Draft failed for ${inquiry.id}:`, err)
          errors++
        }
      }

      return {
        message: `Proactive drafts: ${generated} generated, ${skipped} skipped, ${errors} errors`,
        generated,
        skipped,
        errors,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[Proactive Drafts] Cron failed:', err)
    return NextResponse.json(
      { error: 'Proactive draft generation failed' },
      { status: 500 }
    )
  }
}

export const GET = handleProactiveDrafts
export const POST = handleProactiveDrafts
