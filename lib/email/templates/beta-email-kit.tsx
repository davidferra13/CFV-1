import {
  Body,
  Button,
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

type BetaTone = 'review' | 'active' | 'success' | 'danger'

export type BetaEmailAction = {
  label: string
  href: string
}

export type BetaTimelineItem = {
  title: string
  detail: string
}

export type BetaDetailItem = {
  label: string
  value: React.ReactNode
}

export type BetaTrackerItem = {
  label: string
  detail: string
  state: 'complete' | 'active' | 'upcoming' | 'closed'
}

type BetaLifecycleLayoutProps = {
  preview: string
  statusLabel: string
  statusTone: BetaTone
  headline: string
  intro: string
  action?: BetaEmailAction
  footerReason: string
  children: React.ReactNode
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const SUPPORT_EMAIL = 'support@cheflowhq.com'

const TONE_STYLES: Record<
  BetaTone,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  review: {
    backgroundColor: '#fff2df',
    color: '#8a5a16',
    borderColor: '#f0c794',
  },
  active: {
    backgroundColor: '#efe4d7',
    color: '#8f4e21',
    borderColor: '#d7b393',
  },
  success: {
    backgroundColor: '#e3f3ea',
    color: '#215c45',
    borderColor: '#9ec7b1',
  },
  danger: {
    backgroundColor: '#f8e4e4',
    color: '#8c2f2f',
    borderColor: '#e0a9a9',
  },
}

const TRACKER_STATE_STYLES = {
  complete: { backgroundColor: '#e3f3ea', color: '#215c45', borderColor: '#9ec7b1', label: 'Done' },
  active: { backgroundColor: '#efe4d7', color: '#8f4e21', borderColor: '#d7b393', label: 'Now' },
  upcoming: {
    backgroundColor: '#f6efe7',
    color: '#6a584b',
    borderColor: '#e0d2c4',
    label: 'Next',
  },
  closed: { backgroundColor: '#f8e4e4', color: '#8c2f2f', borderColor: '#e0a9a9', label: 'Closed' },
}

export function BetaLifecycleLayout({
  preview,
  statusLabel,
  statusTone,
  headline,
  intro,
  action,
  footerReason,
  children,
}: BetaLifecycleLayoutProps) {
  const toneStyle = TONE_STYLES[statusTone]

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={eyebrow}>ChefFlow Beta Program</Text>
            <Text style={{ ...statusPill, ...toneStyle }}>{statusLabel}</Text>
            <Text style={headlineStyle}>{headline}</Text>
            <Text style={introStyle}>{intro}</Text>
            {action ? (
              <Button href={action.href} style={primaryButton}>
                {action.label}
              </Button>
            ) : null}
          </Section>

          <Section style={content}>{children}</Section>

          <Section style={supportCard}>
            <Text style={supportTitle}>Need a human to help move this forward?</Text>
            <Text style={supportBody}>
              Reply to this email or contact{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={accentLink}>
                {SUPPORT_EMAIL}
              </Link>
              . We can help with onboarding questions, timing, and next-step planning.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>{footerReason}</Text>
            <Text style={footerText}>
              ChefFlow
              {' · '}
              <Link href={SITE_URL} style={footerLink}>
                cheflowhq.com
              </Link>
              {' · '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>
                {SUPPORT_EMAIL}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function BetaSectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <Section style={card}>
      {eyebrow ? <Text style={cardEyebrow}>{eyebrow}</Text> : null}
      <Text style={cardTitle}>{title}</Text>
      {children}
    </Section>
  )
}

export function BetaBodyText({ children }: { children: React.ReactNode }) {
  return <Text style={bodyText}>{children}</Text>
}

export function BetaDetailsTable({ rows }: { rows: BetaDetailItem[] }) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={detailsTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.label)}>
            <td style={detailLabel}>{row.label}</td>
            <td style={detailValue}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function BetaTimeline({ items }: { items: BetaTimelineItem[] }) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={detailsTable}>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.title}-${index}`}>
            <td style={timelineIndex}>{index + 1}</td>
            <td style={timelineContent}>
              <Text style={timelineTitle}>{item.title}</Text>
              <Text style={timelineDetail}>{item.detail}</Text>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function BetaTrackerCard({
  stageLabel,
  progressPercent,
  nextAction,
  items,
}: {
  stageLabel: string
  progressPercent: number
  nextAction: string
  items: BetaTrackerItem[]
}) {
  const safeProgress = Math.min(100, Math.max(progressPercent, 0))
  const fillWidth = Math.max(safeProgress, safeProgress === 0 ? 0 : 6)

  return (
    <BetaSectionCard title="Onboarding Tracker" eyebrow="Live Progress">
      <Text style={trackerSummary}>
        {stageLabel}
        {' · '}
        {safeProgress}% complete
      </Text>
      <table width="100%" cellPadding="0" cellSpacing="0" style={progressTrack}>
        <tbody>
          <tr>
            <td style={{ ...progressFill, width: `${fillWidth}%` }}>&nbsp;</td>
            <td style={progressEmpty}>&nbsp;</td>
          </tr>
        </tbody>
      </table>
      <Text style={bodyText}>{nextAction}</Text>

      <table width="100%" cellPadding="0" cellSpacing="0" style={detailsTable}>
        <tbody>
          {items.map((item, index) => {
            const stateStyle = TRACKER_STATE_STYLES[item.state]
            return (
              <tr key={`${item.label}-${index}`}>
                <td style={trackerContent}>
                  <Text style={trackerItemTitle}>{item.label}</Text>
                  <Text style={trackerItemDetail}>{item.detail}</Text>
                </td>
                <td style={trackerBadgeCell}>
                  <span style={{ ...trackerBadge, ...stateStyle }}>{stateStyle.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </BetaSectionCard>
  )
}

const main = {
  backgroundColor: '#f5f1eb',
  margin: '0',
  padding: '24px 0',
  fontFamily: '"Aptos","Segoe UI",Helvetica,Arial,sans-serif',
}

const container = {
  backgroundColor: '#fffdfa',
  margin: '0 auto',
  maxWidth: '600px',
  border: '1px solid #e8ddd2',
  borderRadius: '18px',
  overflow: 'hidden' as const,
}

const hero = {
  padding: '32px 32px 28px',
  background: 'linear-gradient(180deg, rgba(243,234,223,1) 0%, rgba(255,253,250,1) 100%)',
}

const eyebrow = {
  margin: '0 0 10px',
  color: '#8f4e21',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '1.4px',
  textTransform: 'uppercase' as const,
}

const statusPill = {
  display: 'inline-block',
  margin: '0 0 16px',
  padding: '7px 12px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '0.2px',
}

const headlineStyle = {
  margin: '0 0 14px',
  color: '#1f1a17',
  fontSize: '30px',
  lineHeight: '1.2',
  fontWeight: '700' as const,
}

const introStyle = {
  margin: '0 0 22px',
  color: '#5f544c',
  fontSize: '16px',
  lineHeight: '1.65',
}

const primaryButton = {
  backgroundColor: '#2a201b',
  color: '#fffdfa',
  padding: '14px 22px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: '700' as const,
  display: 'inline-block' as const,
}

const content = {
  padding: '8px 32px 20px',
}

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8ddd2',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '16px',
}

const cardEyebrow = {
  margin: '0 0 6px',
  color: '#8f4e21',
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
}

const cardTitle = {
  margin: '0 0 12px',
  color: '#1f1a17',
  fontSize: '18px',
  fontWeight: '700' as const,
}

const bodyText = {
  margin: '0 0 12px',
  color: '#5f544c',
  fontSize: '15px',
  lineHeight: '1.65',
}

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const detailLabel = {
  width: '145px',
  padding: '10px 12px 10px 0',
  borderTop: '1px solid #f0e7de',
  color: '#8a7c72',
  fontSize: '13px',
  verticalAlign: 'top' as const,
}

const detailValue = {
  padding: '10px 0',
  borderTop: '1px solid #f0e7de',
  color: '#1f1a17',
  fontSize: '14px',
  fontWeight: '600' as const,
}

const timelineIndex = {
  width: '28px',
  padding: '10px 12px 10px 0',
  color: '#b8642b',
  fontSize: '15px',
  fontWeight: '700' as const,
  verticalAlign: 'top' as const,
}

const timelineContent = {
  padding: '10px 0',
  borderTop: '1px solid #f0e7de',
}

const timelineTitle = {
  margin: '0 0 4px',
  color: '#1f1a17',
  fontSize: '14px',
  fontWeight: '700' as const,
}

const timelineDetail = {
  margin: '0',
  color: '#5f544c',
  fontSize: '14px',
  lineHeight: '1.55',
}

const trackerSummary = {
  margin: '0 0 10px',
  color: '#8a7c72',
  fontSize: '13px',
  fontWeight: '700' as const,
  letterSpacing: '0.2px',
  textTransform: 'uppercase' as const,
}

const progressTrack = {
  width: '100%',
  marginBottom: '14px',
}

const progressFill = {
  backgroundColor: '#b8642b',
  borderRadius: '999px',
  height: '10px',
  lineHeight: '10px',
}

const progressEmpty = {
  backgroundColor: '#efe6dd',
  borderRadius: '999px',
  height: '10px',
  lineHeight: '10px',
}

const trackerContent = {
  padding: '10px 10px 10px 0',
  borderTop: '1px solid #f0e7de',
}

const trackerItemTitle = {
  margin: '0 0 4px',
  color: '#1f1a17',
  fontSize: '14px',
  fontWeight: '700' as const,
}

const trackerItemDetail = {
  margin: '0',
  color: '#5f544c',
  fontSize: '13px',
  lineHeight: '1.55',
}

const trackerBadgeCell = {
  width: '72px',
  padding: '10px 0 10px 10px',
  borderTop: '1px solid #f0e7de',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
}

const trackerBadge = {
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '0.2px',
}

const supportCard = {
  margin: '0 32px 20px',
  padding: '18px 20px',
  borderRadius: '16px',
  backgroundColor: '#f6efe7',
  border: '1px solid #e0d2c4',
}

const supportTitle = {
  margin: '0 0 8px',
  color: '#1f1a17',
  fontSize: '15px',
  fontWeight: '700' as const,
}

const supportBody = {
  margin: '0',
  color: '#5f544c',
  fontSize: '14px',
  lineHeight: '1.6',
}

const accentLink = {
  color: '#b8642b',
  textDecoration: 'underline',
  fontWeight: '700' as const,
}

const divider = {
  borderColor: '#eee3d7',
  margin: '0',
}

const footer = {
  padding: '18px 32px 28px',
}

const footerText = {
  margin: '0 0 8px',
  color: '#8a7c72',
  fontSize: '12px',
  lineHeight: '1.6',
}

const footerLink = {
  color: '#8f4e21',
  textDecoration: 'underline',
}
