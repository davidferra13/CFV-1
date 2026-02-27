// Base Email Layout — Shared wrapper for all ChefFlow emails
// Clean, professional design with chef branding

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

type BaseLayoutProps = {
  preview: string
  children: React.ReactNode
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>ChefFlow</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Powered by{' '}
              <Link href={SITE_URL} style={footerLink}>
                ChefFlow
              </Link>{' '}
              — the business OS for private chefs.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
}

const header = {
  backgroundColor: '#18181b',
  padding: '24px 32px',
}

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700' as const,
  margin: '0',
  letterSpacing: '-0.5px',
}

const content = {
  padding: '32px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footer = {
  padding: '24px 32px',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}

const footerLink = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '600' as const,
}
