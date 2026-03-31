import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPortfolioPhotos } from '@/lib/events/photo-actions'
import { PortfolioGallery } from '@/components/photos/portfolio-gallery'

export const metadata: Metadata = { title: 'Portfolio' }

export default async function PortfolioPage() {
  await requireChef()
  const photos = await getPortfolioPhotos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Portfolio</h1>
        <p className="text-sm text-stone-400 mt-1">
          All your event photos in one place. Upload photos from individual event pages.
        </p>
      </div>
      <PortfolioGallery photos={photos} />
    </div>
  )
}
