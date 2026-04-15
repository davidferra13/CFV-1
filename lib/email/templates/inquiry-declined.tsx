// Inquiry Declined Email (Q21)
// Sent to client when a chef declines their inquiry.
// Provides honest feedback without ghosting the client, plus a path forward.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type InquiryDeclinedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string | null
  browseUrl: string
}

export function InquiryDeclinedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  browseUrl,
}: InquiryDeclinedProps) {
  return (
    <BaseLayout preview={`Update on your inquiry with ${chefName}`}>
      <Text style={heading}>Inquiry update</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Unfortunately, {chefName} is not available for your {occasion ? `${occasion} ` : ''}
        {eventDate ? `on ${eventDate}` : 'requested date'}. This could be due to scheduling,
        capacity, or location constraints.
      </Text>

      <Text style={paragraph}>
        Your event details are saved. You can browse other chefs in your area who may be a great
        fit:
      </Text>

      <table style={ctaTable}>
        <tbody>
          <tr>
            <td align="center">
              <a href={browseUrl} style={ctaButton}>
                Browse Available Chefs
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={footer}>
        If you have questions or would like help finding the right chef, reply to this email.
      </Text>
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

const ctaTable = {
  width: '100%',
  marginBottom: '24px',
}

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#e88f47',
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
}

const footer = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0',
}
