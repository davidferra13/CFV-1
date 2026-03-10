'use client'

import { useState } from 'react'
import KDSStationView from '@/components/commerce/kds-station-view'
import KDSExpeditorView from '@/components/commerce/kds-expeditor-view'

interface Station {
  id: string
  name: string
}

interface KDSPageClientProps {
  stations: Station[]
}

export default function KDSPageClient({ stations }: KDSPageClientProps) {
  const [selectedStation, setSelectedStation] = useState<string | 'all'>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

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
