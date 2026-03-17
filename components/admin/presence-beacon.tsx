'use client'

// Presence Beacon - silently broadcasts authenticated portal presence to the
// site:presence Realtime channel for internal live-ops views.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

const CHANNEL_NAME = 'site:presence'

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

export function PresenceBeacon() {
  const pathname = usePathname()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const sessionIdRef = useRef<string>(getOrCreateSessionId())
  const joinedAtRef = useRef<string>(getJoinedAt())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(CHANNEL_NAME)
    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return

      await channel.track({
        sessionId: sessionIdRef.current,
        userId: null,
        email: null,
        role: 'authenticated',
        page: pathname ?? '/',
        joinedAt: joinedAtRef.current,
        userAgent: navigator.userAgent.slice(0, 150),
        referrer: document.referrer || '',
      } satisfies PresencePayload)
    })

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const channel = channelRef.current
    if (!channel) return

    channel
      .track({
        sessionId: sessionIdRef.current,
        userId: null,
        email: null,
        role: 'authenticated',
        page: pathname ?? '/',
        joinedAt: joinedAtRef.current,
        userAgent: navigator.userAgent.slice(0, 150),
        referrer: document.referrer || '',
      } satisfies PresencePayload)
      .catch(() => {
        // ignore track errors (channel may not be subscribed yet)
      })
  }, [pathname])

  return null
}
