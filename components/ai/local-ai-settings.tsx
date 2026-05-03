'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  saveLocalAiPreferences,
  markLocalAiVerified,
  type LocalAiPreferences,
} from '@/lib/ai/privacy-actions'
import {
  resolveEffectiveOllamaUrl,
  detectBestProvider,
  AICORE_BRIDGE_PORT,
} from '@/lib/ai/local-ai-provider'

type SetupStep = 'off' | 'get-app' | 'detecting' | 'ready' | 'advanced'
type ConnectionStatus = 'untested' | 'testing' | 'connected' | 'unreachable'
type DeviceType = 'phone' | 'desktop'

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'phone' : 'desktop'
}

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
  const [step, setStep] = useState<SetupStep>(prefs.enabled && prefs.verifiedAt ? 'ready' : 'off')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    prefs.verifiedAt ? 'connected' : 'untested'
  )
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState(prefs.url)
  const [model, setModel] = useState(prefs.model)
  const [device] = useState<DeviceType>(detectDevice)

  // Auto-detect local AI: AICore bridge (Android) -> configured Ollama -> fail
  const autoDetect = useCallback(async () => {
    setStep('detecting')
    setConnectionStatus('testing')

    try {
      const provider = await detectBestProvider(url)

      if (!provider) {
        setConnectionStatus('unreachable')
        setStep('get-app')
        return
      }

      // Connected and model available
      setConnectionStatus('connected')
      setSaving(true)
      await saveLocalAiPreferences({ enabled: true, url, model })
      await markLocalAiVerified()
      setPrefs((p) => ({ ...p, enabled: true, verifiedAt: new Date().toISOString() }))
      setSaving(false)
      setStep('ready')
      toast.success('Private AI is active. Remy now runs on your device.')
    } catch {
      setConnectionStatus('unreachable')
      setStep('get-app')
    }
  }, [url, model])

  // When toggling off
  const handleDisable = useCallback(async () => {
    setSaving(true)
    await saveLocalAiPreferences({ enabled: false })
    setPrefs((p) => ({ ...p, enabled: false }))
    setStep('off')
    setConnectionStatus('untested')
    setSaving(false)
  }, [])

  const handleSaveAdvanced = useCallback(async () => {
    setSaving(true)
    const result = await saveLocalAiPreferences({ url, model })
    if (result.success) {
      setPrefs((p) => ({ ...p, url, model }))
      setConnectionStatus('untested')
      toast.success('Settings saved. Testing connection...')
      setSaving(false)
      autoDetect()
    } else {
      setSaving(false)
    }
  }, [url, model, autoDetect])

  const statusBadge = {
    untested: { color: 'bg-stone-700 text-stone-400', label: 'Not set up' },
    testing: { color: 'bg-blue-900 text-blue-400', label: 'Detecting...' },
    connected: { color: 'bg-emerald-900 text-emerald-400', label: 'Active' },
    unreachable: { color: 'bg-red-900 text-red-400', label: 'Not found' },
  }[connectionStatus]

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900">
      <button
        type="button"
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-100">Private AI</p>
            <p className="text-xs text-stone-500">
              Run Gemma 4 on your own device. Completely private.
            </p>
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
          {/* ── Step: OFF ── */}
          {step === 'off' && (
            <>
              <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 text-xs text-stone-300 space-y-2">
                <p className="text-sm font-medium text-stone-100">What is Private AI?</p>
                <p>
                  Gemma 4 is a free AI model by Google that runs entirely on your device. When you
                  enable this, Remy processes your conversations locally. Nothing leaves your{' '}
                  {device === 'phone' ? 'phone' : 'computer'}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep('get-app')}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Set up Private AI
              </button>
            </>
          )}

          {/* ── Step: GET APP ── */}
          {step === 'get-app' && (
            <>
              {device === 'phone' ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-stone-100">
                    Step 1: Get Ollama on your phone
                  </p>
                  <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 text-xs text-stone-300 space-y-3">
                    <p>
                      Download the{' '}
                      <span className="font-semibold text-violet-400">Ollama Server</span> app. It
                      runs Gemma 4 on your phone with one tap.
                    </p>
                    <a
                      href="https://github.com/sunshine0523/OllamaServer/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Ollama Server
                    </a>
                    <ol className="list-decimal list-inside space-y-1.5 text-stone-400">
                      <li>Download and install the APK</li>
                      <li>
                        Open the app and tap <span className="text-stone-200">Start</span>
                      </li>
                      <li>
                        Download <span className="text-stone-200">gemma4</span> from the model list
                      </li>
                      <li>Come back here</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-stone-100">
                    Step 1: Get Ollama on your computer
                  </p>
                  <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 text-xs text-stone-300 space-y-3">
                    <p>
                      Download <span className="font-semibold text-violet-400">Ollama</span> and
                      install it. It takes about 2 minutes.
                    </p>
                    <a
                      href="https://ollama.com/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Ollama
                    </a>
                    <ol className="list-decimal list-inside space-y-1.5 text-stone-400">
                      <li>Install and open Ollama</li>
                      <li>
                        It will ask you to download a model. Choose{' '}
                        <span className="text-stone-200">gemma4</span>
                      </li>
                      <li>Come back here</li>
                    </ol>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={autoDetect}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                I have it installed. Connect now.
              </button>

              {connectionStatus === 'unreachable' && (
                <div className="rounded-lg bg-amber-950/50 border border-amber-800 p-4 text-xs text-amber-300 space-y-2">
                  <p className="font-medium">Not detected yet.</p>
                  <p>
                    Make sure{' '}
                    {device === 'phone'
                      ? 'the Ollama Server app is open and running'
                      : 'Ollama is running (look for the llama icon in your system tray)'}
                    . Then try again.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('off')}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                Back
              </button>
            </>
          )}

          {/* ── Step: DETECTING ── */}
          {step === 'detecting' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-sm text-stone-300">Looking for Gemma 4 on your device...</p>
            </div>
          )}

          {/* ── Step: READY ── */}
          {step === 'ready' && (
            <>
              <div className="rounded-lg bg-emerald-950/50 border border-emerald-800 p-4 text-xs text-emerald-300 space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-emerald-200">Private AI is active</p>
                </div>
                <p>
                  Remy conversations are processed by Gemma 4 on your{' '}
                  {device === 'phone' ? 'phone' : 'computer'}. Nothing is sent to external servers.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={autoDetect}
                  disabled={connectionStatus === 'testing'}
                  className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-600 disabled:opacity-50"
                >
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('advanced')}
                  className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-600"
                >
                  Advanced
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={saving}
                  className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-stone-700 disabled:opacity-50"
                >
                  Turn Off
                </button>
              </div>
            </>
          )}

          {/* ── Step: ADVANCED ── */}
          {step === 'advanced' && (
            <>
              <p className="text-xs text-stone-400">
                For custom setups: another computer, Raspberry Pi, or non-default ports.
              </p>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="local-ai-url"
                    className="block text-xs font-medium text-stone-400 mb-1"
                  >
                    Server URL
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAdvanced}
                  disabled={saving}
                  className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  Save & Test
                </button>
                <button
                  type="button"
                  onClick={() => setStep(prefs.enabled ? 'ready' : 'off')}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
