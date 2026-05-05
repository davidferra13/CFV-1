// Morning Briefing Email - Sent to chef every morning with their daily briefing.
// Content is pre-generated markdown from the deterministic briefing engine.

import { Text, Hr, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  briefingText: string
  briefingUrl: string
}

/**
 * Convert simple markdown briefing text to React email elements.
 * Handles: **bold**, headers (##), bullet points (-), and plain text.
 */
function renderBriefingLines(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={sectionTitle}>
          {line.replace(/^##\s*/, '')}
        </Text>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s*/, '')
      elements.push(
        <Text key={i} style={bulletItem}>
          {renderInlineBold(content)}
        </Text>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <Text key={i} style={boldLine}>
          {line.replace(/\*\*/g, '')}
        </Text>
      )
    } else {
      elements.push(
        <Text key={i} style={bodyText}>
          {renderInlineBold(line)}
        </Text>
      )
    }
  }

  return elements
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}

export function MorningBriefingEmail({ chefName, briefingText, briefingUrl }: Props) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <BaseLayout preview={`Morning Briefing - ${today}`}>
      <Text style={heading}>Good morning, {chefName}</Text>
      <Text style={subheading}>{today}</Text>
      <Hr style={divider} />
      {renderBriefingLines(briefingText)}
      <Hr style={divider} />
      <Text style={ctaWrapper}>
        <Link href={briefingUrl} style={ctaButton}>
          Open Full Briefing
        </Link>
      </Text>
    </BaseLayout>
  )
}

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0 0 4px',
}

const subheading: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  margin: '0 0 16px',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e5e5',
  margin: '16px 0',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '16px 0 8px',
}

const bulletItem: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
  margin: '2px 0',
  paddingLeft: '16px',
}

const boldLine: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '8px 0 4px',
}

const bodyText: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
  margin: '4px 0',
  lineHeight: '1.5',
}

const ctaWrapper: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
}
