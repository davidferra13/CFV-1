'use client'

// Presence Beacon - silently broadcasts authenticated portal presence via
// periodic SSE presence POST calls for internal live-ops views.

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export interface PresencePayload {
  sessionId: string
  userId: string | null
  email: string | null
  role: 'authenticated' | 'anonymous'
  page: string
  joinedAt: string
  userAgent: string
  referrer: string
}

const HEARTBEAT_INTERVAL_MS = 30_000 // 30 seconds

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem('cf-presence-session')
    if (existing) return existing
    const id = generateId()
    sessionStorage.setItem('cf-presence-session', id)
    return id
  } catch {
    return generateId()
  }
}

function getJoinedAt(): string {
  try {
    const existing = sessionStorage.getItem('cf-presence-joined')
    if (existing) return existing
    const ts = new Date().toISOString()
    sessionStorage.setItem('cf-presence-joined', ts)
    return ts
  } catch {
    return new Date().toISOString()
  }
}

interface PresenceBeaconProps {
  email?: string | null
  role?: 'authenticated' | 'anonymous'
  userId?: string | null
}

export function PresenceBeacon({
  email = null,
  role = 'authenticated',
  userId = null,
}: PresenceBeaconProps) {
  const pathname = usePathname()
  const sessionIdRef = useRef<string>(getOrCreateSessionId())
  const joinedAtRef = useRef<string>(getJoinedAt())
  const pathnameRef = useRef(pathname)

  // Keep pathname ref current
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const sendPresence = useCallback(() => {
    const data: PresencePayload = {
      sessionId: sessionIdRef.current,
      userId: role === 'anonymous' ? null : userId,
      email: role === 'anonymous' ? null : email,
      role,
      page: pathnameRef.current ?? '/',
      joinedAt: joinedAtRef.current,
      userAgent: navigator.userAgent.slice(0, 150),
      referrer: document.referrer || '',
    }

    fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'site',
        sessionId: sessionIdRef.current,
        data,
      }),
    }).catch(() => {
      // Ignore presence errors silently
    })
  }, [email, role, userId])

  // Send initial presence and start heartbeat
  useEffect(() => {
    sendPresence()

    const interval = setInterval(sendPresence, HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      // On unmount, connection close signals offline (server handles cleanup)
    }
  }, [sendPresence])

  // Send updated presence when pathname changes
  useEffect(() => {
    sendPresence()
  }, [pathname, sendPresence])

  return null
}
