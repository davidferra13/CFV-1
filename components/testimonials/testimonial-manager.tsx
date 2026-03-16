'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { setTestimonialApproval, setTestimonialFeatured } from '@/lib/testimonials/actions'

type Testimonial = {
  id: string
  event_id: string
  guest_name: string
  testimonial: string
  rating: number | null
  food_rating: number | null
  chef_rating: number | null
  food_highlight: string | null
  would_recommend: boolean | null
  is_approved: boolean
  is_featured: boolean
  created_at: string
}

type Props = {
  initialTestimonials: Testimonial[]
  events: { id: string; occasion: string | null; event_date: string }[]
}

function Stars({ rating, label }: { rating: number | null; label: string }) {
  if (!rating) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-stone-500">{label}:</span>
      <span className="text-amber-400">
        {'★'.repeat(rating)}
        <span className="text-stone-300">{'★'.repeat(5 - rating)}</span>
      </span>
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TestimonialManager({ initialTestimonials, events }: Props) {
  const [testimonials, setTestimonials] = useState(initialTestimonials)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all')
  const [isPending, startTransition] = useTransition()

  const filtered = testimonials.filter((t) => {
    if (filter === 'pending') return !t.is_approved
    if (filter === 'approved') return t.is_approved
    if (filter === 'featured') return t.is_featured
    return true
  })

  const counts = {
    all: testimonials.length,
    pending: testimonials.filter((t) => !t.is_approved).length,
    approved: testimonials.filter((t) => t.is_approved).length,
    featured: testimonials.filter((t) => t.is_featured).length,
  }

  function handleApproval(id: string, approved: boolean) {
    startTransition(async () => {
      try {
        await setTestimonialApproval(id, approved)
        setTestimonials((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_approved: approved } : t))
        )
      } catch {
        // silently fail - user can retry
      }
    })
  }

  function handleFeatured(id: string, featured: boolean) {
    startTransition(async () => {
      try {
        await setTestimonialFeatured(id, featured)
        setTestimonials((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_featured: featured } : t))
        )
      } catch {
        // silently fail
      }
    })
  }

  const eventMap = new Map(events.map((e) => [e.id, e]))

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'featured', label: `Featured (${counts.featured})` },
  ]

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Testimonials list */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500">
            {filter === 'all'
              ? 'No testimonials yet. They will appear here when guests leave reviews on your recap pages.'
              : `No ${filter} testimonials.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const evt = eventMap.get(t.event_id)
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-stone-100">{t.guest_name}</span>
                      {t.is_approved && <Badge variant="success">Approved</Badge>}
                      {t.is_featured && <Badge variant="info">Featured</Badge>}
                      {!t.is_approved && <Badge variant="warning">Pending</Badge>}
                      {t.would_recommend === true && (
                        <Badge variant="default">Would recommend</Badge>
                      )}
                    </div>

                    {/* Event + date */}
                    <p className="text-xs text-stone-400 mb-2">
                      {evt?.occasion || 'Event'} &middot; {formatDate(t.created_at)}
                    </p>

                    {/* Dual ratings */}
                    {(t.food_rating || t.chef_rating) && (
                      <div className="flex gap-4 mb-2">
                        <Stars rating={t.food_rating} label="Food" />
                        <Stars rating={t.chef_rating} label="Chef" />
                      </div>
                    )}

                    {/* Food highlight */}
                    {t.food_highlight && (
                      <p className="text-xs text-brand-600 font-medium mb-1">
                        Favorite: {t.food_highlight}
                      </p>
                    )}

                    {/* Testimonial text */}
                    <p className="text-sm text-stone-300 leading-relaxed">
                      &ldquo;{t.testimonial}&rdquo;
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {t.is_approved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApproval(t.id, false)}
                        disabled={isPending}
                      >
                        Unapprove
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproval(t.id, true)}
                        disabled={isPending}
                      >
                        Approve
                      </Button>
                    )}
                    {t.is_approved && (
                      <Button
                        variant={t.is_featured ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => handleFeatured(t.id, !t.is_featured)}
                        disabled={isPending}
                      >
                        {t.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
