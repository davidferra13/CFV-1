// Directory Welcome Email
// Sent when a business submits their listing via /nearby/submit.
// Confirms receipt, explains next steps, includes profile link.

import { Button, Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type DirectoryWelcomeProps = {
  businessName: string
  businessType: string
  slug: string
  optOutUrl: string
}

export function DirectoryWelcomeEmail({
  businessName,
  businessType,
  slug,
  optOutUrl,
}: DirectoryWelcomeProps) {
  const profileUrl = `${SITE_URL}/nearby/${slug}`

  return (
    <BaseLayout preview={`${businessName} has been submitted to the ChefFlow directory.`}>
      <Text style={heading}>Your listing is in review.</Text>
      <Text style={paragraph}>Hi there,</Text>
      <Text style={paragraph}>
        We received your submission for <strong>{businessName}</strong> on the ChefFlow food
        directory. Our team will review it shortly.
      </Text>
      <Text style={paragraph}>Once approved, your listing will:</Text>
      <table style={stepsTable}>
        <tbody>
          <tr>
            <td style={stepNumber}>1</td>
            <td style={stepText}>Appear in the ChefFlow directory so people nearby can find you</td>
          </tr>
          <tr>
            <td style={stepNumber}>2</td>
            <td style={stepText}>
              Link directly to your website (we send visitors to you, not to us)
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>3</td>
            <td style={stepText}>
              Show your cuisine, location, and any details you choose to share
            </td>
          </tr>
        </tbody>
      </table>
      <Button href={profileUrl} style={ctaButton}>
        Preview your listing
      </Button>
      <Text style={note}>
        Your listing is free. There are no commissions, no hidden fees, and no obligations. You can
        update or remove your listing at any time from your listing page.
      </Text>
      <Text style={note}>
        We will email you when your listing is approved. If you have questions, reply to this email
        or visit{' '}
        <Link href={`${SITE_URL}/contact`} style={link}>
          our contact page
        </Link>
        .
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
