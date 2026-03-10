'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  recordTemperature,
  TEMPERATURE_LOCATIONS,
  type TempLogEntry,
} from '@/lib/haccp/compliance-log-actions'

type Props = {
  date: string
  initialLogs: TempLogEntry[]
}

export function TemperatureLogForm({ date, initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs)
  const [location, setLocation] = useState('walk_in_cooler')
  const [customLabel, setCustomLabel] = useState('')
  const [tempValue, setTempValue] = useState('')
  const [recordedBy, setRecordedBy] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const preset = TEMPERATURE_LOCATIONS.find((l) => l.id === location)
  const tempNum = tempValue ? parseFloat(tempValue) : null
  const isInRange =
    tempNum !== null && preset ? tempNum >= preset.minF && tempNum <= preset.maxF : null

  function handleSubmit() {
    if (!tempValue || isNaN(parseFloat(tempValue))) {
      setError('Enter a valid temperature')
      return
    }

    setError(null)
    const previous = [...logs]

    startTransition(async () => {
      try {
        const entry = await recordTemperature({
          logDate: date,
          location,
          locationLabel: location === 'custom' ? customLabel : undefined,
          temperatureF: parseFloat(tempValue),
          correctiveAction: correctiveAction || undefined,
          recordedBy: recordedBy || undefined,
        })
        setLogs((prev) => [entry, ...prev])
        setTempValue('')
        setCorrectiveAction('')
      } catch (err: any) {
        setLogs(previous)
        setError(err.message || 'Failed to record temperature')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <CardTitle className="text-stone-100">Record Temperature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100"
            >
              {TEMPERATURE_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
              <option value="custom">Custom Location</option>
            </select>
          </div>

          {location === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Custom Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Backup Cooler"
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100"
              />
            </div>
          )}

          {/* Target Range Display */}
          {preset && (
            <p className="text-sm text-stone-500">
              Target: {preset.minF}F to {preset.maxF}F
            </p>
          )}

          {/* Temperature Input */}
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Temperature (F)</label>
            <input
              type="number"
              step="0.1"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder="e.g., 38.5"
              className={`w-full rounded-md border px-4 py-3 text-2xl font-bold text-stone-100 bg-stone-800 ${
                isInRange === null
                  ? 'border-stone-700'
                  : isInRange
                    ? 'border-green-500'
                    : 'border-red-500'
              }`}
            />
            {isInRange === false && (
              <p className="mt-1 text-sm text-red-400 font-medium">
                Out of range! Corrective action required.
              </p>
            )}
          </div>

          {/* Corrective Action (appears when out of range) */}
          {isInRange === false && (
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">
                Corrective Action
              </label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                rows={2}
                placeholder="What was done to correct the issue?"
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100"
              />
            </div>
          )}

          {/* Recorded By */}
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Recorded By</label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="Staff name"
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={isPending || !tempValue}
            variant="primary"
            className="w-full"
          >
            {isPending ? 'Recording...' : 'Record Temperature'}
          </Button>
        </CardContent>
      </Card>

      {/* Today's Readings */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <CardTitle className="text-stone-100">
            Readings for {date} ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-stone-500 text-sm">No readings recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const locLabel =
                  log.location === 'custom'
                    ? (log.locationLabel ?? 'Custom')
                    : (TEMPERATURE_LOCATIONS.find((l) => l.id === log.location)?.label ??
                      log.location)

                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      log.isInRange === false
                        ? 'border-red-500/50 bg-red-950/20'
                        : 'border-stone-700 bg-stone-800/50'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-stone-200">{locLabel}</span>
                      {log.recordedBy && (
                        <span className="ml-2 text-xs text-stone-500">by {log.recordedBy}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          log.isInRange === false ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {log.temperatureF}F
                      </span>
                      {log.isInRange === false && (
                        <span className="text-xs text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded">
                          ALERT
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
