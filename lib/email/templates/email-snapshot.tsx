// Email Snapshot Footer Template
// "At a Glance" summary appended after chef sign-off in outgoing emails.
// Renders rich context: host, guests, occasion, dishes, date, dietary, etc.
// Follows chef communication rules: natural tone, no AI formatting, plain text feel.

import { Hr, Section, Text } from '@react-email/components'
import * as React from 'react'
import type { EmailSnapshotResult, SnapshotLine } from '@/lib/lifecycle/email-snapshot'

type EmailSnapshotFooterProps = {
  snapshot: EmailSnapshotResult
  /** Version A = full inline, Version B = teased with portal link */
  version: 'a' | 'b'
  /** Portal URL for version B */
  portalUrl?: string | null
}

function renderLineValue(line: SnapshotLine): string {
  if (!line.value || line.value === 'TBD') return 'TBD'
  if (line.status === 'partial') return `${line.value} (exact TBD)`
  return line.value
}

function isDishesLine(line: SnapshotLine): boolean {
  return line.label === 'Dishes discussed'
}

function isMenuLine(line: SnapshotLine): boolean {
  return line.label === 'Menu confirmed' || line.label === 'Course selection'
}

export function EmailSnapshotFooter({
  snapshot,
  version,
  portalUrl,
}: EmailSnapshotFooterProps) {
  const isPortalVersion = version === 'b' && portalUrl

  // In version B, tease menu/dish lines instead of showing full details
  const visibleLines = snapshot.lines.filter((line) => {
    if (!isPortalVersion) return true
    if (isDishesLine(line) || isMenuLine(line)) return false
    return true
  })

  return (
    <>
      <Hr style={dividerStyle} />
      <Section style={snapshotSection}>
        <Text style={snapshotTitle}>{snapshot.title}</Text>

        {visibleLines.map((line, i) => {
          if (isDishesLine(line) && line.value) {
            const dishes = line.value.split(', ')
            return (
              <React.Fragment key={i}>
                <Text style={lineLabel}>Dishes discussed:</Text>
                {dishes.map((dish, j) => (
                  <Text key={j} style={dishItem}>
                    {dish}
                  </Text>
                ))}
              </React.Fragment>
            )
          }

          return (
            <Text key={i} style={lineStyle}>
              {line.label}: {renderLineValue(line)}
            </Text>
          )
        })}

        {isPortalVersion && (
          <Text style={portalTeaser}>
            I put together some menu ideas based on what you mentioned.{' '}
            <a href={portalUrl!} style={portalLink}>
              Take a look here
            </a>
          </Text>
        )}
      </Section>
    </>
  )
}

const dividerStyle = {
  borderColor: '#e5e7eb',
  margin: '24px 0 16px 0',
}

const snapshotSection = {
  padding: '0',
}

const snapshotTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#374151',
  margin: '0 0 12px 0',
}

const lineStyle = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '4px 0',
  lineHeight: '1.5',
}

const lineLabel = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '8px 0 2px 0',
  lineHeight: '1.5',
}

const dishItem = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '2px 0 2px 16px',
  lineHeight: '1.5',
}

const portalTeaser = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '16px 0 0 0',
  lineHeight: '1.5',
}

const portalLink = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '500' as const,
}
