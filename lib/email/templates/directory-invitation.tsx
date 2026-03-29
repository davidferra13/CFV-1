// Directory Invitation Email
// Sent to discovered food operators inviting them to "be featured."
// IMPORTANT: No ChefFlow branding. No mention of existing listing.
// Uses neutral sender identity from DIRECTORY_OUTREACH_FROM_EMAIL env var.

import {
  Button,
  Text,
  Link,
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components'
import * as React from 'react'

type DirectoryInvitationProps = {
  businessName: string
  businessType: string
  city: string
  joinUrl: string
  optOutUrl: string
  physicalAddress: string
}

export function DirectoryInvitationEmail({
  businessName,
  businessType,
  city,
  joinUrl,
  optOutUrl,
  physicalAddress,
}: DirectoryInvitationProps) {
  const typeLabel =
    businessType === 'restaurant'
      ? 'restaurant'
      : businessType === 'bakery'
        ? 'bakery'
        : businessType === 'food_truck'
          ? 'food truck'
          : businessType === 'caterer'
            ? 'catering business'
            : businessType === 'cafe'
              ? 'cafe'
              : 'business'

  return (
    <Html>
      <Head />
      <Preview>Want to be featured in {city}&apos;s food directory?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Be featured in {city}</Text>
          <Text style={paragraph}>Hi {businessName},</Text>
          <Text style={paragraph}>
            We&apos;re putting together a directory of the best food in {city}. Your {typeLabel}{' '}
            came up in our research, and we&apos;d love to feature you.
          </Text>
          <Text style={paragraph}>
            It&apos;s free. Takes about 2 minutes. You add your menu, photos, and hours. People in{' '}
            {city} find you directly - no middleman, no commission.
          </Text>
          <Section style={ctaSection}>
            <Button href={joinUrl} style={ctaButton}>
              Get Featured
            </Button>
          </Section>
          <Text style={note}>
            If this isn&apos;t for you, no worries. Just ignore this email and you won&apos;t hear
            from us again.
          </Text>
          <Text style={signoff}>
            Best,
            <br />
            The Food Directory Team
          </Text>
          <Text style={footer}>{physicalAddress}</Text>
          <Text style={footer}>
            <Link href={optOutUrl} style={optOutLink}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
}

const heading = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 20px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const ctaButton = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block' as const,
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
}

const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0 0 16px',
}

const signoff = {
  fontSize: '14px',
  color: '#374151',
  margin: '24px 0 0',
}

const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '16px 0 0',
  textAlign: 'center' as const,
}

const optOutLink = {
  color: '#9ca3af',
  textDecoration: 'underline',
}
