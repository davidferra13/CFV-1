// Production Report Button - Trigger for the production report slide-over panel.
// Disabled when no menu is assigned to the event.

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProductionReportView } from './production-report-view'

type ProductionReportButtonProps = {
  eventId: string
  hasMenu: boolean
}

export function ProductionReportButton({ eventId, hasMenu }: ProductionReportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasMenu}
        onClick={() => setOpen(true)}
        title={hasMenu ? 'View production report' : 'Assign a menu first'}
      >
        Production Report
      </Button>

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 print:static print:z-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 print:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl overflow-y-auto bg-white shadow-xl print:static print:max-w-none print:shadow-none">
            <div className="p-6 print:p-0">
              <ProductionReportView eventId={eventId} onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
