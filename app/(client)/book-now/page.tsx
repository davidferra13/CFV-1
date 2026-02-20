import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

export const metadata: Metadata = {
  title: 'Book Now - ChefFlow',
}

export default async function BookNowPage() {
  await requireClient()

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm chefSlug="" chefName="David Ferragamo" primaryColor="#1c1917" />
    </div>
  )
}
