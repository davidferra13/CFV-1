'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function FinancialCockpitError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          Finance
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Financial Cockpit</h1>
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-red-300">
            The private financial cockpit could not load. No financial details were exposed.
          </p>
          <button
            type="button"
            onClick={reset}
            className="min-h-10 rounded-md border border-stone-700 px-4 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
