// Menu Approval Request - Client Email
// Sent to the client when the chef sends a menu for review and approval.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type MenuItem = {
  menu_name: string
  dishes: string[]
}

type Props = {
  clientName: string
  occasion: string
  eventDate: string
  menuSnapshot: MenuItem[]
  approvalUrl: string
}

export function MenuApprovalRequestEmail({
  clientName,
  occasion,
  eventDate,
  menuSnapshot,
  approvalUrl,
}: Props) {
  return (
    <BaseLayout preview={`Menu ready for your review - ${occasion} on ${eventDate}`}>
      <Text style={heading}>Your menu is ready for review</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your chef has finalized the menu for <strong>{occasion}</strong> on{' '}
        <strong>{eventDate}</strong>. Please review it and let them know if you&apos;re happy or
        would like any changes.
      </Text>

      {menuSnapshot.length > 0 && (
        <div style={menuBox}>
          {menuSnapshot.map((menu, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <Text style={menuName}>{menu.menu_name}</Text>
              {menu.dishes.map((dish, j) => (
                <Text key={j} style={dishItem}>
                  • {dish}
                </Text>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={approvalUrl}
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
          Review &amp; Approve Menu
        </Link>
      </div>

      <Text style={muted}>
        You can approve the menu as-is or send a note with any requests. Your chef will be notified
        immediately.
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
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const menuBox = {
  backgroundColor: '#fafaf9',
  border: '1px solid #e7e5e4',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
}
const menuName = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#292524',
  margin: '0 0 4px',
}
const dishItem = { fontSize: '13px', color: '#57534e', margin: '2px 0' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
