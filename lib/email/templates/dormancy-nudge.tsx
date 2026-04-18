// Dormancy Nudge Email - Sent when a chef hasn't logged in for 30+ days
// Part of the chef re-engagement system (Q40 fix)

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type DormancyNudgeEmailProps = {
  chefName: string
  daysSinceLogin: number
  dashboardUrl: string
}

export function DormancyNudgeEmail({
  chefName,
  daysSinceLogin,
  dashboardUrl,
}: DormancyNudgeEmailProps) {
  return (
    <BaseLayout preview={`${chefName}, your ChefFlow dashboard misses you`}>
      <Text style={{ fontSize: '18px', fontWeight: 600, color: '#1c1917', marginBottom: '8px' }}>
        Hey {chefName},
      </Text>
      <Text style={{ fontSize: '15px', color: '#44403c', lineHeight: '1.6' }}>
        It has been {daysSinceLogin} days since your last visit to ChefFlow. Your dashboard,
        recipes, and client history are all still here waiting for you.
      </Text>
      <Text style={{ fontSize: '15px', color: '#44403c', lineHeight: '1.6' }}>
        If anything is not working the way you need, reply to this email and let us know. We read
        every response.
      </Text>
      <Button
        href={dashboardUrl}
        style={{
          backgroundColor: '#e88f47',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '15px',
          textDecoration: 'none',
          display: 'inline-block',
          marginTop: '16px',
          marginBottom: '16px',
        }}
      >
        Open Your Dashboard
      </Button>
      <Text style={{ fontSize: '13px', color: '#78716c', lineHeight: '1.5' }}>
        You are receiving this because you have a ChefFlow account. You will not receive another
        nudge for at least 30 days.
      </Text>
    </BaseLayout>
  )
}
