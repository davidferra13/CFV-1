'use client'

// VarianceAlertSettings - Configure food cost variance alert thresholds.
// Allows chef to set percentage threshold and toggle notifications.

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertTriangle } from '@/components/ui/icons'
import {
  getVarianceAlertSettings,
  updateVarianceAlertSettings,
} from '@/lib/inventory/variance-alert-actions'
import { toast } from 'sonner'

export function VarianceAlertSettings() {
  const [thresholdPct, setThresholdPct] = useState(15)
  const [isEnabled, setIsEnabled] = useState(true)
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, startSave] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const settings = await getVarianceAlertSettings()
        if (cancelled) return
        setThresholdPct(settings.thresholdPct)
        setIsEnabled(settings.isEnabled)
        setNotifyOnComplete(settings.notifyOnEventComplete)
        setLoaded(true)
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleSave() {
    startSave(async () => {
      try {
        await updateVarianceAlertSettings({
          thresholdPct,
          isEnabled,
          notifyOnEventComplete: notifyOnComplete,
        })
        toast.success('Variance alert settings saved')
      } catch {
        toast.error('Failed to save settings')
      }
    })
  }

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">
            <div className="h-4 w-40 bg-stone-700 rounded mx-auto mb-4" />
            <div className="h-24 bg-stone-800 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Variance Alerts
          </CardTitle>
          <Badge variant={isEnabled ? 'success' : 'default'}>
            {isEnabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Get notified when actual food costs exceed your projected costs beyond your threshold.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Enable toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-stone-100">Enable variance alerts</p>
            <p className="text-xs text-stone-500">Monitor food cost overruns on completed events</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? 'bg-emerald-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {/* Threshold */}
        <div className={isEnabled ? '' : 'opacity-50 pointer-events-none'}>
          <label className="block">
            <p className="text-sm font-medium text-stone-100 mb-2">
              Alert threshold: <span className="text-amber-500">{thresholdPct}%</span>
            </p>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>5% (strict)</span>
              <span>50% (lenient)</span>
            </div>
          </label>
          <p className="text-xs text-stone-500 mt-2">
            You will be notified when actual spend exceeds projected cost by more than{' '}
            {thresholdPct}%.
          </p>
        </div>

        {/* Notify on event complete */}
        <label
          className={`flex items-center justify-between cursor-pointer ${
            isEnabled ? '' : 'opacity-50 pointer-events-none'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-stone-100 flex items-center gap-2">
              <Bell className="h-4 w-4 text-stone-400" />
              Notify on event completion
            </p>
            <p className="text-xs text-stone-500">
              Automatically check variance when an event is marked complete
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyOnComplete}
            onClick={() => setNotifyOnComplete(!notifyOnComplete)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifyOnComplete ? 'bg-emerald-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                notifyOnComplete ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
