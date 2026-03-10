// Commerce QR Menu - Generate and manage QR codes that link to your public menu
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveQRCodes, getQRScanStats } from '@/lib/commerce/qr-menu-actions'
import { QRCodeGenerator } from '@/components/commerce/qr-code-generator'

export const metadata: Metadata = {
  title: 'QR Menu | ChefFlow',
}

export default async function QRMenuPage() {
  await requireChef()

  const [codes, stats] = await Promise.all([getActiveQRCodes(), getQRScanStats(30)])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">QR Code Digital Menu</h1>
        <p className="text-stone-500 mt-1">
          Generate QR codes that link to your public menu. Print them for tables, counters, or
          windows. Track scans.
        </p>
      </div>

      <QRCodeGenerator initialCodes={codes} initialStats={stats} />
    </div>
  )
}
