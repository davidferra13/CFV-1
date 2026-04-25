'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Save, Warehouse } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updatePopUpConfigAction } from './pop-up-actions'
import type { PopUpConfig, PopUpLocationProfile } from './pop-up-model'
import type { PopUpOperatingSnapshot } from './pop-up-operating-panel'

type Props = {
  eventId: string
  config: PopUpConfig
  snapshot: PopUpOperatingSnapshot
  onConfigChange: (config: PopUpConfig) => void
}

function joinList(value?: string[]) {
  return (value ?? []).join(', ')
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function PopUpLocationConstraints({ eventId, config, snapshot, onConfigChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const locationProfile = config.locationProfile
  const [local, setLocal] = useState<PopUpLocationProfile>({
    locationKind: locationProfile?.locationKind ?? 'standalone_drop',
    accessWindow: locationProfile?.accessWindow ?? '',
    kitchenAccess: locationProfile?.kitchenAccess ?? '',
    equipmentAvailable: locationProfile?.equipmentAvailable ?? [],
    coldStorage: locationProfile?.coldStorage ?? '',
    holdingConstraints: locationProfile?.holdingConstraints ?? [],
    loadInNotes: locationProfile?.loadInNotes ?? '',
  })

  function save() {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await updatePopUpConfigAction({
          eventId,
          patch: { locationProfile: local },
        })
        onConfigChange(result.config)
        router.refresh()
        setStatus('Location saved')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to save location')
      }
    })
  }

  return (
    <section id="popup-location" className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-stone-100">Location Constraints</h3>
        </div>
        <div className="mt-4 grid gap-3">
          <Select
            label="Drop type"
            value={local.locationKind}
            onChange={(event) => setLocal({ ...local, locationKind: event.target.value as any })}
            options={[
              { value: 'cafe_collab', label: 'Cafe collab' },
              { value: 'standalone_drop', label: 'Standalone drop' },
              { value: 'private_event', label: 'Private event' },
              { value: 'market', label: 'Market' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Access window"
              value={local.accessWindow ?? ''}
              onChange={(event) => setLocal({ ...local, accessWindow: event.target.value })}
            />
            <Input
              label="Cold storage"
              value={local.coldStorage ?? ''}
              onChange={(event) => setLocal({ ...local, coldStorage: event.target.value })}
            />
          </div>
          <Input
            label="Equipment available"
            value={joinList(local.equipmentAvailable)}
            onChange={(event) =>
              setLocal({ ...local, equipmentAvailable: splitList(event.target.value) })
            }
          />
          <Input
            label="Holding constraints"
            value={joinList(local.holdingConstraints)}
            onChange={(event) =>
              setLocal({ ...local, holdingConstraints: splitList(event.target.value) })
            }
          />
          <Textarea
            label="Kitchen and load-in notes"
            rows={4}
            value={[local.kitchenAccess, local.loadInNotes].filter(Boolean).join('\n')}
            onChange={(event) => {
              const [kitchenAccess, ...loadIn] = event.target.value.split('\n')
              setLocal({ ...local, kitchenAccess, loadInNotes: loadIn.join('\n') })
            }}
          />
          <Button type="button" size="sm" onClick={save} loading={isPending} disabled={isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          {status && <p className="text-xs text-stone-400">{status}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-stone-100">Constraint Warnings</h3>
        </div>
        <div className="mt-4 grid gap-2">
          {snapshot.production.locationWarnings.map((warning) => (
            <div
              key={warning}
              className="rounded-lg border border-amber-800 bg-amber-950/25 px-3 py-2 text-sm text-amber-200"
            >
              {warning}
            </div>
          ))}
          {snapshot.production.locationWarnings.length === 0 && (
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">
              Equipment and holding constraints are clear for the current menu.
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {snapshot.menuItems.map((item) => (
              <div key={item.name} className="rounded-lg border border-stone-800 px-3 py-2">
                <p className="text-sm font-medium text-stone-100">{item.name}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {item.equipmentNeeded.length
                    ? item.equipmentNeeded.join(', ')
                    : 'No equipment flagged'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
