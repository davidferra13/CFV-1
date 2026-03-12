'use client'

import { useState, useTransition } from 'react'
import KDSStationView from '@/components/commerce/kds-station-view'
import KDSExpeditorView from '@/components/commerce/kds-expeditor-view'
import { setKdsPin } from '@/lib/commerce/kds-actions'

interface Station {
  id: string
  name: string
}

interface KDSPageClientProps {
  stations: Station[]
  currentPin: string | null
  tenantId: string
}

export default function KDSPageClient({ stations, currentPin, tenantId }: KDSPageClientProps) {
  const [selectedStation, setSelectedStation] = useState<string | 'all'>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [pinInput, setPinInput] = useState(currentPin ?? '')
  const [pinSaved, setPinSaved] = useState(!!currentPin)
  const [isPinPending, startPinTransition] = useTransition()

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const selectedStationData = stations.find((s) => s.id === selectedStation)

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'}`}>
      {/* Station Selector */}
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mr-4">KDS</h1>

        {/* Station Tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          <button
            onClick={() => setSelectedStation('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
              selectedStation === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            All Stations (Expeditor)
          </button>
          {stations.map((station) => (
            <button
              key={station.id}
              onClick={() => setSelectedStation(station.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                selectedStation === station.id
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {station.name}
            </button>
          ))}
        </div>

        {/* Monitor Link */}
        <button
          onClick={() => setShowPinSetup(!showPinSetup)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation ${
            showPinSetup
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title="Monitor setup"
        >
          Monitor Link
        </button>

        <button
          onClick={toggleFullscreen}
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {isFullscreen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            )}
          </svg>
        </button>
      </div>

      {/* PIN Setup Panel */}
      {showPinSetup && (
        <div className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
          <div className="max-w-lg">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Public KDS Monitor
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              Set a 4-6 digit PIN so kitchen staff can access the KDS on a dedicated monitor without
              logging in.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''))
                  setPinSaved(false)
                }}
                placeholder="4-6 digit PIN"
                className="w-32 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm font-mono tracking-widest"
              />
              <button
                onClick={() => {
                  const pin = pinInput.trim()
                  if (pin && (pin.length < 4 || pin.length > 6)) return
                  startPinTransition(async () => {
                    try {
                      await setKdsPin(pin || null)
                      setPinSaved(true)
                    } catch {}
                  })
                }}
                disabled={isPinPending || pinSaved}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                {isPinPending ? 'Saving...' : pinSaved ? 'Saved' : 'Save PIN'}
              </button>
              {pinInput && (
                <button
                  onClick={() => {
                    setPinInput('')
                    setPinSaved(false)
                    startPinTransition(async () => {
                      try {
                        await setKdsPin(null)
                        setPinSaved(true)
                      } catch {}
                    })
                  }}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove PIN
                </button>
              )}
            </div>
            {pinSaved && pinInput && (
              <div className="mt-3 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                <p className="text-xs text-zinc-500 mb-1">Open this URL on your kitchen monitor:</p>
                <code className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/kds/{tenantId}
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {stations.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-2">
                No kitchen stations configured
              </p>
              <p className="text-sm text-zinc-400">
                Create stations in your Station Clipboard to start using the KDS.
              </p>
            </div>
          </div>
        ) : selectedStation === 'all' ? (
          <KDSExpeditorView />
        ) : (
          <KDSStationView
            stationId={selectedStation}
            stationName={selectedStationData?.name ?? 'Station'}
          />
        )}
      </div>
    </div>
  )
}
