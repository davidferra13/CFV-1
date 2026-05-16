// Sample Menus Sent Email Template
// Sent to clients when the chef shares menu options for selection.

import { Text, Link, Section, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type MenuOption = {
  title: string
  description: string
  pricePerPerson: string | null
  viewUrl: string
  selectUrl: string
}

type SampleMenusSentProps = {
  clientName: string
  chefName: string
  menus: MenuOption[]
}

export function SampleMenusSent({ clientName, chefName, menus }: SampleMenusSentProps) {
  return (
    <BaseLayout preview={`${chefName} sent you menu options to choose from`}>
      <Text style={greeting}>Hi {clientName.split(' ')[0]},</Text>

      <Text style={body}>
        I put together some menu options based on what we discussed. Take a look and let me know
        which speaks to you, or if you want to mix and match ideas from different menus.
      </Text>

      {menus.map((menu, idx) => (
        <Section key={idx} style={menuCard}>
          <Text style={menuTitle}>{menu.title}</Text>
          {menu.description && <Text style={menuDesc}>{menu.description}</Text>}
          {menu.pricePerPerson && <Text style={menuPrice}>{menu.pricePerPerson}</Text>}
          <div style={menuActions}>
            <Link href={menu.viewUrl} style={viewLink}>
              View Full Menu
            </Link>
            <Link href={menu.selectUrl} style={selectLink}>
              Select This Menu
            </Link>
          </div>
        </Section>
      ))}

      <Hr style={divider} />

      <Text style={body}>
        Once you select a menu, I will put together a quote with the full breakdown. No pressure to
        decide right away.
      </Text>

      <Text style={signoff}>{chefName}</Text>
    </BaseLayout>
  )
}

export default SampleMenusSent

// Styles
const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#1a1a1a',
  margin: '0 0 16px 0',
}

const body = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333333',
  margin: '0 0 16px 0',
}

const menuCard = {
  backgroundColor: '#fafafa',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
}

const menuTitle = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 8px 0',
}

const menuDesc = {
  fontSize: '14px',
  color: '#555555',
  margin: '0 0 8px 0',
  lineHeight: '20px',
}

const menuPrice = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#2563eb',
  margin: '0 0 12px 0',
}

const menuActions = {
  display: 'flex' as const,
  gap: '12px',
}

const viewLink = {
  fontSize: '13px',
  color: '#666666',
  textDecoration: 'underline',
}

const selectLink = {
  display: 'inline-block',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: '500' as const,
}

const divider = {
  borderColor: '#eeeeee',
  margin: '24px 0',
}

const signoff = {
  fontSize: '15px',
  color: '#333333',
  margin: '16px 0 0 0',
}
