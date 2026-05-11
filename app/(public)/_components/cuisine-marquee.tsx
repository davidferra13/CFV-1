'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCuisinePageHref } from '@/lib/discovery/cuisine-pages'

// ── Discovery item types ──
// Rail items carry a type field so Agent 2 can route them correctly.
// Four destination patterns:
//   /chefs?cuisine=X        — chef directory by cuisine
//   /chefs?serviceType=X    — chef directory by service type
//   /chefs?dietary=X        — chef directory by dietary preference
//   /eat?intent=X           — consumer intent discovery
//   /eat?eventStyle=X       — consumer event-style discovery
//   /nearby?cuisine=X       — food operator directory by cuisine
//   /nearby?type=X          — food operator directory by business type
//   /ingredients[/category] — seasonal food encyclopedia
//   /chef/{slug}            — featured chef public profile

type DiscoveryItemType =
  | 'cuisine'
  | 'food_type'
  | 'service'
  | 'occasion'
  | 'dietary'
  | 'featured_chef'
  | 'seasonal'
  | 'location'
  // special_dining: controlled public discovery items for curated private dining formats
  | 'special_dining'
  // culinary_signal: timely seasonal ingredient signals derived from the public market pulse.
  // Route: /ingredients (or /ingredients/{category}). Never fake events or non-existent routes.
  | 'culinary_signal'

export interface DiscoveryRailItem {
  type: DiscoveryItemType
  label: string
  href: string
  /** Secondary line shown inside the pill — used for featured_chef items (e.g. "Italian · Miami") */
  sublabel?: string
}

/** Slim featured-chef record passed from the server component. Only the fields the rail needs. */
export interface FeaturedChefRailData {
  slug: string
  displayName: string
  primaryCuisine?: string | null
  city?: string | null
  state?: string | null
}

/** Location context from the homepage search form, shared via HomepageDiscovery wrapper. */
export interface HomepageLocationContext {
  location: string
  lat: number | null
  /** lng for /chefs routes; converted to lon for /nearby routes internally */
  lng: number | null
}

/**
 * Augments a discovery href with location context from the homepage search form.
 * /chefs routes receive location + lat + lng.
 * /nearby routes receive location + lat + lon (note: different param name).
 * /eat routes receive location only.
 * Other routes are returned unchanged.
 */
function buildDiscoveryHref(baseHref: string, ctx: HomepageLocationContext | null): string {
  if (!ctx || !ctx.location.trim()) return baseHref
  const [path, qs] = baseHref.split('?')
  const params = new URLSearchParams(qs ?? '')
  params.set('location', ctx.location.trim())
  if (ctx.lat !== null && ctx.lng !== null) {
    params.set('lat', String(ctx.lat))
    if (path.startsWith('/nearby')) {
      params.set('lon', String(ctx.lng))
    } else {
      params.set('lng', String(ctx.lng))
    }
  }
  return `${path}?${params.toString()}`
}

function cuisineLandingHref(value: string): string {
  return getCuisinePageHref(value) ?? `/chefs?cuisine=${encodeURIComponent(value)}`
}

// ── Row 1: Cuisine pool (100% food/cuisine) ──
// All items route to real canonical cuisine endpoints.
// Items from DISCOVERY_CUISINE_OPTIONS route to /chefs?cuisine=X.
// Items only in CUISINE_CATEGORIES (lib/discover/constants.ts) route to /nearby?cuisine=X.
const CUISINE_POOL: DiscoveryRailItem[] = [
  // Primary discovery cuisines — all in DISCOVERY_CUISINE_OPTIONS → /chefs?cuisine=X
  { type: 'cuisine', label: 'Italian', href: cuisineLandingHref('italian') },
  { type: 'cuisine', label: 'Japanese', href: cuisineLandingHref('japanese') },
  { type: 'cuisine', label: 'Mexican', href: cuisineLandingHref('mexican') },
  { type: 'cuisine', label: 'Thai', href: cuisineLandingHref('thai') },
  { type: 'cuisine', label: 'Mediterranean', href: cuisineLandingHref('mediterranean') },
  { type: 'cuisine', label: 'Indian', href: cuisineLandingHref('indian') },
  { type: 'cuisine', label: 'Korean', href: cuisineLandingHref('korean') },
  { type: 'cuisine', label: 'French', href: cuisineLandingHref('french') },
  { type: 'cuisine', label: 'Chinese', href: cuisineLandingHref('chinese') },
  { type: 'cuisine', label: 'Southern', href: cuisineLandingHref('southern') },
  { type: 'cuisine', label: 'BBQ', href: cuisineLandingHref('barbecue') },
  { type: 'cuisine', label: 'Seafood', href: cuisineLandingHref('seafood') },
  { type: 'cuisine', label: 'Caribbean', href: cuisineLandingHref('caribbean') },
  { type: 'cuisine', label: 'Middle Eastern', href: cuisineLandingHref('middle_eastern') },
  { type: 'cuisine', label: 'Latin', href: cuisineLandingHref('latin_american') },
  { type: 'cuisine', label: 'Vegan', href: cuisineLandingHref('vegan') },
  { type: 'cuisine', label: 'Farm-to-Table', href: cuisineLandingHref('farm_to_table') },
  { type: 'cuisine', label: 'American', href: cuisineLandingHref('american') },
  // Additional food types — in CUISINE_CATEGORIES but not DISCOVERY_CUISINE_OPTIONS → /nearby?cuisine=X
  { type: 'cuisine', label: 'Vietnamese', href: cuisineLandingHref('vietnamese') },
  { type: 'cuisine', label: 'Fusion', href: cuisineLandingHref('fusion') },
  { type: 'food_type', label: 'Bakery & pastry', href: cuisineLandingHref('bakery') },
]

