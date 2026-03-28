import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { ReceiptScanClient } from './receipt-scan-client'

export const metadata: Metadata = {
  title: 'Receipt Scanner | ChefFlow',
}

export default async function ReceiptScanPage() {
  await requireChef()
  return <ReceiptScanClient />
}
