'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup } from '@/components/ui/radio-group'
import { useBrowserAi } from '@/lib/hooks/use-browser-ai'
import { getBrowserAiEngine } from '@/lib/ai/browser/engine'
import type { BrowserAiPreferences } from '@/lib/ai/browser/types'

type ProviderPreference = BrowserAiPreferences['preferredProvider']

const providerOptions = [
  {
    value: 'auto',
    label: 'Auto (recommended)',
    description: 'Use browser AI when available, then fall back to ChefFlow servers.',
  },
  {
    value: 'browser',
    label: 'Browser Only',
    description: 'Prefer local browser inference whenever this device can run it.',
  },
  {
    value: 'server',
    label: 'Server Only',
    description: 'Always use ChefFlow server inference and ignore browser AI capabilities.',
  },
]

function formatAvailability(value: boolean) {
  return value ? 'Available' : 'Unavailable'
}

function CapabilityRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string | null
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-800 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-stone-100">{label}</p>
        {detail ? <p className="mt-1 text-xs text-stone-500">{detail}</p> : null}
      </div>
      <span className="shrink-0 rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs font-medium text-stone-300">
        {value}
      </span>
    </div>
  )
}

export function AiProviderSettings() {
  const { capability, isDetecting, stats } = useBrowserAi()
  const engine = useMemo(() => getBrowserAiEngine(), [])
  const [providerPreference, setProviderPreference] = useState<ProviderPreference>('auto')
  const [allowModelDownload, setAllowModelDownload] = useState(false)

  useEffect(() => {
    const prefs = engine.getPreferences()
    setProviderPreference(prefs.preferredProvider)
    setAllowModelDownload(prefs.allowModelDownload)
    setOllamaUrl(prefs.ollamaUrl ?? '')
    setOllamaModel(prefs.ollamaModel ?? '')
  }, [engine])

  const saveProviderPreference = (value: string) => {
    const next = value as ProviderPreference
    setProviderPreference(next)
    engine.setPreferences({ preferredProvider: next })
  }

  const saveAllowModelDownload = (checked: boolean) => {
    setAllowModelDownload(checked)
    engine.setPreferences({ allowModelDownload: checked })
  }

  const [ollamaUrl, setOllamaUrl] = useState('')
  const [ollamaModel, setOllamaModel] = useState('')
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')

  const saveOllamaUrl = (value: string) => {
    setOllamaUrl(value)
    engine.setPreferences({ ollamaUrl: value || null })
    setOllamaStatus('idle')
  }

  const saveOllamaModel = (value: string) => {
    setOllamaModel(value)
    engine.setPreferences({ ollamaModel: value || null })
  }

  const testOllamaConnection = async () => {
    if (!ollamaUrl.trim()) return
    setOllamaStatus('testing')
    try {
      const { OllamaLocalProvider } = await import('@/lib/ai/local-ai-provider')
      const provider = new OllamaLocalProvider(ollamaUrl)
      const ok = await provider.detect()
      setOllamaStatus(ok ? 'ok' : 'fail')
    } catch {
      setOllamaStatus('fail')
    }
  }

  const webGpuAvailable = capability?.webGpu.available ?? false

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browser AI Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {isDetecting && !capability ? (
            <p className="text-sm text-stone-400">Checking this browser...</p>
          ) : (
            <div className="divide-y divide-stone-800">
              <CapabilityRow
                label="Chrome AI"
                value={formatAvailability(capability?.chromeAi.available ?? false)}
              />
              <CapabilityRow
                label="WebGPU"
                value={formatAvailability(webGpuAvailable)}
                detail={capability?.webGpu.adapterName}
              />
              <CapabilityRow
                label="Device tier"
                value={capability?.deviceTier ?? 'low'}
                detail={
                  capability?.webGpu.canRunWebLlm
                    ? 'This device can run WebLLM models.'
                    : 'WebLLM is not available on this device.'
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            label="Choose how ChefFlow should run AI on this device"
            options={providerOptions}
            value={providerPreference}
            onValueChange={saveProviderPreference}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Download</CardTitle>
        </CardHeader>
        <CardContent>
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              webGpuAvailable
                ? 'cursor-pointer border-stone-700 bg-stone-800/50 hover:border-stone-600'
                : 'cursor-not-allowed border-stone-800 bg-stone-900/50 opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={allowModelDownload}
              disabled={!webGpuAvailable}
              onChange={(event) => saveAllowModelDownload(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-600 focus:ring-brand-500"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-stone-100">
                Allow WebLLM model download (~2-4GB)
              </span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Only relevant when WebGPU is available.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local Ollama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Ollama URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => saveOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="flex-1 rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                />
                <button
                  onClick={testOllamaConnection}
                  disabled={!ollamaUrl.trim() || ollamaStatus === 'testing'}
                  className="shrink-0 rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700 disabled:opacity-40"
                >
                  {ollamaStatus === 'testing' ? 'Testing...' : 'Test'}
                </button>
              </div>
              {ollamaStatus === 'ok' && (
                <p className="mt-1 text-xs text-emerald-400">Connected successfully</p>
              )}
              {ollamaStatus === 'fail' && (
                <p className="mt-1 text-xs text-red-400">
                  Could not connect. Check the URL and make sure Ollama is running.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Model</label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => saveOllamaModel(e.target.value)}
                placeholder="gemma4"
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
              <p className="mt-1 text-xs text-stone-500">
                The model name as shown by <code className="text-stone-400">ollama list</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inference Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                Total inferences
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">{stats.totalInferences}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                Total tokens
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">{stats.totalTokens}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                Avg latency
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">{stats.avgLatencyMs}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-stone-400">
            When browser AI is active, your messages are processed entirely in your browser. Nothing
            is sent to any server.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
