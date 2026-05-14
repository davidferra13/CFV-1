import { requireVendor } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'

export const metadata = { title: 'Profile' }

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-stone-400">{label}</span>
      <span className="text-sm text-stone-200">{value}</span>
    </div>
  )
}

export default async function VendorProfilePage() {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, user.vendorId)).limit(1)

  if (!vendor) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center">
        <p className="text-stone-400">Vendor profile not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">{vendor.name}</h1>
        <p className="text-sm text-stone-400 mt-1">Your business profile</p>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900 p-6 space-y-4">
        <InfoRow label="Business Name" value={vendor.name} />
        <InfoRow label="Type" value={vendor.vendorType} />
        <InfoRow label="Contact Name" value={vendor.contactName} />
        <InfoRow label="Email" value={vendor.email} />
        <InfoRow label="Phone" value={vendor.phone} />
        <InfoRow label="Address" value={vendor.address} />
        <InfoRow label="Website" value={vendor.website} />
        {vendor.notes && <InfoRow label="Notes" value={vendor.notes} />}
      </div>
    </div>
  )
}
