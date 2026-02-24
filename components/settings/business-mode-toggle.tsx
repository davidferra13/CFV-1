'use client'

import { useState, useTransition } from 'react'
import { setBusinessMode } from '@/lib/chef/actions'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BusinessModeToggleProps {
  isBusinessMode: boolean
  businessLegalName: string | null
  businessAddress: string | null
}

export function BusinessModeToggle({
  isBusinessMode,
  businessLegalName,
  businessAddress,
}: BusinessModeToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localEnabled, setLocalEnabled] = useState(isBusinessMode)

  function handleToggle() {
    const next = !localEnabled
    setLocalEnabled(next)
    setError(null)

    startTransition(async () => {
      try {
        await setBusinessMode({ is_business: next })
        router.refresh()
      } catch {
        setLocalEnabled(!next)
        setError('Failed to update business mode. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-lg border border-stone-700 p-4 bg-stone-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-stone-100">Business Mode</p>
            <p className="text-sm text-stone-500 mt-0.5">
              {localEnabled
                ? 'Enabled — business tools are unlocked. Tax workflow, legal name, compliance settings, and invoicing are available.'
                : "Disabled — you're running as an individual chef. Enable to access tax workflow, legal name registration, business address, and compliance tools."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localEnabled}
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
              localEnabled ? 'bg-brand-600' : 'bg-stone-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow ring-0 transition duration-200 ease-in-out ${
                localEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {localEnabled && (
          <div className="mt-4 pt-4 border-t border-stone-800 space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Business Tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href="/finance/tax"
                className="block rounded-md border border-stone-700 px-3 py-2 text-sm hover:bg-stone-800 transition-colors"
              >
                <p className="font-medium text-stone-100">Tax Workflow</p>
                <p className="text-xs text-stone-500">Quarterly estimates, deductions, mileage</p>
              </Link>
              <Link
                href="/settings/compliance"
                className="block rounded-md border border-stone-700 px-3 py-2 text-sm hover:bg-stone-800 transition-colors"
              >
                <p className="font-medium text-stone-100">Compliance</p>
                <p className="text-xs text-stone-500">Licenses, permits, food safety certs</p>
              </Link>
              <Link
                href="/settings/contracts"
                className="block rounded-md border border-stone-700 px-3 py-2 text-sm hover:bg-stone-800 transition-colors"
              >
                <p className="font-medium text-stone-100">Contract Templates</p>
                <p className="text-xs text-stone-500">Service agreements and client contracts</p>
              </Link>
            </div>
            {(businessLegalName || businessAddress) && (
              <div className="mt-2 rounded-md bg-stone-800 px-3 py-2 text-sm text-stone-400">
                {businessLegalName && (
                  <p>
                    <span className="font-medium">Legal name:</span> {businessLegalName}
                  </p>
                )}
                {businessAddress && (
                  <p>
                    <span className="font-medium">Address:</span> {businessAddress}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
