import * as React from 'react'
import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components'

type RSVPReminderEmailProps = {
  guestName?: string | null
  occasion?: string | null
  eventDate?: string | null
  rsvpUrl: string
  brand?: ChefBrandProps
}

export function RSVPReminderEmail({
  guestName,
  occasion,
  eventDate,
  rsvpUrl,
  brand,
}: RSVPReminderEmailProps) {
  const title = occasion || 'your upcoming dinner'
  const dateLine = eventDate ? `Event date: ${eventDate}` : null

  return (
    <Html>
      <Head />
      <Preview>Reminder to RSVP for {title}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', margin: 0, padding: '24px 0' }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
          }}
        >
          <Section>
            <Text style={{ color: '#0f172a', fontSize: '16px', lineHeight: '24px', margin: 0 }}>
              {guestName ? `Hi ${guestName},` : 'Hello,'}
            </Text>
            <Text
              style={{
                color: '#0f172a',
                fontSize: '15px',
                lineHeight: '24px',
                margin: '12px 0 0',
              }}
            >
              Quick reminder to RSVP for {title}.
            </Text>
            {dateLine && (
              <Text
                style={{
                  color: '#334155',
                  fontSize: '14px',
                  lineHeight: '22px',
                  margin: '10px 0 0',
                }}
              >
                {dateLine}
              </Text>
            )}
            <Text style={{ margin: '18px 0 0', fontSize: '14px', lineHeight: '22px' }}>
              <Link href={rsvpUrl}>Open RSVP page</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
