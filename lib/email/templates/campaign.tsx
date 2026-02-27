// Campaign Email Template
// Used for bulk campaign sends and 1:1 direct outreach emails.
// Body is plain text with newlines — converted to paragraphs for display.
// Includes a compliant unsubscribe footer on every marketing email.

import {
  Text,
  Link,
  Html,
  Head,
  Body,
  Container,
  Section,
  Hr,
  Preview,
} from '@react-email/components'
import * as React from 'react'

type CampaignEmailProps = {
  chefName: string
  bodyText: string // Plain text body (after token rendering). Newlines become paragraphs.
  previewText?: string // Email preview/snippet (first ~90 chars visible in inbox)
  unsubscribeUrl: string
}

export function CampaignEmail({
  chefName,
  bodyText,
  previewText,
  unsubscribeUrl,
}: CampaignEmailProps) {
  // Convert newline-separated paragraphs to individual Text elements
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const preview = previewText ?? bodyText.slice(0, 90).trim()

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>ChefFlow</Text>
          </Section>

          {/* Body */}
          <Section style={content}>
            {paragraphs.map((para, i) => (
              <Text key={i} style={paragraph}>
                {para}
              </Text>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This message was sent by <strong>{chefName}</strong> via ChefFlow.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubLink}>
                Unsubscribe
              </Link>{' '}
              from future marketing emails.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#374151',
  margin: '0 0 16px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footer = {
  padding: '20px 32px',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0 0 4px',
  lineHeight: '1.5',
}

const unsubLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}
