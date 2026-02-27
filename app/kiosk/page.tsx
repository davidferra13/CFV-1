'use client'

import { useEffect, useState, useCallback } from 'react'
import { KioskHeader } from '@/components/kiosk/kiosk-header'
import { StaffPinEntry } from '@/components/kiosk/staff-pin-entry'
import { KioskInquiryForm } from '@/components/kiosk/kiosk-inquiry-form'
import { KioskSuccessScreen } from '@/components/kiosk/kiosk-success-screen'
import { KioskOrderRegister } from '@/components/kiosk/kiosk-order-register'
import { IdleResetProvider } from '@/components/kiosk/idle-reset-provider'
import { HeartbeatProvider } from '@/components/kiosk/heartbeat-provider'
import type { KioskConfig, StaffPinSession } from '@/lib/devices/types'

type KioskView = 'loading' | 'pin' | 'form' | 'order' | 'success'

const DEVICE_TOKEN_KEY = 'chefflow_kiosk_token'

export default function KioskPage() {
  const [view, setView] = useState<KioskView>('loading')
  const [config, setConfig] = useState<KioskConfig | null>(null)
  const [staffSession, setStaffSession] = useState<StaffPinSession | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const getWorkView = useCallback((nextConfig: KioskConfig | null) => {
    return nextConfig?.kiosk_flow === 'order' ? 'order' : 'form'
  }, [])

  // Check for existing device token on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (!stored) {
      window.location.href = '/kiosk/pair'
      return
    }
    setToken(stored)

    // Fetch device status to get config
    fetch('/api/kiosk/status', {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'disabled' || data.status === 'revoked' || !data.config) {
          localStorage.removeItem(DEVICE_TOKEN_KEY)
          window.location.href = '/kiosk/disabled'
          return
        }
        setConfig(data.config)
        setView(data.config.require_staff_pin ? 'pin' : getWorkView(data.config))
      })
      .catch(() => {
        // Network error — show form anyway with defaults
        setConfig(null)
        setView('pin')
      })
  }, [getWorkView])

  const handlePinVerified = useCallback(
    (session: StaffPinSession) => {
      setStaffSession(session)
      setView(getWorkView(config))
    },
    [config, getWorkView]
  )

  const handleInquirySubmitted = useCallback(() => {
    setView('success')
  }, [])

  const handleSuccessReset = useCallback(() => {
    setView(getWorkView(config))
  }, [config, getWorkView])

  const endStaffSession = useCallback(
    (reason: string) => {
      if (staffSession && token) {
        fetch('/api/kiosk/end-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: staffSession.session_id,
            reason,
          }),
        }).catch(() => {})
      }
      setStaffSession(null)
      setView(config?.require_staff_pin ? 'pin' : getWorkView(config))
    },
    [staffSession, token, config, getWorkView]
  )

  const handleIdleReset = useCallback(() => {
    endStaffSession('idle')
  }, [endStaffSession])

  const handleSwitchStaff = useCallback(() => {
    endStaffSession('manual_lock')
  }, [endStaffSession])

  const handleHardReset = useCallback(() => {
    // Log hard reset event
    if (token) {
      fetch('/api/kiosk/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'hard_reset' }),
      }).catch(() => {})
    }
    localStorage.removeItem(DEVICE_TOKEN_KEY)
    window.location.href = '/kiosk/pair'
  }, [token])

  const handleDeviceDisabled = useCallback(() => {
    localStorage.removeItem(DEVICE_TOKEN_KEY)
    window.location.href = '/kiosk/disabled'
  }, [])

  if (view === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
      </div>
    )
  }

  const idleTimeout = config?.idle_timeout_seconds || 90

  return (
    <HeartbeatProvider token={token} onDeviceDisabled={handleDeviceDisabled}>
      <IdleResetProvider
        timeoutSeconds={idleTimeout}
        onReset={handleIdleReset}
        active={view === 'form' || view === 'order'}
      >
        <div className="flex min-h-screen flex-col">
          <KioskHeader
            businessName={config?.business_name || 'ChefFlow'}
            staffName={staffSession?.staff_name || null}
            onHardReset={handleHardReset}
            onSwitchStaff={staffSession ? handleSwitchStaff : undefined}
          />

          <main className="flex flex-1 items-center justify-center p-6">
            {view === 'pin' && <StaffPinEntry token={token!} onVerified={handlePinVerified} />}

            {view === 'form' && (
              <KioskInquiryForm
                token={token!}
                staffSession={staffSession}
                onSubmitted={handleInquirySubmitted}
              />
            )}

            {view === 'order' && <KioskOrderRegister token={token!} staffSession={staffSession} />}

            {view === 'success' && (
              <KioskSuccessScreen
                onReset={handleSuccessReset}
                countdownSeconds={config?.success_display_seconds}
              />
            )}
          </main>
        </div>
      </IdleResetProvider>
    </HeartbeatProvider>
  )
}
