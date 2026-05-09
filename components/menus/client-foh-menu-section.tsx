'use client'

import type { FOHMenuData } from '@/lib/menus/foh-menu-data'
import { FrontOfHouseMenu } from './front-of-house-menu'

/**
 * Read-only FOH menu display for the client portal.
 * No customization panel. Includes print and download buttons.
 */
export function ClientFOHMenuSection({ data, eventId }: { data: FOHMenuData; eventId: string }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      {/* Action buttons (hidden in print) */}
      <div className="foh-controls flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 bg-stone-800 text-stone-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Menu
        </button>
        <a
          href={`/api/documents/foh-menu/${eventId}`}
          download
          className="inline-flex items-center gap-2 bg-stone-800 text-stone-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download PDF
        </a>
      </div>

      {/* Menu render (read-only, no controls bar) */}
      <FrontOfHouseMenu data={data} showControls={false} />
    </div>
  )
}
