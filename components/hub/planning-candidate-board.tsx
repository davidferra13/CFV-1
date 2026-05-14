'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, DollarSign, User, StickyNote } from '@/components/ui/icons'
import type { HubGroupCandidate } from '@/lib/hub/types'

interface PlanningCandidateBoardProps {
  candidates: HubGroupCandidate[]
  groupToken: string
  profileToken: string
  onCandidateRemoved?: (candidateId: string) => void
}

export function PlanningCandidateBoard({
  candidates,
  groupToken,
  profileToken,
  onCandidateRemoved,
}: PlanningCandidateBoardProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a2a20] bg-[#1a1412] px-6 py-12 text-center">
        <p className="text-[#b89b85]">
          No options shortlisted yet. Browse chefs and menus to start comparing.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  )
}

function CandidateCard({ candidate }: { candidate: HubGroupCandidate }) {
  const { snapshot } = candidate

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[#3a2a20] bg-[#2a1f1a] transition-all hover:-translate-y-0.5 hover:border-[#4a3a30] hover:shadow-lg hover:shadow-black/20">
      {/* Card image */}
      {snapshot.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden bg-[#1a1412]">
          <Image
            src={snapshot.imageUrl}
            alt={snapshot.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {/* Eyebrow */}
        {snapshot.eyebrow && (
          <span className="mb-1 text-xs font-medium uppercase tracking-wide text-[#e8a96b]">
            {snapshot.eyebrow}
          </span>
        )}

        {/* Title */}
        {snapshot.href ? (
          <Link
            href={snapshot.href}
            className="text-base font-semibold text-[#e8d5c4] transition-colors hover:text-[#e8a96b]"
          >
            {snapshot.title}
          </Link>
        ) : (
          <h3 className="text-base font-semibold text-[#e8d5c4]">{snapshot.title}</h3>
        )}

        {/* Subtitle */}
        {snapshot.subtitle && <p className="mt-0.5 text-sm text-[#b89b85]">{snapshot.subtitle}</p>}

        {/* Location and price */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#b89b85]">
          {snapshot.locationLabel && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#e8a96b]" />
              {snapshot.locationLabel}
            </span>
          )}
          {snapshot.priceLabel && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-[#e8a96b]" />
              {snapshot.priceLabel}
            </span>
          )}
        </div>

        {/* Dietary tags */}
        {snapshot.dietaryTags && snapshot.dietaryTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {snapshot.dietaryTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#1a1412] px-2 py-0.5 text-xs text-[#e8a96b]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Service modes */}
        {snapshot.serviceModes && snapshot.serviceModes.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {snapshot.serviceModes.map((mode) => (
              <span
                key={mode}
                className="rounded-full border border-[#3a2a20] px-2 py-0.5 text-xs text-[#b89b85]"
              >
                {mode}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {candidate.notes && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#1a1412] px-3 py-2">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b89b85]" />
            <p className="text-xs text-[#b89b85]">{candidate.notes}</p>
          </div>
        )}

        {/* Added by */}
        {candidate.added_by?.display_name && (
          <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-[#7a6a5a]">
            <User className="h-3 w-3" />
            <span>Added by {candidate.added_by.display_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
