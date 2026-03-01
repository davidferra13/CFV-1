import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

export const metadata: Metadata = {
  title: 'Book Now - ChefFlow',
}

export default async function BookNowPage() {
  const user = await requireClient()
  const supabase = createServerClient()

  // Look up the chef's name and slug from the client's tenant
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, public_slug')
    .eq('id', user.tenantId!)
    .single()

  const chefName = chef?.display_name ?? chef?.business_name ?? 'Your Chef'
  const chefSlug = ((chef as Record<string, unknown>)?.public_slug as string) ?? ''

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm chefSlug={chefSlug} chefName={chefName} primaryColor="#1c1917" />
    </div>
  )
}
