// Base Email Layout - Shared wrapper for all ChefFlow emails
// The chef is the brand. Header shows chef identity (logo + business name).
// "Powered by ChefFlow" appears in the footer only, and only for free-tier users.
// Pro users get fully white-labeled emails.

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export type ChefBrandProps = {
  /** Chef's business name (always present). Shown in the email header. */
  businessName?: string
  /** Public URL of the chef's logo. If present, rendered in header. */
  logoUrl?: string | null
  /** Accent color hex for the header bar. Defaults to neutral dark. */
  primaryColor?: string
  /** Whether to show "Powered by ChefFlow" in footer. True for free tier. */
  showPoweredBy?: boolean
}

type BaseLayoutProps = {
  preview: string
  children: React.ReactNode
  /** Chef brand data. If omitted, falls back to ChefFlow default branding. */
  brand?: ChefBrandProps
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export function BaseLayout({ preview, children, brand }: BaseLayoutProps) {
  const businessName = brand?.businessName || 'ChefFlow'
  const logoUrl = brand?.logoUrl || null
  const headerBg = brand?.primaryColor || '#18181b'
  const showPoweredBy = brand?.showPoweredBy !== false // default true

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...headerStyle, backgroundColor: headerBg }}>
            {logoUrl ? (
              <table cellPadding="0" cellSpacing="0" style={{ border: 'none' }}>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
                    <Img
                      src={logoUrl}
                      alt={businessName}
                      width="36"
                      height="36"
                      style={{ borderRadius: '4px', display: 'block' }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={logoText}>{businessName}</Text>
                  </td>
                </tr>
              </table>
            ) : (
              <Text style={logoText}>{businessName}</Text>
            )}
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            {showPoweredBy ? (
              <Text style={footerText}>
                Powered by{' '}
                <Link href={SITE_URL} style={footerLink}>
                  ChefFlow
                </Link>
              </Text>
            ) : (
              <Text style={footerText}>
                <Link href={SITE_URL} style={{ ...footerLink, color: '#d1d5db' }}>
                  ChefFlow
                </Link>
              </Text>
            )}
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

const headerStyle = {
  padding: '24px 32px',
}

const logoText = {
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
