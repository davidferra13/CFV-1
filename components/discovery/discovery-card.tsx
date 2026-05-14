'use client'

import Link from 'next/link'
import { useState } from 'react'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'
import { getDiscoveryImage, type DiscoveryImageRef } from '@/lib/discovery/image-map'
import { DiscoveryCardFeedback } from '@/components/discovery/discovery-card-feedback'

export type DiscoveryCardVariant = 'food_photo' | 'abstract' | 'proof'

const PROOF_TYPES = new Set<DiscoveryRailItem['type']>(['featured_chef'])

export function resolveCardVariant(
  item: Pick<DiscoveryRailItem, 'type'>,
  lane: HomepageDiscoveryLane
): DiscoveryCardVariant {
  if (PROOF_TYPES.has(item.type)) return 'proof'
  if (lane === 'taste') return 'food_photo'
  if (lane === 'occasion') return 'abstract'
  if (lane === 'chefflow_picks') return 'food_photo'
  return 'food_photo'
}

interface DiscoveryCardProps {
  item: DiscoveryRailItem
  lane: HomepageDiscoveryLane
  isPinned?: boolean
  isSelected?: boolean
  onLove?: () => void
  onPin?: () => void
  onHide?: () => void
  onSelect?: () => void
}

function FoodPhotoCard({
  item,
  imageRef,
}: {
  item: DiscoveryRailItem
  imageRef: DiscoveryImageRef
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {!imgError ? (
        <img
          src={imageRef.src}
          alt={imageRef.alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: imageRef.fallbackGradient }} />
      )}
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="font-semibold text-white leading-tight"
          style={{
            fontSize: 'var(--discovery-card-title-size)',
            opacity: 'var(--discovery-text-primary)',
          }}
        >
          {item.label}
        </p>
        {item.sublabel && (
          <p
            className="text-white mt-0.5 leading-tight"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
      </div>
    </>
  )
}

function AbstractCard({ item, lane }: { item: DiscoveryRailItem; lane: HomepageDiscoveryLane }) {
  const gradientClass =
    lane === 'occasion' ? 'discovery-abstract-occasion' : 'discovery-abstract-taste'

  return (
    <div className={`absolute inset-0 ${gradientClass} flex flex-col justify-end p-3`}>
      {item.eyebrow && (
        <p
          className="uppercase tracking-widest text-white mb-1"
          style={{
            fontSize: 'var(--discovery-eyebrow-size)',
            opacity: 'var(--discovery-text-tertiary)',
          }}
        >
          {item.eyebrow}
        </p>
      )}
      <p
        className="font-semibold text-white leading-tight"
        style={{
          fontSize: 'var(--discovery-card-title-size)',
          opacity: 'var(--discovery-text-primary)',
        }}
      >
        {item.label}
      </p>
      {item.sublabel && (
        <p
          className="text-white mt-0.5 leading-tight line-clamp-2"
          style={{
            fontSize: 'var(--discovery-card-sublabel-size)',
            opacity: 'var(--discovery-text-secondary)',
          }}
        >
          {item.sublabel}
        </p>
      )}
    </div>
  )
}

function ProofCard({ item, imageRef }: { item: DiscoveryRailItem; imageRef: DiscoveryImageRef }) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {!imgError ? (
        <img
          src={imageRef.src}
          alt={imageRef.alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 discovery-abstract-picks" />
      )}
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {item.eyebrow && (
          <p
            className="uppercase tracking-widest text-white mb-0.5"
            style={{
              fontSize: 'var(--discovery-eyebrow-size)',
              opacity: 'var(--discovery-text-tertiary)',
            }}
          >
            {item.eyebrow}
          </p>
        )}
        <p
          className="font-semibold text-white leading-tight"
          style={{
            fontSize: 'var(--discovery-card-title-size)',
            opacity: 'var(--discovery-text-primary)',
          }}
        >
          {item.label}
        </p>
        {item.sublabel && (
          <p
            className="text-white mt-0.5 leading-tight"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
      </div>
    </>
  )
}

const LANE_GLOW_CLASS: Record<HomepageDiscoveryLane, string> = {
  taste: 'discovery-card-taste',
  occasion: 'discovery-card-occasion',
  chefflow_picks: 'discovery-card-picks',
}

export function DiscoveryCard({
  item,
  lane,
  isPinned,
  isSelected,
  onLove,
  onPin,
  onHide,
  onSelect,
}: DiscoveryCardProps) {
  const variant = resolveCardVariant(item, lane)
  const imageRef = getDiscoveryImage(item.type, item.label)
  const glowClass = LANE_GLOW_CLASS[lane]
  const selectedBorder = isSelected ? 'ring-2 ring-amber-400/60' : ''

  return (
    <Link
      href={item.href}
      className={`discovery-card-base ${glowClass} ${selectedBorder} group relative block`}
      onClick={(e) => {
        if (onSelect) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {variant === 'food_photo' && <FoodPhotoCard item={item} imageRef={imageRef} />}
      {variant === 'abstract' && <AbstractCard item={item} lane={lane} />}
      {variant === 'proof' && <ProofCard item={item} imageRef={imageRef} />}

      <DiscoveryCardFeedback isPinned={isPinned} onLove={onLove} onPin={onPin} onHide={onHide} />
    </Link>
  )
}
