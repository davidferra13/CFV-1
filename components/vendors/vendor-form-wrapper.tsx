'use client'

import { useRouter } from 'next/navigation'
import { VendorForm } from './vendor-form'
import type { VendorCategory } from '@/lib/vendors/types'

type VendorFormWrapperProps = {
  vendor?: {
    id: string
    name: string
    category: string
    contact_name: string | null
    phone: string | null
    email: string | null
    website: string | null
    address: string | null
    notes: string | null
    is_preferred: boolean
    rating: number | null
  }
}

/**
 * Client wrapper for VendorForm used on the vendors list page.
 * Handles post-save refresh without passing callbacks from a Server Component.
 */
export function VendorFormWrapper({ vendor }: VendorFormWrapperProps) {
  const router = useRouter()
  return (
    <VendorForm
      vendor={
        vendor
          ? {
              ...vendor,
              category: vendor.category as VendorCategory,
            }
          : undefined
      }
      onSaved={() => router.refresh()}
    />
  )
}
