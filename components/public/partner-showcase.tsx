// Partner Showcase — Public-facing grid of partner venues
// Shows cover images, descriptions, locations, seasonal galleries, and booking links
'use client'

import { useState } from 'react'
import { ExternalLink, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react'

type Image = {
  id: string
  image_url: string
  caption: string | null
  season: string | null
  display_order: number
  location_id: string | null
}

type Location = {
  id: string
  name: string
  city: string | null
  state: string | null
  booking_url: string | null
  description: string | null
  max_guest_count: number | null
}

type Partner = {
  id: string
  name: string
  partner_type: string
  booking_url: string | null
  description: string | null
  cover_image_url: string | null
  partner_locations: Location[]
  partner_images: Image[]
}

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Hotel & Lodging',
  venue: 'Venue',
  platform: 'Platform',
  individual: 'Partner',
  other: 'Partner',
}

const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
}

export function PartnerShowcase({
  partners,
  chefName,
}: {
  partners: Partner[]
  chefName: string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {partners.map(partner => (
        <PartnerCard key={partner.id} partner={partner} chefName={chefName} />
      ))}
    </div>
  )
}

function PartnerCard({ partner, chefName }: { partner: Partner; chefName: string }) {
  const [expanded, setExpanded] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null)

  const allImages = partner.partner_images || []
  const seasons = [...new Set(allImages.map(img => img.season).filter(Boolean))] as string[]
  const filteredImages = seasonFilter
    ? allImages.filter(img => img.season === seasonFilter)
    : allImages

  const hasLocations = partner.partner_locations.length > 0
  const bookingUrl = partner.booking_url

  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Cover Image */}
      {partner.cover_image_url ? (
        <div className="relative h-56 overflow-hidden">
          <img
            src={partner.cover_image_url}
            alt={partner.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-medium text-stone-700">
              {TYPE_LABELS[partner.partner_type] || 'Partner'}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
          <span className="text-stone-400 text-sm">
            {TYPE_LABELS[partner.partner_type] || 'Partner'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-stone-900">{partner.name}</h3>

        {partner.description && (
          <p className="text-stone-600 mt-2 text-sm leading-relaxed">{partner.description}</p>
        )}

        {/* Locations */}
        {hasLocations && (
          <div className="mt-4 space-y-2">
            {partner.partner_locations.map(loc => {
              const cityState = [loc.city, loc.state].filter(Boolean).join(', ')
              return (
                <div key={loc.id} className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-stone-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-stone-700 font-medium">{loc.name}</span>
                    {cityState && <span className="text-stone-400 ml-1">— {cityState}</span>}
                    {loc.max_guest_count && (
                      <span className="text-stone-400 ml-2 inline-flex items-center gap-0.5">
                        <Users className="h-3 w-3" /> up to {loc.max_guest_count}
                      </span>
                    )}
                    {loc.booking_url && (
                      <a
                        href={loc.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-brand-600 hover:underline inline-flex items-center gap-1"
                      >
                        Book <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Seasonal Gallery Toggle */}
        {allImages.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? 'Hide' : 'View'} Gallery ({allImages.length} photo{allImages.length !== 1 ? 's' : ''})
            </button>

            {expanded && (
              <div className="mt-3">
                {/* Season Filters */}
                {seasons.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <button
                      onClick={() => setSeasonFilter(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        !seasonFilter ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      All
                    </button>
                    {seasons.map(s => (
                      <button
                        key={s}
                        onClick={() => setSeasonFilter(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          seasonFilter === s ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {SEASON_LABELS[s] || s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredImages.map(img => (
                    <div key={img.id} className="relative rounded-lg overflow-hidden aspect-[4/3]">
                      <img
                        src={img.image_url}
                        alt={img.caption || partner.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs">{img.caption}</p>
                        </div>
                      )}
                      {img.season && (
                        <span className="absolute top-2 right-2 text-[10px] bg-white/90 backdrop-blur px-2 py-0.5 rounded-full font-medium">
                          {SEASON_LABELS[img.season] || img.season}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Book This Venue <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <a
            href="/contact"
            className={`inline-flex items-center justify-center px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors ${bookingUrl ? '' : 'flex-1'}`}
          >
            Hire {chefName}
          </a>
        </div>
      </div>
    </div>
  )
}
