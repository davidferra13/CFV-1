'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_INTERVAL_MS = 30_000

type ClientPortalPresencePayload = {
  sessionId: string
  tenantId: string
  userId: string
  clientId: string
  clientEmail: string | null
  clientName: string | null
  page: string
  joinedAt: string
  userAgent: string
  referrer: string
}

type ClientPortalPresenceBeaconProps = {
  tenantId?: string | null
  userId: string
  clientId: string
  email?: string | null
  clientName?: string | null
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getOrCreateSessionValue(key: string, createValue: () => string): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing

    const value = createValue()
    sessionStorage.setItem(key, value)
    return value
  } catch {
    return createValue()
  }
}

export function ClientPortalPresenceBeacon({
  tenantId,
  userId,
  clientId,
  email = null,
  clientName = null,
}: ClientPortalPresenceBeaconProps) {
  const pathname = usePathname()
  const sessionIdRef = useRef<string>(
    getOrCreateSessionValue('cf-client-portal-presence-session', generateId)
  )
  const joinedAtRef = useRef<string>(
    getOrCreateSessionValue('cf-client-portal-presence-joined', () => new Date().toISOString())
  )
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const sendPresence = useCallback(() => {
    if (!tenantId) return

    const data: ClientPortalPresencePayload = {
      sessionId: sessionIdRef.current,
      tenantId,
      userId,
      clientId,
      clientEmail: email,
      clientName,
      page: pathnameRef.current ?? '/',
      joinedAt: joinedAtRef.current,
      userAgent: navigator.userAgent.slice(0, 150),
      referrer: document.referrer || '',
    }

    fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: `activity_events:${tenantId}`,
        sessionId: sessionIdRef.current,
        data,
      }),
    }).catch(() => {
      // Presence is a non-blocking signal.
    })
  }, [clientId, clientName, email, tenantId, userId])

  useEffect(() => {
    sendPresence()

    const interval = setInterval(sendPresence, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [sendPresence])

  useEffect(() => {
    sendPresence()
  }, [pathname, sendPresence])

  return null
}
