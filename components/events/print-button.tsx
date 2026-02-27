'use client'

// PrintButton — client component so window.print() can be called from an event handler.
// Extracted from the invoice page (which is a server component) to avoid the RSC
// "functions cannot be passed to Client Component props" error.

import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => window.print()} aria-label="Print page">
      Print
    </Button>
  )
}
