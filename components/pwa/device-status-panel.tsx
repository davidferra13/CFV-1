'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  CloudUpload,
  Copy,
  RefreshCw,
  ShieldCheck,
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
  manifest: 'checking' | 'available' | 'unavailable'
  storage: 'checking' | 'available' | 'unavailable'
  lastChecked: string
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

async function fetchWithTimeout(path: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(path, { cache: 'no-store', signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function timeoutAfter(timeoutMs: number) {
  return new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('Timed out')), timeoutMs)
  })
}

export function DeviceStatusPanel({ compact = false }: { compact?: boolean }) {
  const { browserName, canPromptInstall, install, installed, isStandalone } = usePwaInstall()
  const [status, setStatus] = useState<DeviceStatus>({
    online: true,
    serviceWorker: 'unsupported',
    notifications: 'unsupported',
    pendingCount: null,
    appVersion: 'Checking',
    manifest: 'checking',
    storage: 'checking',
    lastChecked: 'Checking',
  })
  const [refreshing, setRefreshing] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const refreshDeviceStatus = useCallback(async () => {
    setRefreshing(true)
    const nextStatus: DeviceStatus = {
      online: navigator.onLine,
      serviceWorker: 'serviceWorker' in navigator ? 'inactive' : 'unsupported',
      notifications: 'Notification' in window ? Notification.permission : 'unsupported',
      pendingCount: null,
      appVersion: 'Unknown',
      manifest: 'checking',
      storage: 'checking',
      lastChecked: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration().catch(() => null)
      if (registration?.active || navigator.serviceWorker.controller) {
        nextStatus.serviceWorker = 'active'
      } else if (registration?.installing || registration?.waiting) {
        nextStatus.serviceWorker = 'installing'
      }
    }

    const pendingModule = await Promise.race([
      import('@/lib/offline/idb-queue'),
      timeoutAfter(3_000),
    ]).catch(() => null)
    if (pendingModule?.isIDBAvailable()) {
      nextStatus.pendingCount = await Promise.race([
        pendingModule.getPendingCount(),
        timeoutAfter(3_000),
      ]).catch(() => null)
    }

    nextStatus.storage = pendingModule?.isIDBAvailable() ? 'available' : 'unavailable'

    nextStatus.manifest = await fetchWithTimeout('/manifest.json', 3_000)
      .then((response) => (response.ok ? 'available' : 'unavailable'))
      .catch(() => 'unavailable')

    const buildVersion = await fetchWithTimeout('/api/build-version', 3_000)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (typeof data?.buildId === 'string' ? data.buildId : 'Unknown'))
      .catch(() => 'Unavailable')

    nextStatus.appVersion = buildVersion

    setStatus(nextStatus)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const refresh = () => {
      void refreshDeviceStatus()
    }

    refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)

    return () => {
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [refreshDeviceStatus])

  const installState =
    installed || isStandalone ? 'Installed' : canPromptInstall ? 'Ready' : 'Manual'
  const installTone = installed || isStandalone ? 'green' : canPromptInstall ? 'amber' : 'stone'
  const swTone =
    status.serviceWorker === 'active'
      ? 'green'
      : status.serviceWorker === 'installing'
        ? 'amber'
        : 'red'
  const diagnostics = [
    'ChefFlow device diagnostics',
    `Browser: ${browserName}`,
    `Display mode: ${installed || isStandalone ? 'standalone' : 'browser'}`,
    `Install prompt: ${canPromptInstall ? 'ready' : 'manual'}`,
    `Connection: ${status.online ? 'online' : 'offline'}`,
    `Service worker: ${statusLabel(status.serviceWorker)}`,
    `Manifest: ${status.manifest}`,
    `Offline storage: ${status.storage}`,
    `Offline queue: ${status.pendingCount == null ? 'unavailable' : `${status.pendingCount} pending`}`,
    `Notifications: ${status.notifications}`,
    `App version: ${status.appVersion}`,
    `Last checked: ${status.lastChecked}`,
  ].join('\n')

  async function copyDiagnostics() {
    setCopyState('idle')
    try {
      await Promise.race([navigator.clipboard.writeText(diagnostics), timeoutAfter(2_000)])
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

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
        <StatusRow
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          label="Manifest"
          value={status.manifest === 'available' ? 'Available' : status.manifest}
          tone={status.manifest === 'available' ? 'green' : 'red'}
        />
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-100">Device diagnostics</p>
            <p className="mt-1 text-xs leading-5 text-stone-400">
              Last checked {status.lastChecked}. Copy this report when troubleshooting install,
              offline, or update behavior.
            </p>
            {copyState !== 'idle' && (
              <p
                className={`mt-2 text-xs ${
                  copyState === 'copied' ? 'text-green-300' : 'text-red-300'
                }`}
                role="status"
              >
                {copyState === 'copied'
                  ? 'Diagnostics copied.'
                  : 'Copy failed. Use the visible status rows instead.'}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void refreshDeviceStatus()}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {refreshing ? 'Checking' : 'Refresh status'}
            </button>
            <button
              type="button"
              onClick={() => void copyDiagnostics()}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-stone-100 px-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-white"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy diagnostics
            </button>
          </div>
        </div>
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
