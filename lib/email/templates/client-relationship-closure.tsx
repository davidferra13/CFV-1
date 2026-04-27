// Client Relationship Closure Email
// Sent to a client when the chef closes or transitions the relationship.
// Only sent for 'transitioning' and 'closed' modes (do_not_book / legal_hold are silent).

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type ClientRelationshipClosureProps = {
  clientName: string
  chefName: string
  closureMode: 'transitioning' | 'closed'
  personalMessage: string | null
}

export function ClientRelationshipClosureEmail({
  clientName,
  chefName,
  closureMode,
  personalMessage,
}: ClientRelationshipClosureProps) {
  const isTransitioning = closureMode === 'transitioning'
  const preview = isTransitioning ? `A note from ${chefName}` : `Thank you, ${clientName}`

  return (
    <BaseLayout preview={preview}>
      <Text style={heading}>{isTransitioning ? 'A quick note' : 'Thank you for everything'}</Text>
      <Text style={paragraph}>Hi {clientName},</Text>

      {isTransitioning ? (
        <>
          <Text style={paragraph}>
            I wanted to reach out personally to let you know that I am making some changes to my
            schedule and availability. This may affect how we work together going forward, but I
            wanted to make sure you heard it from me directly.
          </Text>
          {personalMessage && <Text style={noteStyle}>{personalMessage}</Text>}
          <Text style={paragraph}>
            If you have any upcoming events or plans we have been discussing, nothing changes there.
            I will make sure everything is taken care of. Feel free to reply to this email if you
            have any questions.
          </Text>
        </>
      ) : (
        <>
          <Text style={paragraph}>
            I wanted to take a moment to thank you for the time we have worked together. It has been
            a real pleasure cooking for you and your guests.
          </Text>
          {personalMessage && <Text style={noteStyle}>{personalMessage}</Text>}
          <Text style={paragraph}>
            If you ever need anything in the future, do not hesitate to reach out. Wishing you all
            the best.
          </Text>
        </>
      )}

      <Text style={signoff}>-{chefName}</Text>
      <Text style={muted}>Sent via ChefFlow</Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const noteStyle = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  borderLeft: '3px solid #d1d5db',
}

const signoff = {
  fontSize: '15px',
  fontWeight: '500' as const,
  color: '#374151',
  margin: '0 0 8px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
