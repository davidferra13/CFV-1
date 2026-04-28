'use client'

import dynamic from 'next/dynamic'

const NearbyMapDiscovery = dynamic(
  () => import('./nearby-map-discovery').then((mod) => mod.NearbyMapDiscovery),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-stone-800 bg-stone-950">
        <p className="text-sm text-stone-500">Loading map discovery...</p>
      </div>
    ),
  }
)

export { NearbyMapDiscovery }
