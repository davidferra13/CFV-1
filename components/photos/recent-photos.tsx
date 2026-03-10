'use client'

import { useState } from 'react'
import type { EntityPhoto } from '@/lib/photos/photo-actions'
import { PhotoLightbox } from './photo-lightbox'

const ENTITY_TYPE_LABELS: Record<string, string> = {
  event: 'Event',
  recipe: 'Recipe',
  equipment: 'Equipment',
  bakery_order: 'Bakery Order',
  compliance: 'Compliance',
  station: 'Station',
  vendor: 'Vendor',
  menu: 'Menu',
  staff: 'Staff',
  general: 'General',
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  event: 'bg-blue-500/20 text-blue-300',
  recipe: 'bg-green-500/20 text-green-300',
  equipment: 'bg-orange-500/20 text-orange-300',
  bakery_order: 'bg-pink-500/20 text-pink-300',
  compliance: 'bg-red-500/20 text-red-300',
  station: 'bg-purple-500/20 text-purple-300',
  vendor: 'bg-yellow-500/20 text-yellow-300',
  menu: 'bg-teal-500/20 text-teal-300',
  staff: 'bg-indigo-500/20 text-indigo-300',
  general: 'bg-zinc-500/20 text-zinc-300',
}

type Props = {
  photos: EntityPhoto[]
}

export function RecentPhotos({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
        No photos yet. Attach photos to events, recipes, equipment, and more.
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group cursor-pointer overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-colors hover:border-zinc-600"
            onClick={() => setLightboxIndex(index)}
          >
            <div className="relative aspect-square">
              <img
                src={photo.thumbnail_url || photo.url}
                alt={photo.caption || 'Photo'}
                className="h-full w-full object-cover"
              />

              {/* Entity type badge */}
              <span
                className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  ENTITY_TYPE_COLORS[photo.entity_type] || 'bg-zinc-500/20 text-zinc-300'
                }`}
              >
                {ENTITY_TYPE_LABELS[photo.entity_type] || photo.entity_type}
              </span>
            </div>

            <div className="p-2">
              {photo.caption && <p className="text-xs text-zinc-300 truncate">{photo.caption}</p>}
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {new Date(photo.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
