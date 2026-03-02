// Beta Survey Invite Email
// Sent when an admin creates an invite with an email address.
// Contains a direct link to the public survey page.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type BetaSurveyInviteProps = {
  name: string
  surveyTitle: string
  surveyUrl: string
}

export function BetaSurveyInviteEmail({ name, surveyTitle, surveyUrl }: BetaSurveyInviteProps) {
  return (
    <BaseLayout preview={`${surveyTitle} — We'd love your feedback on ChefFlow.`}>
      <Text style={heading}>Your feedback matters.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        You&apos;ve been invited to share your thoughts on ChefFlow. Your honest feedback will
        directly shape what we build next.
      </Text>
      <Text style={paragraph}>
        The survey takes about <strong>3-5 minutes</strong> and covers your experience, what&apos;s
        working, and what we should improve.
      </Text>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '24px 0' }}>
        <tbody>
          <tr>
            <td align="center">
              <Link href={surveyUrl} style={button}>
                Take the Survey
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={note}>
        Or copy this link:{' '}
        <Link href={surveyUrl} style={link}>
          {surveyUrl}
        </Link>
      </Text>
      <Text style={note}>
        Your responses are confidential and will only be used to improve ChefFlow.
      </Text>
      <Text style={signoff}>&mdash; The ChefFlow Team</Text>
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

const button = {
  display: 'inline-block',
  backgroundColor: '#e88f47',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '8px',
}

const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0 0 12px',
}

const link = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '600' as const,
}

const signoff = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: '500' as const,
  margin: '24px 0 0',
}
