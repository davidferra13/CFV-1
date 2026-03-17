// Directory Verified Email
// Sent when an admin verifies/approves a listing.
// Confirms the listing is live with the Verified badge.

import { Button, Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type DirectoryVerifiedProps = {
  businessName: string
  slug: string
  optOutUrl: string
}

export function DirectoryVerifiedEmail({ businessName, slug, optOutUrl }: DirectoryVerifiedProps) {
  const profileUrl = `${SITE_URL}/discover/${slug}`

  return (
    <BaseLayout preview={`${businessName} is now verified on ChefFlow.`}>
      <Text style={heading}>Your listing is verified.</Text>
      <Text style={paragraph}>
        Great news: <strong>{businessName}</strong> is now a verified listing on the ChefFlow food
        directory. Your listing displays the green Verified badge, which signals trust to visitors.
      </Text>
      <Button href={profileUrl} style={ctaButton}>
        View your live listing
      </Button>
      <Text style={note}>
        Your listing links directly to your website. We send traffic your way with no commission and
        no middleman. You can update or remove your listing at any time from your listing page.
      </Text>
      <Text style={note}>
        Thank you for being part of the ChefFlow directory. If you have questions or feedback, reply
        to this email or visit{' '}
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
