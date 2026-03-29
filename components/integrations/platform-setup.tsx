'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MARKETPLACE_PLATFORMS } from '@/lib/marketplace/platforms'
import {
  updateChefPlatformSettings,
  type PlatformConfig,
} from '@/lib/integrations/platform-settings'

type Props = {
  settings: Record<string, PlatformConfig>
}

function tierBadge(tier: 'major' | 'lead_gen' | 'niche') {
  if (tier === 'major') return <Badge variant="success">Major</Badge>
  if (tier === 'lead_gen') return <Badge variant="info">Lead Gen</Badge>
  return <Badge variant="default">Niche</Badge>
}

function PlatformCard({
  channel,
  label,
  tier,
  defaultCommission,
  slaHours,
  config,
}: {
  channel: string
  label: string
  tier: 'major' | 'lead_gen' | 'niche'
  defaultCommission: number
  slaHours: number
  config: PlatformConfig
}) {
  const [active, setActive] = useState(config.active)
  const [commission, setCommission] = useState(config.commissionPercent)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const handleToggle = () => {
    const newActive = !active
    setActive(newActive)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await updateChefPlatformSettings({ channel, active: newActive })
        if (!result.success) {
          setActive(!newActive)
          setMessage(result.error || 'Failed to save')
        }
      } catch {
        setActive(!newActive)
        setMessage('Failed to save')
      }
    })
  }

  const handleCommissionSave = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await updateChefPlatformSettings({
          channel,
          commissionPercent: commission,
        })
        if (result.success) {
          setMessage('Saved')
        } else {
          setMessage(result.error || 'Failed to save')
        }
      } catch {
        setMessage('Failed to save')
      }
    })
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        active
          ? 'border-brand-600/40 bg-stone-900/80'
          : 'border-stone-800 bg-stone-900/30 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-200">{label}</span>
          {tierBadge(tier)}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={handleToggle}
          disabled={pending}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            active ? 'bg-brand-600' : 'bg-stone-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              active ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {active && (
        <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-stone-400">Commission %</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={commission}
                onChange={(e) => setCommission(Math.max(0, Math.min(50, Number(e.target.value))))}
                className="w-16 rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-center text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs text-stone-500">%</span>
              {commission !== config.commissionPercent && (
                <button
                  type="button"
                  onClick={handleCommissionSave}
                  disabled={pending}
                  className="rounded bg-brand-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Save
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Response SLA</span>
            <span className="text-xs text-stone-400">{slaHours}h</span>
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-2 text-xs ${message === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

export function PlatformSetup({ settings }: Props) {
  const activeCount = Object.values(settings).filter((s) => s.active).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Platforms</CardTitle>
            <p className="mt-1 text-xs text-stone-500">
              Select the platforms where you accept inquiries. Active platforms appear in your
              inquiry filters and analytics.
            </p>
          </div>
          {activeCount > 0 && <Badge variant="success">{activeCount} active</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETPLACE_PLATFORMS.map((p) => (
            <PlatformCard
              key={p.channel}
              channel={p.channel}
              label={p.label}
              tier={p.tier}
              defaultCommission={p.defaultCommissionPercent}
              slaHours={p.slaHours}
              config={
                settings[p.channel] || {
                  active: false,
                  commissionPercent: p.defaultCommissionPercent,
                }
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
