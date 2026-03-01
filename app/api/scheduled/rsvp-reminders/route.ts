import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getReminderOffsetKeys } from '@/lib/sharing/policy'
import { EventShareSettingsRowSchema } from '@/lib/sharing/row-schemas'
import { sendEmail } from '@/lib/email/send'
import { RSVPReminderEmail } from '@/lib/email/templates/rsvp-reminder'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

type PendingGuestRow = {
  id: string
  full_name: string | null
  email: string | null
}

const WINDOW_MS = 2 * 60 * 60 * 1000

function getTargetOffsetMs(cadence: string): number {
  if (cadence === '7d') return 7 * 24 * 60 * 60 * 1000
  if (cadence === '3d') return 3 * 24 * 60 * 60 * 1000
  if (cadence === '24h') return 24 * 60 * 60 * 1000
  return 0
}

async function handleRSVPReminders(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const now = new Date()

  const { data: shareRows, error: shareError } = await (supabase as any)
    .from('event_shares')
    .select(
      'id, event_id, tenant_id, token, is_active, expires_at, reminders_enabled, reminder_schedule, rsvp_deadline_at'
    )
    .eq('is_active', true)
    .eq('reminders_enabled', true)
    .not('rsvp_deadline_at', 'is', null)

  if (shareError) {
    console.error('[rsvp-reminders] Failed to fetch shares:', shareError)
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }

  let queued = 0
  let sent = 0
  let duplicates = 0
  let failed = 0

  for (const rawShare of shareRows || []) {
    const parsed = EventShareSettingsRowSchema.safeParse(rawShare)
    if (!parsed.success) continue
    const share = parsed.data
    if (!share.token) continue
    if (!share.rsvp_deadline_at) continue

    const deadline = new Date(share.rsvp_deadline_at)
    const msUntilDeadline = deadline.getTime() - now.getTime()
    const dueCadences = getReminderOffsetKeys(share.reminder_schedule || []).filter((cadence) => {
      const delta = Math.abs(msUntilDeadline - getTargetOffsetMs(cadence))
      return delta <= WINDOW_MS
    })
    if (dueCadences.length === 0) continue

    const { data: event } = await supabase
      .from('events')
      .select('id, occasion, event_date')
      .eq('id', share.event_id)
      .single()
    if (!event) continue

    const { data: guests } = await (supabase as any)
      .from('event_guests')
      .select('id, full_name, email')
      .eq('event_share_id', share.id)
      .eq('rsvp_status', 'pending')
      .not('email', 'is', null)

    const pendingGuests = (guests || []) as PendingGuestRow[]
    for (const guest of pendingGuests) {
      if (!guest.email) continue

      for (const cadence of dueCadences) {
        const reminderKey = `${cadence}:${share.event_id}`
        const { data: logRow, error: logError } = await ((supabase as any)
          .from('rsvp_reminder_log')
          .insert({
            tenant_id: share.tenant_id,
            event_id: share.event_id,
            guest_id: guest.id,
            reminder_key: reminderKey,
            delivery_channel: 'email',
            recipient_email: guest.email,
            status: 'queued',
          })
          .select('id')
          .single() as any)

        if (logError || !logRow) {
          duplicates += 1
          continue
        }

        queued += 1
        const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${share.token}`
        const subject = `Reminder: RSVP for ${event.occasion || 'your event'}`
        const ok = await sendEmail({
          to: guest.email,
          subject,
          react: RSVPReminderEmail({
            guestName: guest.full_name,
            occasion: event.occasion,
            eventDate: event.event_date,
            rsvpUrl,
          }),
        })

        if (ok) {
          sent += 1
          await ((supabase as any)
            .from('rsvp_reminder_log')
            .update({ status: 'sent' })
            .eq('id', logRow.id) as any)
        } else {
          failed += 1
          await ((supabase as any)
            .from('rsvp_reminder_log')
            .update({ status: 'failed' })
            .eq('id', logRow.id) as any)
        }
      }
    }
  }

  return NextResponse.json({
    sharesProcessed: (shareRows || []).length,
    queued,
    sent,
    failed,
    duplicates,
  })
}

export { handleRSVPReminders as GET, handleRSVPReminders as POST }
