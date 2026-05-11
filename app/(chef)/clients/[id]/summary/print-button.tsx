'use client'

import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      Print / Export
    </Button>
  )
}
