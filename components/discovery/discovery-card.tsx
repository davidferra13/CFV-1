'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'
import { getDiscoveryImage, type DiscoveryImageRef } from '@/lib/discovery/image-map'
import { DiscoveryCardFeedback } from '@/components/discovery/discovery-card-feedback'
import {
  recognizeSwipeGesture,
  getSwipeTiltTransform,
  triggerHaptic,
} from '@/lib/discovery/swipe-gesture'

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
  onSwipeSave?: () => void
  onSwipeDismiss?: () => void
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

const LANE_SELECT_CLASS: Record<HomepageDiscoveryLane, string> = {
  taste: 'discovery-card-selected-taste',
  occasion: 'discovery-card-selected-occasion',
  chefflow_picks: 'discovery-card-selected-picks',
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
  onSwipeSave,
  onSwipeDismiss,
}: DiscoveryCardProps) {
  const variant = resolveCardVariant(item, lane)
  const imageRef = getDiscoveryImage(item.type, item.label)
  const glowClass = LANE_GLOW_CLASS[lane]
  const selectedClass = isSelected ? LANE_SELECT_CLASS[lane] : ''
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const [swipeTilt, setSwipeTilt] = useState('none')
  const [swipeAction, setSwipeAction] = useState<string | null>(null)

  const swipeClasses = [
    swipeTilt !== 'none' ? 'discovery-card-swiping' : '',
    swipeAction === 'save' ? 'discovery-card-swipe-save' : '',
    swipeAction === 'dismiss' ? 'discovery-card-swipe-dismiss' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link
      href={item.href}
      className={`discovery-card-base ${glowClass} ${selectedClass} ${swipeClasses} group relative block`}
      style={swipeTilt !== 'none' ? { transform: swipeTilt } : undefined}
      onClick={(e) => {
        if (onSelect) {
          e.preventDefault()
          onSelect()
        }
      }}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY, t: Date.now() }
        setSwipeTilt('none')
        setSwipeAction(null)
      }}
      onPointerMove={(e) => {
        if (!pointerStart.current) return
        const dy = e.clientY - pointerStart.current.y
        const dx = e.clientX - pointerStart.current.x
        setSwipeTilt(getSwipeTiltTransform(dy, dx))
      }}
      onPointerUp={(e) => {
        if (!pointerStart.current) return
        const result = recognizeSwipeGesture({
          startX: pointerStart.current.x,
          startY: pointerStart.current.y,
          endX: e.clientX,
          endY: e.clientY,
          startTime: pointerStart.current.t,
          endTime: Date.now(),
        })
        pointerStart.current = null
        setSwipeTilt('none')
        if (result.recognized) {
          triggerHaptic()
          if (result.action === 'save' && onSwipeSave) {
            setSwipeAction('save')
            onSwipeSave()
          } else if (result.action === 'dismiss' && onSwipeDismiss) {
            setSwipeAction('dismiss')
            onSwipeDismiss()
          }
        }
      }}
      onPointerCancel={() => {
        pointerStart.current = null
        setSwipeTilt('none')
      }}
    >
      {variant === 'food_photo' && <FoodPhotoCard item={item} imageRef={imageRef} />}
      {variant === 'abstract' && <AbstractCard item={item} lane={lane} />}
      {variant === 'proof' && <ProofCard item={item} imageRef={imageRef} />}

      <DiscoveryCardFeedback isPinned={isPinned} onLove={onLove} onPin={onPin} onHide={onHide} />
    </Link>
  )
}