// ── Row 2: Service, occasion, dietary, and seasonal pool ──
// Featured chefs and location items are injected dynamically at runtime (see buildRow2).
// 28 static items covering intent-first occasions, service types, dietary, and food genres.
const SERVICE_POOL: DiscoveryRailItem[] = [
  // Intent-first occasions → /eat?intent=X
  { type: 'occasion', label: 'Dinner tonight', href: '/eat?intent=tonight' },
  { type: 'occasion', label: 'Dinner party', href: '/eat?intent=dinner_party' },
  { type: 'occasion', label: 'Team dinner', href: '/eat?intent=team_dinner' },
  { type: 'occasion', label: 'Work lunch', href: '/eat?intent=work_lunch' },
  { type: 'occasion', label: 'Going out', href: '/eat?intent=going_out' },
  // Event-style occasions → /eat?eventStyle=X
  { type: 'occasion', label: 'Birthday dinner', href: '/eat?eventStyle=Birthday+dinner' },
  { type: 'occasion', label: 'Holiday party', href: '/eat?eventStyle=Holiday+party' },
  { type: 'occasion', label: 'Anniversary dinner', href: '/eat?eventStyle=Anniversary+dinner' },
  { type: 'occasion', label: 'Tasting menu', href: '/eat?eventStyle=Tasting+menu' },
  { type: 'occasion', label: 'Family style', href: '/eat?eventStyle=Family+style' },
  // Chef service types → /chefs?serviceType=X (all from DISCOVERY_SERVICE_TYPE_OPTIONS)
  { type: 'service', label: 'Private dinner', href: '/chefs?serviceType=private_dinner' },
  { type: 'service', label: 'Meal prep', href: '/chefs?serviceType=meal_prep' },
  { type: 'service', label: 'Catering', href: '/chefs?serviceType=catering' },
  { type: 'service', label: 'Cooking class', href: '/chefs?serviceType=cooking_class' },
  { type: 'service', label: 'Wedding chef', href: '/chefs?serviceType=wedding' },
  { type: 'service', label: 'Personal chef', href: '/chefs?serviceType=personal_chef' },
  { type: 'service', label: 'Corporate dining', href: '/chefs?serviceType=corporate' },
  { type: 'service', label: 'Pop-up', href: '/chefs?serviceType=popup' },
  { type: 'service', label: 'Event chef', href: '/chefs?serviceType=event_chef' },
  { type: 'service', label: 'Retreat chef', href: '/chefs?serviceType=retreat' },
  // Food operator business types → /nearby?type=X (from BUSINESS_TYPES)
  { type: 'service', label: 'Supper club', href: '/nearby?type=supper_club' },
  { type: 'service', label: 'Food truck', href: '/nearby?type=food_truck' },
  // Dietary preferences → /chefs?dietary=X
  { type: 'dietary', label: 'Gluten-Free', href: '/chefs?dietary=gluten_free' },
  { type: 'dietary', label: 'Vegetarian', href: '/chefs?dietary=vegetarian' },
  { type: 'dietary', label: 'Keto-friendly', href: '/chefs?dietary=keto' },
  { type: 'dietary', label: 'Paleo', href: '/chefs?dietary=paleo' },
  { type: 'dietary', label: 'Halal', href: '/chefs?dietary=halal' },
  // Seasonal / ingredient discovery → /ingredients
  { type: 'seasonal', label: 'Seasonal menu', href: '/ingredients' },
  // Special dining formats — occasional, low-frequency discovery items
  // Cannabis Dining: 1 item in 29 (~3.4% frequency). Public info page only, not the Cannabis Portal.
  { type: 'special_dining', label: 'Cannabis Dining', href: '/cannabis/public' },
]

