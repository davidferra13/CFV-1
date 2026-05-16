import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'
import { type TonePreset, applyGreeting, applySignOff, DEFAULT_TONE } from '../brand-voice'

type PersonalThankYouProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  tone?: TonePreset
}

export function PersonalThankYouEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  tone = DEFAULT_TONE,
}: PersonalThankYouProps) {
  const greeting = applyGreeting(tone, clientName)
  const signoffText = applySignOff(tone, chefName)

  return (
    <BaseLayout preview={`Thank you from ${chefName}`}>
      <Text style={paragraph}>{greeting},</Text>

      <Text style={paragraph}>
        Thank you for trusting {chefName} with your {occasion} on {eventDate}. It was a genuine
        pleasure to cook for you and your guests.
      </Text>

      <Text style={paragraph}>
        We hope every bite brought a smile. That is all we wanted to say.
      </Text>

      <Text style={signoffStyle}>
        {signoffText.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </Text>
    </BaseLayout>
  )
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const signoffStyle = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
  lineHeight: '1.5',
}
