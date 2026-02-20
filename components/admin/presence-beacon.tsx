'use client'

// Presence Beacon — silently broadcasts this visitor's presence to the site:presence Realtime channel.
// Runs on every page for every visitor (anonymous and authenticated).
// The admin dashboard subscribes to this channel to see who's online in real-time.

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

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem('cf-presence-session')
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem('cf-presence-session', id)
    return id
  } catch {
    return crypto.randomUUID()
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
  const userInfoRef = useRef<{ userId: string | null; email: string | null; role: 'authenticated' | 'anonymous' }>({
    userId: null,
    email: null,
    role: 'anonymous',
  })
  const sessionIdRef = useRef<string>(getOrCreateSessionId())
  const joinedAtRef = useRef<string>(getJoinedAt())

  // Mount: create channel and subscribe
  useEffect(() => {
    const supabase = createClient()
    const sessionId = sessionIdRef.current
    const joinedAt = joinedAtRef.current

    const channel = supabase.channel(CHANNEL_NAME)
    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return

      // Resolve user identity once on connect
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const info = {
        userId: user?.id ?? null,
        email: user?.email ?? null,
        role: (user ? 'authenticated' : 'anonymous') as 'authenticated' | 'anonymous',
      }
      userInfoRef.current = info

      const payload: PresencePayload = {
        sessionId,
        userId: info.userId,
        email: info.email,
        role: info.role,
        page: pathname ?? '/',
        joinedAt,
        userAgent: navigator.userAgent.slice(0, 150),
        referrer: document.referrer || '',
      }

      await channel.track(payload)
    })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update page on every navigation
  useEffect(() => {
    const channel = channelRef.current
    if (!channel) return

    const info = userInfoRef.current
    const payload: PresencePayload = {
      sessionId: sessionIdRef.current,
      userId: info.userId,
      email: info.email,
      role: info.role,
      page: pathname ?? '/',
      joinedAt: joinedAtRef.current,
      userAgent: navigator.userAgent.slice(0, 150),
      referrer: document.referrer || '',
    }

    channel.track(payload).catch(() => {
      // ignore track errors (channel may not be subscribed yet)
    })
  }, [pathname])

  return null
}
