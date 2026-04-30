'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  CloudUpload,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from '@/components/ui/icons'
import { usePwaInstall } from '@/components/pwa/use-pwa-install'

type DeviceStatus = {
  online: boolean
  serviceWorker: 'unsupported' | 'inactive' | 'installing' | 'active'
  notifications: 'unsupported' | NotificationPermission
  pendingCount: number | null
  appVersion: string
}

function statusLabel(status: DeviceStatus['serviceWorker']) {
  if (status === 'active') return 'Active'
  if (status === 'installing') return 'Installing'
  if (status === 'inactive') return 'Not active'
  return 'Unsupported'
}

function StatusRow({
  icon,
  label,
  value,
  tone = 'stone',
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: 'green' | 'amber' | 'red' | 'stone'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-green-500/25 bg-green-500/10 text-green-200'
      : tone === 'amber'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
        : tone === 'red'
          ? 'border-red-500/25 bg-red-500/10 text-red-200'
          : 'border-stone-700 bg-stone-900/70 text-stone-200'

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${toneClass}`}>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-black/20">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] opacity-70">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

export function DeviceStatusPanel({ compact = false }: { compact?: boolean }) {
  const { canPromptInstall, install, installed, isStandalone } = usePwaInstall()
  const [status, setStatus] = useState<DeviceStatus>({
    online: true,
    serviceWorker: 'unsupported',
    notifications: 'unsupported',
    pendingCount: null,
    appVersion: 'Checking',
  })

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const nextStatus: DeviceStatus = {
        online: navigator.onLine,
        serviceWorker: 'serviceWorker' in navigator ? 'inactive' : 'unsupported',
        notifications: 'Notification' in window ? Notification.permission : 'unsupported',
        pendingCount: null,
        appVersion: 'Unknown',
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration().catch(() => null)
        if (registration?.active || navigator.serviceWorker.controller) {
          nextStatus.serviceWorker = 'active'
        } else if (registration?.installing || registration?.waiting) {
          nextStatus.serviceWorker = 'installing'
        }
      }

      const pendingModule = await import('@/lib/offline/idb-queue').catch(() => null)
      if (pendingModule?.isIDBAvailable()) {
        nextStatus.pendingCount = await pendingModule.getPendingCount().catch(() => null)
      }

      const buildVersion = await fetch('/api/build-version', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => (typeof data?.buildId === 'string' ? data.buildId : 'Unknown'))
        .catch(() => 'Unavailable')

      nextStatus.appVersion = buildVersion

      if (!cancelled) {
        setStatus(nextStatus)
      }
    }

    void refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)

    return () => {
      cancelled = true
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [])

  const installState =
    installed || isStandalone ? 'Installed' : canPromptInstall ? 'Ready' : 'Manual'
  const installTone = installed || isStandalone ? 'green' : canPromptInstall ? 'amber' : 'stone'
  const swTone =
    status.serviceWorker === 'active'
      ? 'green'
      : status.serviceWorker === 'installing'
        ? 'amber'
        : 'red'

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatusRow
          icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
          label="Install"
          value={installState}
          tone={installTone}
        />
        <StatusRow
          icon={
            status.online ? (
              <Wifi className="h-4 w-4" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4" aria-hidden="true" />
            )
          }
          label="Connection"
          value={status.online ? 'Online' : 'Offline'}
          tone={status.online ? 'green' : 'red'}
        />
        <StatusRow
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          label="Service worker"
          value={statusLabel(status.serviceWorker)}
          tone={swTone}
        />
        <StatusRow
          icon={<Bell className="h-4 w-4" aria-hidden="true" />}
          label="Notifications"
          value={status.notifications === 'unsupported' ? 'Unsupported' : status.notifications}
          tone={status.notifications === 'granted' ? 'green' : 'stone'}
        />
        <StatusRow
          icon={<CloudUpload className="h-4 w-4" aria-hidden="true" />}
          label="Offline queue"
          value={status.pendingCount == null ? 'Unavailable' : `${status.pendingCount} pending`}
          tone={status.pendingCount && status.pendingCount > 0 ? 'amber' : 'green'}
        />
        <StatusRow
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          label="Version"
          value={status.appVersion}
          tone="stone"
        />
      </div>

      {!installed && canPromptInstall && (
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Install ChefFlow on this device
        </button>
      )}
    </div>
  )
}
