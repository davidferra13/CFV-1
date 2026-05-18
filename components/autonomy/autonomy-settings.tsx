'use client'

import { useEffect, useMemo, useState } from 'react'
import { Lock, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AutonomyDomainSetting, AutonomyMode } from './types'

type AutonomySettingsProps = {
  settings: AutonomyDomainSetting[]
  onChange?: (setting: AutonomyDomainSetting) => void
}

const modeLabels: Record<AutonomyMode, string> = {
  manual: 'Manual',
  approval: 'Approve',
  auto: 'Auto',
}

const modeDescriptions: Record<AutonomyMode, string> = {
  manual: 'Chef starts every action.',
  approval: 'Chef reviews drafted actions.',
  auto: 'ChefFlow executes eligible actions.',
}

export function AutonomySettings({ settings, onChange }: AutonomySettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])
  const sortedSettings = useMemo(
    () => [...localSettings].sort((a, b) => a.label.localeCompare(b.label)),
    [localSettings]
  )

  function updateSetting(next: AutonomyDomainSetting) {
    setLocalSettings((current) =>
      current.map((setting) => (setting.domain === next.domain ? next : setting))
    )
    onChange?.(next)
  }

  function changeMode(setting: AutonomyDomainSetting, mode: AutonomyMode) {
    if (mode === 'auto' && setting.autoEligible === false) return
    updateSetting({ ...setting, mode })
  }

  function changeThreshold(setting: AutonomyDomainSetting, confidenceThreshold: number) {
    updateSetting({ ...setting, confidenceThreshold })
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md border border-stone-700 bg-stone-900 p-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-300" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-50">Autonomy settings</h2>
          <p className="mt-1 text-sm text-stone-400">
            Set how much review each domain needs before action.
          </p>
        </div>
      </div>

      <div className="divide-y divide-stone-800">
        {sortedSettings.map((setting) => {
          const threshold = Math.min(100, Math.max(0, Math.round(setting.confidenceThreshold)))
          return (
            <div key={setting.domain} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">{setting.label}</h3>
                    <Badge variant="default" className="capitalize">
                      {setting.domain}
                    </Badge>
                    {setting.autoEligible === false && (
                      <Badge variant="warning" className="gap-1">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Approval only
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-400">{setting.description}</p>
                  <p className="mt-2 text-xs text-stone-500">{modeDescriptions[setting.mode]}</p>
                  {setting.lockedReason && (
                    <p className="mt-2 text-xs text-amber-300">{setting.lockedReason}</p>
                  )}
                </div>

                <div className="grid gap-3 lg:w-[420px]">
                  <div
                    className="grid grid-cols-3 rounded-lg border border-stone-700 bg-stone-950 p-1"
                    role="radiogroup"
                    aria-label={`${setting.label} autonomy mode`}
                  >
                    {(Object.keys(modeLabels) as AutonomyMode[]).map((mode) => {
                      const checked = setting.mode === mode
                      const disabled = mode === 'auto' && setting.autoEligible === false
                      return (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          disabled={disabled}
                          onClick={() => changeMode(setting, mode)}
                          className={`min-h-[40px] rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                            checked
                              ? 'bg-brand-600 text-white'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          {modeLabels[mode]}
                        </button>
                      )
                    })}
                  </div>

                  <label className="grid gap-2">
                    <span className="flex items-center justify-between gap-3 text-xs text-stone-400">
                      <span>Auto confidence floor</span>
                      <span className="font-medium text-stone-200">{threshold}%</span>
                    </span>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={threshold}
                      onChange={(event) => changeThreshold(setting, Number(event.target.value))}
                      className="h-2 w-full cursor-pointer accent-brand-500"
                      aria-label={`${setting.label} confidence threshold`}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {settings.length === 0 && (
        <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-400">
          No autonomy domains are configured yet.
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLocalSettings(settings)}
        >
          Reset unsaved changes
        </Button>
      </div>
    </Card>
  )
}
