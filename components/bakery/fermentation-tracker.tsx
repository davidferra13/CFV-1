'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import {
  startStage,
  endStage,
  logTemperature,
  getActiveStages,
  getRecentLogs,
  getAverageTimes,
  type FermentationLog,
  type FermentationStage,
  type AverageTime,
  STAGE_LABELS,
  STAGE_ORDER,
} from '@/lib/bakery/fermentation-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

function formatElapsed(startTime: string): string {
  const elapsed = Date.now() - new Date(startTime).getTime()
  const totalMinutes = Math.floor(elapsed / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatDuration(startTime: string, endTime: string): string {
  const elapsed = new Date(endTime).getTime() - new Date(startTime).getTime()
  const totalMinutes = Math.floor(elapsed / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function FermentationTracker() {
  const [isPending, startTransition] = useTransition()
  const [activeStages, setActiveStages] = useState<FermentationLog[]>([])
  const [recentLogs, setRecentLogs] = useState<FermentationLog[]>([])
  const [averages, setAverages] = useState<AverageTime[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [averageRecipe, setAverageRecipe] = useState('')
  const [, setTick] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    recipe_name: '',
    batch_id: '',
    stage: 'autolyse' as FermentationStage,
    target_duration_minutes: '',
    temperature_f: '',
    ambient_temp_f: '',
    humidity_percent: '',
    notes: '',
  })

  // Temperature update state
  const [tempInputs, setTempInputs] = useState<Record<string, { temp: string; ambient: string }>>(
    {}
  )

  // Load active stages
  const loadActive = useCallback(async () => {
    try {
      const data = await getActiveStages()
      setActiveStages(data)
      setLoadError(null)
    } catch {
      setLoadError('Could not load active fermentations')
    }
  }, [])

  useEffect(() => {
    loadActive()
  }, [loadActive])

  // Live timer for active stages (tick every 30s)
  useEffect(() => {
    if (activeStages.length > 0) {
      timerRef.current = setInterval(() => {
        setTick((t) => t + 1)
      }, 30000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeStages.length])

  function handleStartStage() {
    startTransition(async () => {
      try {
        if (!formData.recipe_name) {
          toast.error('Recipe name is required')
          return
        }

        const newLog = await startStage({
          recipe_name: formData.recipe_name,
          batch_id: formData.batch_id || undefined,
          stage: formData.stage,
          target_duration_minutes: formData.target_duration_minutes
            ? parseInt(formData.target_duration_minutes, 10)
            : undefined,
          temperature_f: formData.temperature_f ? parseFloat(formData.temperature_f) : undefined,
          ambient_temp_f: formData.ambient_temp_f ? parseFloat(formData.ambient_temp_f) : undefined,
          humidity_percent: formData.humidity_percent
            ? parseInt(formData.humidity_percent, 10)
            : undefined,
          notes: formData.notes || undefined,
        })
        setActiveStages((prev) => [newLog, ...prev])
        setFormData({
          recipe_name: '',
          batch_id: '',
          stage: 'autolyse',
          target_duration_minutes: '',
          temperature_f: '',
          ambient_temp_f: '',
          humidity_percent: '',
          notes: '',
        })
        setShowForm(false)
        toast.success(`Started ${STAGE_LABELS[newLog.stage]}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to start stage')
      }
    })
  }

  function handleEndStage(id: string) {
    const previous = activeStages
    startTransition(async () => {
      try {
        const updated = await endStage(id)
        setActiveStages((prev) => prev.filter((s) => s.id !== id))
        toast.success(`Completed ${STAGE_LABELS[updated.stage]}`)
      } catch (err) {
        setActiveStages(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to end stage')
      }
    })
  }

  function handleLogTemp(id: string) {
    const input = tempInputs[id]
    if (!input?.temp) {
      toast.error('Enter a temperature')
      return
    }
    const previous = activeStages
    startTransition(async () => {
      try {
        const updated = await logTemperature(
          id,
          parseFloat(input.temp),
          input.ambient ? parseFloat(input.ambient) : undefined
        )
        setActiveStages((prev) => prev.map((s) => (s.id === id ? updated : s)))
        setTempInputs((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        toast.success('Temperature logged')
      } catch (err) {
        setActiveStages(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to log temperature')
      }
    })
  }

  async function handleLoadHistory() {
    setShowHistory(!showHistory)
    if (!showHistory) {
      try {
        const data = await getRecentLogs(7)
        setRecentLogs(data.filter((l) => l.end_time !== null))
      } catch {
        toast.error('Could not load history')
      }
    }
  }

  async function handleLoadAverages() {
    if (!averageRecipe.trim()) {
      toast.error('Enter a recipe name')
      return
    }
    try {
      const data = await getAverageTimes(averageRecipe.trim())
      setAverages(data)
    } catch {
      toast.error('Could not load averages')
    }
  }

  // Stage completion timeline for a recipe
  function getCompletedStages(recipeName: string): FermentationStage[] {
    return activeStages
      .filter((s) => s.recipe_name === recipeName && s.end_time !== null)
      .map((s) => s.stage)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fermentation Tracker</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleLoadHistory}>
            {showHistory ? 'Hide History' : 'History'}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Start Fermentation'}
          </Button>
        </div>
      </div>

      {/* Start New Stage Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <h2 className="font-semibold">Start Fermentation Stage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ferm_recipe_name">Recipe Name</Label>
              <Input
                id="ferm_recipe_name"
                value={formData.recipe_name}
                onChange={(e) => setFormData((p) => ({ ...p, recipe_name: e.target.value }))}
                placeholder="e.g., Sourdough Country Loaf"
              />
            </div>
            <div>
              <Label htmlFor="ferm_stage">Stage</Label>
              <select
                id="ferm_stage"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.stage}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    stage: e.target.value as FermentationStage,
                  }))
                }
              >
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ferm_batch_id">Batch ID (optional)</Label>
              <Input
                id="ferm_batch_id"
                value={formData.batch_id}
                onChange={(e) => setFormData((p) => ({ ...p, batch_id: e.target.value }))}
                placeholder="Link to a bakery batch"
              />
            </div>
            <div>
              <Label htmlFor="ferm_target">Target Duration (minutes)</Label>
              <Input
                id="ferm_target"
                type="number"
                min="1"
                value={formData.target_duration_minutes}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    target_duration_minutes: e.target.value,
                  }))
                }
                placeholder="e.g., 240"
              />
            </div>
            <div>
              <Label htmlFor="ferm_temp">Dough Temp (F)</Label>
              <Input
                id="ferm_temp"
                type="number"
                step="0.1"
                value={formData.temperature_f}
                onChange={(e) => setFormData((p) => ({ ...p, temperature_f: e.target.value }))}
                placeholder="e.g., 78"
              />
            </div>
            <div>
              <Label htmlFor="ferm_ambient">Ambient Temp (F)</Label>
              <Input
                id="ferm_ambient"
                type="number"
                step="0.1"
                value={formData.ambient_temp_f}
                onChange={(e) => setFormData((p) => ({ ...p, ambient_temp_f: e.target.value }))}
                placeholder="e.g., 72"
              />
            </div>
            <div>
              <Label htmlFor="ferm_humidity">Humidity %</Label>
              <Input
                id="ferm_humidity"
                type="number"
                min="0"
                max="100"
                value={formData.humidity_percent}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    humidity_percent: e.target.value,
                  }))
                }
                placeholder="e.g., 75"
              />
            </div>
            <div>
              <Label htmlFor="ferm_notes">Notes</Label>
              <Input
                id="ferm_notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Observations, dough feel, etc."
              />
            </div>
          </div>
          <Button onClick={handleStartStage} disabled={isPending}>
            {isPending ? 'Starting...' : 'Start Stage'}
          </Button>
        </div>
      )}

      {/* Active Fermentations */}
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300">
          {loadError}
        </div>
      )}

      {!loadError && activeStages.length === 0 && !showForm && (
        <p className="text-muted-foreground text-center py-8">
          No active fermentations. Start one to begin tracking.
        </p>
      )}

      {activeStages.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Active Fermentations</h2>
          <div className="space-y-3">
            {activeStages.map((log) => {
              const elapsed = formatElapsed(log.start_time)
              const isOverTarget =
                log.target_duration_minutes !== null &&
                (Date.now() - new Date(log.start_time).getTime()) / 60000 >
                  log.target_duration_minutes

              return (
                <div key={log.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{log.recipe_name}</h3>
                        <Badge variant="info">{STAGE_LABELS[log.stage]}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span className={isOverTarget ? 'text-amber-600 font-medium' : ''}>
                          Elapsed: {elapsed}
                          {log.target_duration_minutes !== null && (
                            <> / {log.target_duration_minutes}m target</>
                          )}
                        </span>
                        {log.temperature_f !== null && <span>Dough: {log.temperature_f}F</span>}
                        {log.ambient_temp_f !== null && <span>Ambient: {log.ambient_temp_f}F</span>}
                        {log.humidity_percent !== null && (
                          <span>Humidity: {log.humidity_percent}%</span>
                        )}
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="primary"
                        onClick={() => handleEndStage(log.id)}
                        disabled={isPending}
                      >
                        End Stage
                      </Button>
                    </div>
                  </div>

                  {/* Temperature Update */}
                  <div className="flex items-end gap-2">
                    <div>
                      <Label className="text-xs">Update Temp (F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        className="w-24"
                        value={tempInputs[log.id]?.temp ?? ''}
                        onChange={(e) =>
                          setTempInputs((prev) => ({
                            ...prev,
                            [log.id]: {
                              ...prev[log.id],
                              temp: e.target.value,
                              ambient: prev[log.id]?.ambient ?? '',
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ambient (F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        className="w-24"
                        value={tempInputs[log.id]?.ambient ?? ''}
                        onChange={(e) =>
                          setTempInputs((prev) => ({
                            ...prev,
                            [log.id]: {
                              ...prev[log.id],
                              temp: prev[log.id]?.temp ?? '',
                              ambient: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleLogTemp(log.id)}
                      disabled={isPending}
                    >
                      Log Temp
                    </Button>
                  </div>

                  {/* Stage Timeline */}
                  <div className="flex gap-1 flex-wrap">
                    {STAGE_ORDER.map((s) => {
                      const isCurrent = s === log.stage
                      const completedStages = getCompletedStages(log.recipe_name)
                      const isCompleted = completedStages.includes(s)
                      return (
                        <div
                          key={s}
                          className={`text-xs px-2 py-1 rounded ${
                            isCurrent
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium'
                              : isCompleted
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {STAGE_LABELS[s]}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Average Times Lookup */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Historical Averages</h2>
        <div className="flex gap-2">
          <Input
            value={averageRecipe}
            onChange={(e) => setAverageRecipe(e.target.value)}
            placeholder="Enter recipe name to see avg times"
            className="max-w-sm"
          />
          <Button variant="secondary" onClick={handleLoadAverages}>
            Look Up
          </Button>
        </div>
        {averages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {averages.map((avg) => (
              <div key={avg.stage} className="rounded border p-2 text-center">
                <div className="text-xs text-muted-foreground">{STAGE_LABELS[avg.stage]}</div>
                <div className="text-lg font-semibold">{avg.avg_duration_minutes}m</div>
                <div className="text-xs text-muted-foreground">({avg.count} logs)</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History View */}
      {showHistory && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Recent History (7 days)</h2>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No completed fermentation logs in the last 7 days.
            </p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">{log.recipe_name}</span>
                    <span className="text-muted-foreground ml-2">{STAGE_LABELS[log.stage]}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>
                      {formatDuration(log.start_time, log.end_time!)}
                      {log.target_duration_minutes !== null && (
                        <> (target: {log.target_duration_minutes}m)</>
                      )}
                    </span>
                    {log.temperature_f !== null && <span>{log.temperature_f}F</span>}
                    <span>{new Date(log.start_time).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