/**
 * Builds the final row 2 array, interleaving featured chef, location, and culinary
 * signal items at even intervals among the static service/occasion pool.
 *
 * Rules:
 * - Never two chefs in a row.
 * - Never two location items in a row.
 * - Culinary signals are lowest-priority inserts (appended after chefs + locations).
 * - Insert extras at roughly every INSERT_EVERY static items.
 * - When extras run out, the rest of the static pool fills normally.
 */
function buildRow2(
  staticItems: DiscoveryRailItem[],
  chefItems: DiscoveryRailItem[],
  locationItems: DiscoveryRailItem[],
  signalItems: DiscoveryRailItem[] = []
): DiscoveryRailItem[] {
  if (chefItems.length === 0 && locationItems.length === 0 && signalItems.length === 0)
    return staticItems

  // Alternate chefs and locations, then append signals at lower density.
  // Signals appear at most once per ~8 static items to stay occasional.
  const inserts: DiscoveryRailItem[] = []
  let ci = 0
  let li = 0
  while (ci < chefItems.length || li < locationItems.length) {
    if (ci < chefItems.length) inserts.push(chefItems[ci++])
    if (li < locationItems.length) inserts.push(locationItems[li++])
  }
  // Signals are appended after all chefs and locations
  for (const signal of signalItems) {
    inserts.push(signal)
  }

  // Space inserts evenly across the static pool
  const spacing = Math.max(4, Math.floor(staticItems.length / (inserts.length + 1)))
  const result: DiscoveryRailItem[] = []
  let insertIdx = 0

  for (let i = 0; i < staticItems.length; i++) {
    result.push(staticItems[i])
    if (insertIdx < inserts.length && (i + 1) % spacing === 0) {
      result.push(inserts[insertIdx++])
    }
  }

  // Append any remaining inserts at the end
  while (insertIdx < inserts.length) {
    result.push(inserts[insertIdx++])
  }

  return result
}

/** Converts a FeaturedChefRailData record into a DiscoveryRailItem for the rail. */
function chefToRailItem(chef: FeaturedChefRailData): DiscoveryRailItem {
  const parts: string[] = []
  if (chef.primaryCuisine) {
    // Capitalize first letter
    parts.push(chef.primaryCuisine.charAt(0).toUpperCase() + chef.primaryCuisine.slice(1))
  }
  if (chef.city && chef.state) {
    parts.push(`${chef.city}, ${chef.state}`)
  } else if (chef.city) {
    parts.push(chef.city)
  }
  return {
    type: 'featured_chef',
    label: chef.displayName,
    href: `/chef/${chef.slug}`,
    sublabel: parts.length > 0 ? parts.join(' · ') : undefined,
  }
}

/** Generates location discovery items from the current search context. Returns at most 2 items. */
function buildLocationItems(ctx: HomepageLocationContext | null): DiscoveryRailItem[] {
  if (!ctx || !ctx.location.trim()) return []
  // Extract city name (first segment before comma)
  const city = ctx.location.split(',')[0].trim()
  if (!city) return []
  return [
    {
      type: 'location',
      label: `Chefs in ${city}`,
      href: `/chefs?location=${encodeURIComponent(ctx.location.trim())}`,
    },
    {
      type: 'location',
      label: `Near ${city}`,
      href: `/nearby?location=${encodeURIComponent(ctx.location.trim())}`,
    },
  ]
}

/** px a pointer must move before it counts as drag (not click) */
const DRAG_THRESHOLD = 5
/** ms after last interaction before auto-scroll resumes */
const RESUME_DELAY = 2000

interface CuisineMarqueeProps {
  /** Location context from the homepage search form. When set, cuisine/service/location clicks carry the user's entered location into the destination route. */
  locationContext?: HomepageLocationContext | null
  /** Featured chefs from the server component. Injected into row 2 at spaced intervals. Max ~5 items to avoid dominance. Omit or pass empty array when none available — the rail degrades gracefully. */
  featuredChefs?: FeaturedChefRailData[] | null
  /** Culinary signal items derived from the public seasonal market pulse on the server.
   * These are seasonal ingredient discovery inserts routed to /ingredients.
   * Max 3 items. Appears occasionally in row 2 without dominating the rail. */
  culinarySignals?: DiscoveryRailItem[] | null
}

