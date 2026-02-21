'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw, Check } from 'lucide-react'
import { toast } from 'sonner'
import { upsertEventLabel } from '@/lib/event-labels/actions'
import type { EventLabelType } from '@/lib/event-labels/actions'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  occasionMap: Record<string, string>
  statusMap: Record<string, string>
  defaultOccasionTypes: string[]
  defaultStatusLabels: string[]
}

// ─── Single label row ─────────────────────────────────────────────────────────

interface LabelRowProps {
  defaultLabel: string
  currentLabel: string
  labelType: EventLabelType
  onSaved: (defaultLabel: string, newLabel: string) => void
}

function LabelRow({ defaultLabel, currentLabel, labelType, onSaved }: LabelRowProps) {
  const [value, setValue] = useState(currentLabel)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Debounce timer so we do not fire a server action on every keystroke
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCustomized = value !== defaultLabel

  const persist = useCallback(
    (newVal: string) => {
      startTransition(async () => {
        try {
          await upsertEventLabel(defaultLabel, newVal || defaultLabel, labelType)
          onSaved(defaultLabel, newVal || defaultLabel)
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        } catch (err: any) {
          toast.error(err.message ?? 'Failed to save label')
        }
      })
    },
    [defaultLabel, labelType, onSaved]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value
    setValue(newVal)
    setSaved(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      persist(newVal.trim() || defaultLabel)
    }, 500)
  }

  function handleReset() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setValue(defaultLabel)
    persist(defaultLabel)
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-100 last:border-0">
      {/* Default label — immutable reference shown in mono */}
      <div className="w-36 shrink-0">
        <span className="text-sm text-stone-500 font-mono">{defaultLabel}</span>
      </div>

      <span className="text-stone-300 shrink-0">→</span>

      {/* Editable custom label */}
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={isPending}
          placeholder={defaultLabel}
          className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:opacity-60"
        />
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 shrink-0 w-28 justify-end">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
        {isCustomized && !saved && (
          <Badge variant="info">Custom</Badge>
        )}
        {isCustomized && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            title="Reset to default"
            className="text-stone-400 hover:text-stone-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventLabelEditor({
  occasionMap: initialOccasionMap,
  statusMap: initialStatusMap,
  defaultOccasionTypes,
  defaultStatusLabels,
}: Props) {
  const [occasionMap, setOccasionMap] = useState(initialOccasionMap)
  const [statusMap, setStatusMap] = useState(initialStatusMap)

  function handleOccasionSaved(defaultLabel: string, newLabel: string) {
    setOccasionMap((prev) => ({ ...prev, [defaultLabel]: newLabel }))
  }

  function handleStatusSaved(defaultLabel: string, newLabel: string) {
    setStatusMap((prev) => ({ ...prev, [defaultLabel]: newLabel }))
  }

  const occasionCustomCount = defaultOccasionTypes.filter((d) => occasionMap[d] !== d).length
  const statusCustomCount = defaultStatusLabels.filter((d) => statusMap[d] !== d).length

  return (
    <div className="space-y-6">
      {/* Occasion types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Occasion Types</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Rename the preset occasion types shown when creating events.
              </p>
            </div>
            {occasionCustomCount > 0 && (
              <Badge variant="info">{occasionCustomCount} customised</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {defaultOccasionTypes.map((defaultLabel) => (
            <LabelRow
              key={defaultLabel}
              defaultLabel={defaultLabel}
              currentLabel={occasionMap[defaultLabel] ?? defaultLabel}
              labelType="occasion_type"
              onSaved={handleOccasionSaved}
            />
          ))}
        </CardContent>
      </Card>

      {/* Status labels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status Labels</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Rename event lifecycle states to match your preferred language.
                The underlying FSM is unchanged — only the display name differs.
              </p>
            </div>
            {statusCustomCount > 0 && (
              <Badge variant="info">{statusCustomCount} customised</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {defaultStatusLabels.map((defaultLabel) => (
            <LabelRow
              key={defaultLabel}
              defaultLabel={defaultLabel}
              currentLabel={statusMap[defaultLabel] ?? defaultLabel}
              labelType="status_label"
              onSaved={handleStatusSaved}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
