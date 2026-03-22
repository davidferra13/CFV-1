// New Insurance Claim
// Form to document and file a new insurance claim.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'New Insurance Claim | ChefFlow' }

export default async function NewInsuranceClaimPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/safety/claims" className="text-stone-500 hover:text-stone-300 text-sm">
          Insurance Claims
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-stone-300 text-sm">New Claim</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">File a New Claim</h1>
        <p className="mt-1 text-sm text-stone-500">
          Document the details of your insurance claim. Keep a record of the claim number, insurer,
          and incident date for your records.
        </p>
      </div>

      <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-300">Claim Number</label>
            <input
              type="text"
              placeholder="e.g. CLM-2026-001"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-300">Insurer</label>
            <input
              type="text"
              placeholder="Insurance company name"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-300">Incident Date</label>
            <input
              type="date"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-300">Claim Amount</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-stone-300">Description</label>
          <textarea
            rows={4}
            placeholder="Describe the incident and what is being claimed..."
            className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/safety/claims">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Link href="/safety/claims">
            <Button variant="primary">Save Claim</Button>
          </Link>
        </div>
      </div>

      <p className="text-xs text-stone-600 text-center">
        Full claim management with server actions coming soon. For now, use this form to document
        your claim details and keep a record.
      </p>
    </div>
  )
}
