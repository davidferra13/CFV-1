'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  'e2e.chef-b': { label: 'CHEF B', color: '#d4762c' },
  'e2e.chef': { label: 'CHEF', color: '#e88f47' },
  'e2e.client': { label: 'CLIENT', color: '#4a90d9' },
  'e2e.staff': { label: 'STAFF', color: '#6b8e23' },
  'e2e.partner': { label: 'PARTNER', color: '#9b59b6' },
  agent: { label: 'ADMIN', color: '#e74c3c' },
}

function detectRole(email: string): { label: string; color: string; email: string } | null {
  // Check chef-b before chef (longer prefix first)
  for (const [prefix, meta] of Object.entries(ROLE_MAP)) {
    if (email.startsWith(prefix)) {
      return { ...meta, email }
    }
  }
  return null
}

export function TestAccountBanner() {
  const [info, setInfo] = useState<{ label: string; color: string; email: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email
      if (email?.endsWith('@chefflow.test')) {
        setInfo(detectRole(email))
      }
    })
  }, [])

  if (!info) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        height: 28,
        lineHeight: '28px',
        textAlign: 'center',
        font: 'bold 13px/28px Inter, system-ui, sans-serif',
        color: '#fff',
        background: `${info.color}cc`,
        pointerEvents: 'none',
        letterSpacing: '0.5px',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {info.label} &mdash; {info.email}
    </div>
  )
}