export function CuisineMarquee({
  locationContext = null,
  featuredChefs = null,
  culinarySignals = null,
}: CuisineMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragState = useRef<{
    active: boolean
    startX: number
    scrollLeft: number
    moved: boolean
  } | null>(null)
  // Preserves the "moved" flag across the pointerup→click event gap.
  // dragState is nulled in onPointerUp (before click fires), so we need
  // a separate ref to know whether the last gesture was a drag.
  const dragMovedRef = useRef(false)

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_DELAY)
  }, [])

  const pauseScroll = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    setPaused(true)
  }, [])

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  // ── Pointer handlers (unified mouse + touch) ──

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (!el) return
      el.setPointerCapture(e.pointerId)
      pauseScroll()
      dragMovedRef.current = false
      dragState.current = {
        active: true,
        startX: e.clientX,
        scrollLeft: el.scrollLeft,
        moved: false,
      }
    },
    [pauseScroll]
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state?.active) return
    const dx = e.clientX - state.startX
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true
      dragMovedRef.current = true
    }
    const el = containerRef.current
    if (el) {
      el.scrollLeft = state.scrollLeft - dx
    }
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (el) el.releasePointerCapture(e.pointerId)
      dragState.current = null
      scheduleResume()
    },
    [scheduleResume]
  )

  // Block navigation when the gesture was a drag, not a tap.
  // dragMovedRef persists across the pointerup→click gap; cleared after use.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const onMouseEnter = useCallback(() => pauseScroll(), [pauseScroll])
  const onMouseLeave = useCallback(() => {
    if (!dragState.current?.active) scheduleResume()
  }, [scheduleResume])

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (!el) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault()
        pauseScroll()
        el.scrollLeft += e.deltaX || e.deltaY
        scheduleResume()
      }
    },
    [pauseScroll, scheduleResume]
  )

  // ── Auto-scroll via requestAnimationFrame ──
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const pausedRef = useRef(paused)
  const SPEED = 1.2

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const tick = (time: number) => {
      if (!pausedRef.current && el) {
        if (lastTimeRef.current) {
          const dt = time - lastTimeRef.current
          el.scrollLeft += SPEED * (dt / 16.67)
          const halfWidth = el.scrollWidth / 2
          if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
            el.scrollLeft -= halfWidth
          }
        }
        lastTimeRef.current = time
      } else {
        lastTimeRef.current = 0
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Duplicate each row for seamless looping.
  // Row 2 is built dynamically: static service pool + featured chefs + location items.
  const row1 = useMemo(() => [...CUISINE_POOL, ...CUISINE_POOL], [])

  const row2 = useMemo(() => {
    const chefItems = (featuredChefs ?? [])
      .filter((c) => c.slug && c.displayName)
      .slice(0, 5)
      .map(chefToRailItem)

    const locationItems = buildLocationItems(locationContext)
    const signalItems = (culinarySignals ?? []).slice(0, 3)
    const base = buildRow2(SERVICE_POOL, chefItems, locationItems, signalItems)
    return [...base, ...base]
  }, [culinarySignals, featuredChefs, locationContext])

  return (
    <div
      ref={containerRef}
      className="cuisine-marquee-container relative mt-8 cursor-grab overflow-x-auto py-2 active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      role="navigation"
      aria-label="Browse by cuisine, service, or occasion"
    >
      <div className="flex w-max flex-col gap-2">
        {/* Row 1: Cuisines and food types */}
        <div className="flex gap-2">
          {row1.map((item, i) => (
            <Link
              key={`r1-${item.label}-${i}`}
              href={buildDiscoveryHref(item.href, locationContext)}
              draggable={false}
              className="discovery-pill inline-flex shrink-0 items-center rounded-full border border-[#5c3520]/50 bg-[#1e0f08]/60 px-4 py-1.5 text-[13px] font-medium tracking-wide text-[#c4956a] backdrop-blur-sm transition-colors hover:border-[#8b5e3c]/70 hover:bg-[#2a1610]/80 hover:text-[#e8a96b]"
            >
              {item.label}
            </Link>
          ))}
        </div>
        {/* Row 2: Occasions, services, dietary, featured chefs (when available), location (when context present) */}
        <div className="flex gap-2 pl-12">
          {row2.map((item, i) => (
            <Link
              key={`r2-${item.label}-${i}`}
              href={buildDiscoveryHref(
                item.href,
                item.type === 'featured_chef' || item.type === 'special_dining'
                  ? null
                  : locationContext
              )}
              draggable={false}
              className="discovery-pill inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#5c3520]/50 bg-[#1e0f08]/60 px-4 py-1.5 text-[13px] font-medium tracking-wide text-[#c4956a] backdrop-blur-sm transition-colors hover:border-[#8b5e3c]/70 hover:bg-[#2a1610]/80 hover:text-[#e8a96b]"
            >
              {item.label}
              {item.sublabel && (
                <span className="text-[11px] font-normal opacity-60">· {item.sublabel}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
