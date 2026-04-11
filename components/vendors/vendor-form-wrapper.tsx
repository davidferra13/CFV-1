'use client'

import { useRouter } from 'next/navigation'
import { VendorForm } from './vendor-form'

/**
 * Client wrapper for VendorForm used on the vendors list page.
 * Handles post-save refresh and cancel no-op without passing callbacks
 * from a Server Component (which Next.js App Router doesn't allow).
 */
export function VendorFormWrapper() {
  const router = useRouter()
  return <VendorForm onSaved={() => router.refresh()} onCancel={() => {}} />
}
