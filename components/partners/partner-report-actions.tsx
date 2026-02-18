// Partner Report Actions — Print and export buttons
'use client'

import { Button } from '@/components/ui/button'

export function PartnerReportActions() {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handlePrint}>Print Report</Button>
    </div>
  )
}
