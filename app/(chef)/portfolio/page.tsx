import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPortfolioPhotos } from '@/lib/events/photo-actions'
import {
  getPortfolio,
  getPublicPortfolioLink,
  getRecentEventsForPortfolio,
} from '@/lib/portfolio/actions'
import { PortfolioPageClient } from './portfolio-page-client'

export const metadata: Metadata = { title: 'Portfolio' }

export default async function PortfolioPage() {
  await requireChef()

  const [photos, portfolioItems, publicLink, events] = await Promise.all([
    getPortfolioPhotos(),
    getPortfolio(),
    getPublicPortfolioLink(),
    getRecentEventsForPortfolio(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Portfolio</h1>
        <p className="text-sm text-stone-400 mt-1">
          Manage your portfolio photos, organize collections, and share publicly.
        </p>
      </div>
      <PortfolioPageClient
        photos={photos}
        portfolioItems={portfolioItems}
        publicLink={publicLink}
        events={events}
      />
    </div>
  )
}
