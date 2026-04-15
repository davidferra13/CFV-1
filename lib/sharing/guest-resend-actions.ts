'use server'

// Guest Portal Link Resend (Q45)
// Allows a guest to recover their portal link by email.
// No auth required (public action). Rate-limited. Token sent via email only.

import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'
import { checkRateLimit } from '@/lib/rateLimit'
import { z } from 'zod'
import { createElement } from 'react'
import { Text } from '@react-email/components'

const ResendSchema = z.object({
  email: z.string().email(),
  shareToken: z.string().min(1),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Look up a guest by email + share token and email them their portal link.
 * Returns a generic success message regardless of whether the email was found,
 * to prevent email enumeration.
 */
export async function resendGuestPortalLink(input: { email: string; shareToken: string }) {
  const validated = ResendSchema.parse(input)

  // Rate limit: 3 resend attempts per email per 5 minutes
  try {
    await checkRateLimit(`guest-resend:${validated.email}`, 3, 300_000)
  } catch {
    // Rate limited - return generic success to prevent enumeration
    return { success: true, message: 'If that email has an RSVP, a link has been sent.' }
  }

  const db: any = createAdminClient()

  // Resolve share token to event_share
  const { data: share } = await db
    .from('event_shares')
    .select('id, event_id')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    // Don't reveal share doesn't exist
    return { success: true, message: 'If that email has an RSVP, a link has been sent.' }
  }

  // Look up guest by email + share
  const { data: guest } = await db
    .from('event_guests')
    .select('guest_token, full_name, event_id')
    .eq('event_share_id', share.id)
    .ilike('email', validated.email.toLowerCase())
    .single()

  if (!guest) {
    return { success: true, message: 'If that email has an RSVP, a link has been sent.' }
  }

  // Build portal URL
  const portalUrl = `${APP_URL}/event/${guest.event_id}/guest/${guest.guest_token}`

  // Send email with portal link
  try {
    await sendEmail({
      to: validated.email,
      subject: 'Your event portal link',
      react: createElement(GuestPortalLinkEmail, {
        guestName: guest.full_name || 'there',
        portalUrl,
      }),
    })
  } catch (err) {
    console.error('[resendGuestPortalLink] Email failed:', err)
    // Still return success to prevent enumeration
  }

  return { success: true, message: 'If that email has an RSVP, a link has been sent.' }
}

// Inline email component (simple, no separate template file needed)
function GuestPortalLinkEmail({ guestName, portalUrl }: { guestName: string; portalUrl: string }) {
  return createElement(
    'div',
    { style: { fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 24 } },
    createElement(
      Text,
      { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
      `Hi ${guestName},`
    ),
    createElement(
      Text,
      { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
      'Here is your link to access the event portal. You can view details, update your RSVP, and manage dietary preferences.'
    ),
    createElement(
      'table',
      { style: { width: '100%', marginBottom: 24 } },
      createElement(
        'tbody',
        null,
        createElement(
          'tr',
          null,
          createElement(
            'td',
            { align: 'center' },
            createElement(
              'a',
              {
                href: portalUrl,
                style: {
                  display: 'inline-block',
                  backgroundColor: '#e88f47',
                  color: '#18181b',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: 8,
                  textDecoration: 'none',
                },
              },
              'Open My Portal'
            )
          )
        )
      )
    ),
    createElement(
      Text,
      { style: { fontSize: 13, color: '#6b7280' } },
      'This link is unique to you. Do not share it with others.'
    )
  )
}
