// NDA & Photo Permissions Page
// Explains that NDAs and photo permissions are managed per client, not globally.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export const metadata: Metadata = { title: 'NDA & Permissions — ChefFlow' }

export default async function NdaPermissionsPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">NDA &amp; Photo Permissions</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage non-disclosure agreements and content usage rights for your clients.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-900">Per-client settings</p>
              <p className="text-sm text-stone-600">
                NDA status and photo permission settings are managed individually for each client.
                Visit a client&apos;s profile to record whether an NDA is in place and whether you
                have permission to use photos from their events in your portfolio or marketing.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              <span className="font-medium">Why per-client?</span> NDA terms and photo permissions
              vary by client relationship. Some clients require strict confidentiality; others
              actively welcome public attribution. Tracking this per client prevents accidental
              disclosure.
            </p>
          </div>

          <Link
            href="/clients"
            className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Go to Clients →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
