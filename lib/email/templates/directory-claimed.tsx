// Directory Claimed Email
// Sent when a business owner claims an existing discovered listing.
// Confirms claim, invites them to enrich their profile.

import { Button, Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type DirectoryClaimedProps = {
  businessName: string
  claimerName: string
  slug: string
  enhanceUrl: string
  optOutUrl: string
}

export function DirectoryClaimedEmail({
  businessName,
  claimerName,
  slug,
  enhanceUrl,
  optOutUrl,
}: DirectoryClaimedProps) {
  return (
    <BaseLayout preview={`You've claimed ${businessName} on ChefFlow.`}>
      <Text style={heading}>You claimed your listing.</Text>
      <Text style={paragraph}>Hi {claimerName},</Text>
      <Text style={paragraph}>
        You have successfully claimed <strong>{businessName}</strong> on the ChefFlow food
        directory. Your listing now shows the &quot;Claimed&quot; badge, and you control what
        information is displayed.
      </Text>
      <Text style={paragraph}>
        To make your listing stand out, add the details that matter most to potential customers:
      </Text>
      <table style={stepsTable}>
        <tbody>
          <tr>
            <td style={stepNumber}>+</td>
            <td style={stepText}>
              <strong>Photos</strong> of your food, space, or team
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>+</td>
            <td style={stepText}>
              <strong>Menu link</strong> so visitors can see what you offer
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>+</td>
            <td style={stepText}>
              <strong>Hours and contact info</strong> for easy reach
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>+</td>
            <td style={stepText}>
              <strong>Description</strong> telling your story in your own words
            </td>
          </tr>
        </tbody>
      </table>
      <Button href={enhanceUrl} style={ctaButton}>
        Complete your profile
      </Button>
      <Text style={note}>
        Claimed listings with complete profiles get a &quot;Verified&quot; badge and appear higher
        in search results. You can update or remove your listing at any time.
      </Text>
      <Text style={signoff}>The ChefFlow Team</Text>
      <Text style={optOutText}>
        <Link href={optOutUrl} style={optOutLink}>
          Unsubscribe from directory emails
        </Link>
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

const stepsTable = {
  width: '100%',
  marginBottom: '24px',
}

const stepNumber = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#e88f47',
  padding: '10px 12px 10px 0',
  verticalAlign: 'top' as const,
  width: '24px',
}

const stepText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#374151',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
}

const ctaButton = {
  backgroundColor: '#e88f47',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block' as const,
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0 0 12px',
}

const signoff = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: '500' as const,
  margin: '24px 0 0',
}

const optOutText = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}

const optOutLink = {
  color: '#9ca3af',
  textDecoration: 'underline',
}
