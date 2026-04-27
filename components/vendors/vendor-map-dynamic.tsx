'use client'

/**
 * Dynamic import wrapper for VendorMap.
 *
 * Leaflet requires window/document, so it must be loaded client-side only.
 * This wrapper uses next/dynamic with ssr: false.
 *
 * DEPENDENCY: requires `leaflet` and `react-leaflet` packages.
 * Install with: npm install leaflet react-leaflet @types/leaflet
 */

import dynamic from 'next/dynamic'

const VendorMap = dynamic(
  () => import('./vendor-map').then((mod) => mod.VendorMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-stone-900 border border-stone-700 rounded-lg flex items-center justify-center"
        style={{ height: '480px' }}
      >
        <p className="text-sm text-stone-500">Loading map...</p>
      </div>
    ),
  }
)

export { VendorMap as VendorMapDynamic }
