import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

export const metadata: Metadata = {
  title: 'Book Now',
}

export default async function BookNowPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>
}) {
  const params = await searchParams
  const user = await requireClient()
  const db: any = createServerClient()

  // Look up the chef's name and slug from the client's tenant
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, public_slug')
    .eq('id', user.tenantId!)
    .single()

  const chefData = chef as Record<string, unknown> | null
  const chefName =
    (chefData?.display_name as string) ?? (chefData?.business_name as string) ?? 'Your Chef'
  const chefSlug = (chefData?.public_slug as string) ?? ''

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm
        chefSlug={chefSlug}
        chefName={chefName}
        primaryColor="#1c1917"
        circleId={params.circleId}
      />
    </div>
  )
}
