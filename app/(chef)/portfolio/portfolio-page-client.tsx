'use client'

// PortfolioPageClient - Tab navigation for the portfolio page.
// Tabs: Gallery (event photos), Curated (grid editor + categories), Collections, Public Link.

import { useState } from 'react'
import { PortfolioGallery } from '@/components/portfolio/portfolio-gallery'
import { GridEditor } from '@/components/portfolio/grid-editor'
import { CollectionManager } from '@/components/portfolio/collection-manager'
import { PortfolioShare } from '@/components/portfolio/portfolio-share'
import type { PortfolioPhoto } from '@/lib/events/photo-actions'
import type { PortfolioItem } from '@/lib/portfolio/actions'

type Tab = 'gallery' | 'curated' | 'collections' | 'public'

const TABS: { key: Tab; label: string }[] = [
  { key: 'gallery', label: 'Gallery' },
  { key: 'curated', label: 'Curated' },
  { key: 'collections', label: 'Collections' },
  { key: 'public', label: 'Public Link' },
]

interface Props {
  photos: PortfolioPhoto[]
  portfolioItems: PortfolioItem[]
  publicLink: string | null
  events: { id: string; name: string; date: string | null }[]
}

export function PortfolioPageClient({ photos, portfolioItems, publicLink, events }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('gallery')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-700 mb-6">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-stone-100 border-brand-500'
                : 'text-stone-400 border-transparent hover:text-stone-200 hover:border-stone-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'gallery' && <PortfolioGallery initialPhotos={photos} />}

      {activeTab === 'curated' && <GridEditor items={portfolioItems} events={events} />}

      {activeTab === 'collections' && <CollectionManager items={portfolioItems} />}

      {activeTab === 'public' && <PortfolioShare items={portfolioItems} publicLink={publicLink} />}
    </div>
  )
}
