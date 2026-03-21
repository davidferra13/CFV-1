'use client'

import { useState, useTransition } from 'react'
import {
  disableDevice,
  enableDevice,
  revokeDevice,
  regeneratePairingCode,
  listDevices,
} from '@/lib/devices/actions'
import { DeviceStatusBadge } from './device-status-badge'
import { CreateDeviceModal } from './create-device-modal'
import { PairingDisplay } from './pairing-display'
import { DeviceEventLog } from './device-event-log'
import { toast } from 'sonner'
import type { DeviceWithOnlineStatus } from '@/lib/devices/types'
import { Tablet, Monitor, Smartphone, Plus } from '@/components/ui/icons'

interface DeviceListProps {
  initialDevices: DeviceWithOnlineStatus[]
}

const deviceTypeIcon: Record<string, typeof Tablet> = {
  ipad: Tablet,
  android: Smartphone,
  browser: Monitor,
}

const flowLabels: Record<string, string> = {
  inquiry: 'Inquiry',
  checkin: 'Check-in',
  menu_browse: 'Menu',
  order: 'Order',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function DeviceList({ initialDevices }: DeviceListProps) {
  const [devices, setDevices] = useState(initialDevices)
  const [showCreate, setShowCreate] = useState(false)
  const [pairingData, setPairingData] = useState<{
    pairingCode: string
    expiresAt: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionDeviceId, setActionDeviceId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  async function refresh() {
    try {
      const updated = await listDevices()
      setDevices(updated)
    } catch {
      // Ignore refresh errors
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === devices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(devices.map((d) => d.id)))
    }
  }

  function handleEnable(deviceId: string) {
    setActionDeviceId(deviceId)
    startTransition(async () => {
      try {
        await enableDevice(deviceId)
        toast.success('Device re-enabled')
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to enable')
      }
      setActionDeviceId(null)
    })
  }

  function handleDisable(deviceId: string) {
    if (!confirm('Disable this device? It will be locked out immediately.')) return
    setActionDeviceId(deviceId)
    startTransition(async () => {
      try {
        await disableDevice(deviceId)
        toast.success('Device disabled')
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to disable')
      }
      setActionDeviceId(null)
    })
  }

  function handleRevoke(deviceId: string) {
    if (!confirm('Revoke this device permanently? It will need to be re-paired.')) return
    setActionDeviceId(deviceId)
    startTransition(async () => {
      try {
        await revokeDevice(deviceId)
        toast.success('Device revoked')
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to revoke')
      }
      setActionDeviceId(null)
    })
  }

  function handleRegenerate(deviceId: string) {
    setActionDeviceId(deviceId)
    startTransition(async () => {
      try {
        const result = await regeneratePairingCode(deviceId)
        setPairingData({
          pairingCode: result.pairingCode,
          expiresAt: result.expiresAt,
        })
        toast.success('New pairing code generated')
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to regenerate')
      }
      setActionDeviceId(null)
    })
  }

  function handleBulkDisable() {
    if (!confirm(`Disable ${selected.size} device(s)? They will be locked out immediately.`)) return
    startTransition(async () => {
      let successCount = 0
      for (const id of selected) {
        try {
          await disableDevice(id)
          successCount++
        } catch {
          // Continue with others
        }
      }
      toast.success(`${successCount} device(s) disabled`)
      setSelected(new Set())
      await refresh()
    })
  }

  function handleBulkRevoke() {
    if (!confirm(`Revoke ${selected.size} device(s) permanently? They will need to be re-paired.`))
      return
    startTransition(async () => {
      let successCount = 0
      for (const id of selected) {
        try {
          await revokeDevice(id)
          successCount++
        } catch {
          // Continue with others
        }
      }
      toast.success(`${successCount} device(s) revoked`)
      setSelected(new Set())
      await refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">
          Device Fleet
          <span className="ml-2 text-sm font-normal text-stone-400">({devices.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Add Device
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-stone-800/80 px-4 py-2.5">
          <span className="text-sm text-stone-300">{selected.size} selected</span>
          <button
            type="button"
            onClick={handleBulkDisable}
            disabled={isPending}
            className="rounded px-2.5 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-950 disabled:opacity-50"
          >
            Disable Selected
          </button>
          <button
            type="button"
            onClick={handleBulkRevoke}
            disabled={isPending}
            className="rounded px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
          >
            Revoke Selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded px-2.5 py-1 text-xs text-stone-400 transition-colors hover:bg-stone-700"
          >
            Clear
          </button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="mt-8 text-center">
          <Tablet className="mx-auto h-12 w-12 text-stone-600" />
          <p className="mt-3 text-stone-400">No devices yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Add a device to generate a pairing code for your tablet
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-800/60">
                  <th className="px-3 py-3 text-left">
                    <span className="sr-only">Select</span>
                    <input
                      type="checkbox"
                      title="Select all devices"
                      checked={selected.size === devices.length && devices.length > 0}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-stone-600 bg-stone-800 text-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Device</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Flow</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Active Staff</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Last Seen</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const Icon = deviceTypeIcon[device.device_type] || Monitor
                  const isLoading = isPending && actionDeviceId === device.id
                  return (
                    <tr
                      key={device.id}
                      className="border-b border-stone-800 transition-colors hover:bg-stone-800/50"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          title={`Select ${device.name}`}
                          checked={selected.has(device.id)}
                          onChange={() => toggleSelect(device.id)}
                          className="h-3.5 w-3.5 rounded border-stone-600 bg-stone-800 text-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-stone-400" />
                          <span className="font-medium text-stone-100">{device.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DeviceStatusBadge
                          status={device.status}
                          onlineStatus={
                            device.status === 'active' ? device.online_status : undefined
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {flowLabels[device.kiosk_flow] || device.kiosk_flow}
                      </td>
                      <td className="px-4 py-3 text-stone-400">{device.location_name || '-'}</td>
                      <td className="px-4 py-3">
                        {device.active_staff_name ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                            {device.active_staff_name}
                          </span>
                        ) : (
                          <span className="text-stone-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-400">{timeAgo(device.last_seen_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {device.status === 'pending_pair' && (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(device.id)}
                              disabled={isLoading}
                              className="rounded px-2 py-1 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-950 disabled:opacity-50"
                            >
                              Show Code
                            </button>
                          )}
                          {device.status === 'disabled' && (
                            <button
                              type="button"
                              onClick={() => handleEnable(device.id)}
                              disabled={isLoading}
                              className="rounded px-2 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-950 disabled:opacity-50"
                            >
                              Enable
                            </button>
                          )}
                          {device.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleDisable(device.id)}
                              disabled={isLoading}
                              className="rounded px-2 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-950 disabled:opacity-50"
                            >
                              Disable
                            </button>
                          )}
                          {(device.status === 'active' || device.status === 'disabled') && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(device.id)}
                              disabled={isLoading}
                              className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                          {device.status === 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(device.id)}
                              disabled={isLoading}
                              className="rounded px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-800 disabled:opacity-50"
                            >
                              Re-pair
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLog(expandedLog === device.id ? null : device.id)
                            }
                            className="rounded px-2 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
                            title="View activity log"
                          >
                            Log
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded event log for selected device */}
          {expandedLog && (
            <DeviceEventLog
              deviceId={expandedLog}
              deviceName={devices.find((d) => d.id === expandedLog)?.name || 'Device'}
            />
          )}
        </div>
      )}

      {showCreate && <CreateDeviceModal onClose={() => setShowCreate(false)} onCreated={refresh} />}

      {pairingData && (
        <PairingDisplay
          pairingCode={pairingData.pairingCode}
          expiresAt={pairingData.expiresAt}
          onClose={() => setPairingData(null)}
        />
      )}
    </>
  )
}
