// Email Snapshot Footer ("At a Glance")
// Renders a compact dinner details summary appended after the chef's sign-off.
// Version A: full inline snapshot, no portal link.
// Version B: includes "View in Portal" button with share token URL.

import { Hr, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import type { SnapshotLine } from '@/lib/lifecycle/email-snapshot'

type SnapshotFooterProps = {
  title: string
  lines: SnapshotLine[]
  /** Version B: include portal link */
  circleUrl?: string | null
}

export function SnapshotFooter({ title, lines, circleUrl }: SnapshotFooterProps) {
  if (lines.length === 0) return null

  return (
    <Section style={wrapper}>
      <Hr style={divider} />
      <Text style={titleStyle}>{title}</Text>
      <table style={tableStyle}>
        <tbody>
          {lines.map((line, i) => {
            // Dishes get sub-bullet rendering
            if (line.label === 'Dishes discussed' && line.value) {
              const dishes = line.value.split(', ')
              return (
                <React.Fragment key={i}>
                  <tr>
                    <td style={labelCell} colSpan={2}>
                      Dishes discussed:
                    </td>
                  </tr>
                  {dishes.map((dish, j) => (
                    <tr key={`${i}-${j}`}>
                      <td style={dishIndent} colSpan={2}>
                        {dish}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            }

            return (
              <tr key={i}>
                <td style={labelCell}>{line.label}</td>
                <td style={valueCell(line.status)}>{line.value || 'TBD'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {circleUrl && (
        <Section style={portalSection}>
          <Text style={portalText}>View full details and share with your guests:</Text>
          <Link href={circleUrl} style={portalButton}>
            View in Portal
          </Link>
        </Section>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Styles (inline for email compatibility)
// ---------------------------------------------------------------------------

const wrapper: React.CSSProperties = {
  marginTop: '24px',
  paddingTop: '0',
}

const divider: React.CSSProperties = {
  borderTop: '1px solid #d4d4d4',
  margin: '0 0 16px 0',
}

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#292524',
  margin: '0 0 12px 0',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const labelCell: React.CSSProperties = {
  fontSize: '14px',
  color: '#78716c',
  padding: '3px 8px 3px 0',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
}

function valueCell(status: 'confirmed' | 'partial' | 'tbd'): React.CSSProperties {
  return {
    fontSize: '14px',
    color: status === 'tbd' ? '#a8a29e' : '#292524',
    padding: '3px 0',
    verticalAlign: 'top',
    fontStyle: status === 'tbd' ? 'italic' : 'normal',
  }
}

const dishIndent: React.CSSProperties = {
  fontSize: '14px',
  color: '#292524',
  padding: '2px 0 2px 16px',
}

const portalSection: React.CSSProperties = {
  marginTop: '16px',
  textAlign: 'center' as const,
}

const portalText: React.CSSProperties = {
  fontSize: '13px',
  color: '#78716c',
  margin: '0 0 8px 0',
}

const portalButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#e88f47',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '10px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
}
