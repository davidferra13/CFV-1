// Vendor / Supplier Directory
// Chef manages their roster of grocery stores, farms, purveyors, etc.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listVendors } from '@/lib/vendors/actions'
import { VENDOR_TYPE_LABELS } from '@/lib/vendors/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VendorDirectoryClient } from './vendor-directory-client'

export const metadata: Metadata = { title: 'Vendors — ChefFlow' }

export default async function VendorsPage() {
  await requireChef()
  const vendors = await listVendors()

  const preferred = vendors.filter((v: any) => v.is_preferred)
  const rest      = vendors.filter((v: any) => !v.is_preferred)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Vendor Directory</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your go-to suppliers for groceries, specialty ingredients, equipment, and more.
        </p>
      </div>

      <VendorDirectoryClient initialVendors={vendors} />
    </div>
  )
}
