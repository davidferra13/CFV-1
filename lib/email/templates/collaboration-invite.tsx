// Collaboration Invite — Chef-to-Chef Email
// Sent to a chef when another chef invites them to collaborate on an event.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

const ROLE_LABELS: Record<string, string> = {
  primary:   'Primary Chef',
  co_host:   'Co-Host',
  sous_chef: 'Sous Chef',
  observer:  'Observer',
}

type Props = {
  chefName: string       // Recipient chef's display name
  inviterName: string    // The chef who sent the invite
  occasion: string       // Event occasion/name
  eventDate: string | null  // Pre-formatted date string, or null
  role: string           // CollaboratorRole
  note: string | null    // Optional message from inviter
  dashboardUrl: string   // Link directly to dashboard where they can accept
}

export function CollaborationInviteEmail({
  chefName,
  inviterName,
  occasion,
  eventDate,
  role,
  note,
  dashboardUrl,
}: Props) {
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <BaseLayout preview={`${inviterName} invited you to collaborate on ${occasion}`}>
      <Text style={heading}>You&apos;ve been invited to collaborate</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you to join them on an upcoming event.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          {eventDate && (
            <tr>
              <td style={detailLabel}>Date</td>
              <td style={detailValue}>{eventDate}</td>
            </tr>
          )}
          <tr>
            <td style={detailLabel}>Your role</td>
            <td style={detailValue}>{roleLabel}</td>
          </tr>
        </tbody>
      </table>

      {note && (
        <Text style={noteBox}>
          &ldquo;{note}&rdquo;
        </Text>
      )}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={dashboardUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View Invitation
        </Link>
      </div>

      <Text style={muted}>
        You can accept or decline this invitation from your ChefFlow dashboard.
        Only chefs in your network can send collaboration invitations.
      </Text>
    </BaseLayout>
  )
}

const heading      = { fontSize: '24px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const paragraph    = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel  = { fontSize: '13px', color: '#6b7280', padding: '8px 0', borderBottom: '1px solid #f3f4f6', width: '140px' }
const detailValue  = { fontSize: '15px', fontWeight: '600' as const, color: '#18181b', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }
const noteBox      = { fontSize: '14px', color: '#57534e', fontStyle: 'italic', backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px' }
const muted        = { fontSize: '13px', color: '#9ca3af', margin: '0' }
