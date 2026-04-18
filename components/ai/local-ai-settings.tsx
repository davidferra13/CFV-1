'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getLocalAiPreferences,
  saveLocalAiPreferences,
  markLocalAiVerified,
  type LocalAiPreferences,
} from '@/lib/ai/privacy-actions'

type ConnectionStatus = 'untested' | 'testing' | 'connected' | 'unreachable'

export function LocalAiSettings({ initialPrefs }: { initialPrefs?: LocalAiPreferences | null }) {
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState<LocalAiPreferences>(
    initialPrefs ?? {
      enabled: false,
      url: 'http://localhost:11434',
      model: 'gemma4',
      verifiedAt: null,
    }
  )
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    prefs.verifiedAt ? 'connected' : 'untested'
  )
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState(prefs.url)
  const [model, setModel] = useState(prefs.model)

  const testConnection = useCallback(async () => {
    setConnectionStatus('testing')
    try {
      const res = await fetch(`${url}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        // Verify the configured model is actually available (Q27 fix)
        const data = await res.json()
        const models: Array<{ name: string }> = data?.models ?? []
        const modelNames = models.map((m) => m.name.split(':')[0])
        if (modelNames.length > 0 && !modelNames.includes(model)) {
          setConnectionStatus('unreachable')
          toast.error(
            `Ollama is running but model "${model}" is not installed. Run: ollama pull ${model}`
          )
          return
        }
        setConnectionStatus('connected')
        await markLocalAiVerified()
      } else {
        setConnectionStatus('unreachable')
      }
    } catch {
      setConnectionStatus('unreachable')
    }
  }, [url, model])

  const handleToggle = useCallback(async () => {
    const newEnabled = !prefs.enabled
    setSaving(true)
    const result = await saveLocalAiPreferences({ enabled: newEnabled })
    if (result.success) {
      setPrefs((p) => ({ ...p, enabled: newEnabled }))
    }
    setSaving(false)
  }, [prefs.enabled])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const result = await saveLocalAiPreferences({ url, model })
    if (result.success) {
      setPrefs((p) => ({ ...p, url, model }))
      setConnectionStatus('untested')
    }
    setSaving(false)
  }, [url, model])

  const statusBadge = {
    untested: { color: 'bg-stone-700 text-stone-400', label: 'Not tested' },
    testing: { color: 'bg-blue-900 text-blue-400', label: 'Testing...' },
    connected: { color: 'bg-emerald-900 text-emerald-400', label: 'Connected' },
    unreachable: { color: 'bg-red-900 text-red-400', label: 'Unreachable' },
  }[connectionStatus]

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-900/50 flex items-center justify-center">
            <svg
              className="h-4 w-4 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-100">Local AI (Optional)</p>
            <p className="text-xs text-stone-500">Run Remy on your own computer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prefs.enabled && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-700 px-6 py-5 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-200">Use my own AI</p>
              <p className="text-xs text-stone-500">
                Route Remy conversations to your local Ollama instance
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.enabled ? 'bg-violet-600' : 'bg-stone-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {prefs.enabled && (
            <>
              {/* Explanation */}
              <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 text-xs text-stone-300 space-y-2">
                <p>
                  When enabled, Remy chat messages are sent directly from your browser to your local
                  Ollama instance. Your conversations never touch ChefFlow&apos;s servers.
                </p>
                <p>
                  If your local AI is unreachable, Remy automatically falls back to ChefFlow&apos;s
                  server AI.
                </p>
              </div>

              {/* URL + Model */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="local-ai-url"
                    className="block text-xs font-medium text-stone-400 mb-1"
                  >
                    Ollama URL
                  </label>
                  <input
                    id="local-ai-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div>
                  <label
                    htmlFor="local-ai-model"
                    className="block text-xs font-medium text-stone-400 mb-1"
                  >
                    Model
                  </label>
                  <input
                    id="local-ai-model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    placeholder="gemma4"
                  />
                </div>
              </div>

              {/* Save + Test */}
              <div className="flex items-center gap-3">
                {(url !== prefs.url || model !== prefs.model) && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-600 disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
                <button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.color}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* CORS help for unreachable */}
              {connectionStatus === 'unreachable' && (
                <div className="rounded-lg bg-red-950/50 border border-red-800 p-4 text-xs text-red-300 space-y-2">
                  <p className="font-medium">Connection failed. Common fixes:</p>
                  <ol className="list-decimal list-inside space-y-1 text-red-400">
                    <li>
                      Make sure Ollama is running (
                      <code className="text-red-300">ollama serve</code>)
                    </li>
                    <li>
                      Pull your model (<code className="text-red-300">ollama pull {model}</code>)
                    </li>
                    <li>
                      Enable cross-origin access: set{' '}
                      <code className="text-red-300">OLLAMA_ORIGINS=*</code> environment variable
                      before starting Ollama
                    </li>
                    <li>Check the URL matches your Ollama port (default: 11434)</li>
                  </ol>
                </div>
              )}

              {/* Setup guide */}
              <details className="text-xs text-stone-400">
                <summary className="cursor-pointer hover:text-stone-300">
                  First time setup guide
                </summary>
                <ol className="mt-2 list-decimal list-inside space-y-1.5 text-stone-500">
                  <li>
                    Install Ollama from <span className="text-violet-400">ollama.com</span>
                  </li>
                  <li>
                    Open terminal, run: <code className="text-stone-300">ollama pull gemma4</code>
                  </li>
                  <li>
                    Set environment variable:{' '}
                    <code className="text-stone-300">OLLAMA_ORIGINS=*</code>
                  </li>
                  <li>
                    Restart Ollama: <code className="text-stone-300">ollama serve</code>
                  </li>
                  <li>Come back here and click &ldquo;Test Connection&rdquo;</li>
                </ol>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  )
}
