'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCuisinePageHref } from '@/lib/discovery/cuisine-pages'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import { trackDiscoveryClick } from '@/lib/discovery/track-discovery-click'
import type { LucideIcon } from '@/components/ui/icons'
import {
  Avocado,
  BowlFood,
  Bread,
  Cake,
  Campfire,
  Carrot,
  Champagne,
  ChefHat,
  Cheers,
  Coffee,
  ConciergeBell,
  Cookie,
  CookingPot,
  Cow,
  Crown,
  Egg,
  Fish,
  FishSimple,
  Flame,
  GraduationCap,
  Grains,
  Hamburger,
  Knife,
  Leaf,
  MapPin,
  PartyPopper,
  Pepper,
  Pizza,
  Plant,
  Search,
  Shrimp,
  Soup,
  Sparkles,
  Stack,
  Store,
  UsersFour,
  Utensils,
  Wine,
} from '@/components/ui/icons'

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
  | 'craving'
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

export type DiscoveryIconKey =
  | 'avocado'
  | 'bbq'
  | 'bowl'
  | 'bread'
  | 'brunch'
  | 'burger'
  | 'cake'
  | 'carrot'
  | 'champagne'
  | 'chef'
  | 'cheers'
  | 'coffee'
  | 'concierge'
  | 'confetti'
  | 'comfort'
  | 'cookie'
  | 'crown'
  | 'dining'
  | 'dumpling'
  | 'egg'
  | 'family'
  | 'fish'
  | 'flame'
  | 'graduation'
  | 'grains'
  | 'leaf'
  | 'location'
  | 'market'
  | 'noodles'
  | 'pasta'
  | 'pepper'
  | 'pizza'
  | 'plant'
  | 'ramen'
  | 'salad'
  | 'sandwich'
  | 'search'
  | 'seafood'
  | 'small_plates'
  | 'spark'
  | 'stack'
  | 'steak'
  | 'sushi'
  | 'taco'
  | 'utensils'
  | 'wine'

export interface DiscoveryRailItem {
  type: DiscoveryItemType
  label: string
  href: string
  icon?: DiscoveryIconKey
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

function nearbySearchHref(query: string): string {
  return `/nearby?q=${encodeURIComponent(query)}`
}

function eatCravingHref(craving: string): string {
  return `/eat?craving=${encodeURIComponent(craving)}`
}

const DISCOVERY_ICON_MAP: Record<DiscoveryIconKey, LucideIcon> = {
  avocado: Avocado,
  bbq: Campfire,
  bowl: BowlFood,
  bread: Bread,
  brunch: Egg,
  burger: Hamburger,
  cake: Cake,
  carrot: Carrot,
  champagne: Champagne,
  chef: ChefHat,
  cheers: Cheers,
  coffee: Coffee,
  concierge: ConciergeBell,
  confetti: PartyPopper,
  comfort: CookingPot,
  cookie: Cookie,
  crown: Crown,
  dining: Utensils,
  dumpling: BowlFood,
  egg: Egg,
  family: UsersFour,
  fish: Fish,
  flame: Flame,
  graduation: GraduationCap,
  grains: Grains,
  leaf: Leaf,
  location: MapPin,
  market: Store,
  noodles: Soup,
  pasta: Grains,
  pepper: Pepper,
  pizza: Pizza,
  plant: Plant,
  ramen: Soup,
  salad: Leaf,
  sandwich: Bread,
  search: Search,
  seafood: Shrimp,
  small_plates: Utensils,
  spark: Sparkles,
  stack: Stack,
  steak: Cow,
  sushi: FishSimple,
  taco: Pepper,
  utensils: Utensils,
  wine: Wine,
}

const TYPE_FALLBACK_ICONS: Record<DiscoveryItemType, DiscoveryIconKey> = {
  cuisine: 'utensils',
  food_type: 'bowl',
  craving: 'comfort',
  service: 'dining',
  occasion: 'wine',
  dietary: 'leaf',
  featured_chef: 'chef',
  seasonal: 'leaf',
  location: 'location',
  special_dining: 'spark',
  culinary_signal: 'market',
}

function getDiscoveryIcon(item: DiscoveryRailItem): LucideIcon {
  const iconKey = item.icon ?? TYPE_FALLBACK_ICONS[item.type]
  return DISCOVERY_ICON_MAP[iconKey]
}

function getPillStyle(item: DiscoveryRailItem) {
  if (item.type === 'featured_chef') {
    return {
      link: 'border-[#8b5e3c]/55 bg-[#2a160d]/85 text-[#f0c18f] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:border-[#d4945a]/65 hover:bg-[#3a2115]/90 hover:text-[#ffd6a3]',
      icon: 'border-[#d4945a]/25 bg-[#d4945a]/12 text-[#f2b978]',
    }
  }

  if (item.type === 'food_type' || item.type === 'craving') {
    return {
      link: 'border-[#8f4b3b]/55 bg-[#2a1410]/78 text-[#efb49b] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#c7795f]/70 hover:bg-[#361b14]/90 hover:text-[#ffd5c3]',
      icon: 'border-[#c7795f]/22 bg-[#c7795f]/13 text-[#f1a381]',
    }
  }

  if (
    item.type === 'service' ||
    item.type === 'occasion' ||
    item.type === 'special_dining' ||
    item.type === 'location'
  ) {
    return {
      link: 'border-[#68704a]/55 bg-[#18190f]/76 text-[#cfd9a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#9ba663]/68 hover:bg-[#242516]/90 hover:text-[#eef4bd]',
      icon: 'border-[#9ba663]/22 bg-[#9ba663]/13 text-[#d9e38d]',
    }
  }

  if (item.type === 'culinary_signal' || item.type === 'seasonal' || item.type === 'dietary') {
    return {
      link: 'border-[#6d6a3e]/55 bg-[#1f1a0e]/78 text-[#dacb85] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#b0925a]/65 hover:bg-[#2e2213]/90 hover:text-[#f4d89b]',
      icon: 'border-[#b0925a]/20 bg-[#b0925a]/12 text-[#e4c77f]',
    }
  }

  return {
    link: 'border-[#9a6742]/60 bg-[#261409]/80 text-[#f2bd84] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),_0_8px_24px_rgba(0,0,0,0.14)] hover:border-[#d4945a]/75 hover:bg-[#321a0d]/90 hover:text-[#ffe0ad]',
    icon: 'border-[#d4945a]/25 bg-[#d4945a]/15 text-[#f2b978]',
  }
}

// ── Cuisine flag image URLs (flagcdn.com 4K assets) ──
// Keys match the `label` field in CUISINE_POOL exactly.
// Single string = one flag rendered cover.
// String array = flags rendered side-by-side (equal-width panels) — used for Fusion.
const CUISINE_FLAG_URLS: Record<string, string | string[]> = {
  // Country cuisines — direct national flags
  Italian: 'https://flagcdn.com/w2560/it.png',
  Japanese: 'https://flagcdn.com/w2560/jp.png',
  French: 'https://flagcdn.com/w2560/fr.png',
  Korean: 'https://flagcdn.com/w2560/kr.png',
  Thai: 'https://flagcdn.com/w2560/th.png',
  Greek: 'https://flagcdn.com/w2560/gr.png',
  Mexican: 'https://flagcdn.com/w2560/mx.png',
  Indian: 'https://flagcdn.com/w2560/in.png',
  Chinese: 'https://flagcdn.com/w2560/cn.png',
  Vietnamese: 'https://flagcdn.com/w2560/vn.png',
  // Regional cuisines — most iconic/representative flag
  Mediterranean: 'https://flagcdn.com/w2560/gr.png', // Greece
  'Middle Eastern': 'https://flagcdn.com/w2560/sa.png', // Saudi Arabia
  Caribbean: 'https://flagcdn.com/w2560/jm.png', // Jamaica
  Latin: 'https://flagcdn.com/w2560/br.png', // Brazil
  American: 'https://flagcdn.com/w2560/us.png',
  'New American': 'https://flagcdn.com/w2560/us.png',
  Southern: 'https://flagcdn.com/w2560/us.png',
  Seafood: 'https://flagcdn.com/w2560/pt.png', // Portugal
  'Farm-to-Table': 'https://flagcdn.com/w2560/us.png',
  Vegan: 'https://flagcdn.com/w2560/de.png', // Germany
  BBQ: 'https://flagcdn.com/w2560/us.png',
  // Fusion — three equal panels: Asia / Europe / Americas
  Fusion: [
    'https://flagcdn.com/w2560/jp.png', // Japan
    'https://flagcdn.com/w2560/fr.png', // France
    'https://flagcdn.com/w2560/mx.png', // Mexico
  ],
}

/** Returns the flag URL(s) for a cuisine item. Single string or array for multi-flag. Null for non-cuisine. */
function getCuisineFlagUrl(item: DiscoveryRailItem): string | string[] | null {
  if (item.type !== 'cuisine') return null
  return CUISINE_FLAG_URLS[item.label] ?? null
}

// ── Row 1: Cuisine pool (100% food/cuisine) ──
// All items route to real canonical cuisine endpoints.
// Items from DISCOVERY_CUISINE_OPTIONS route to /chefs?cuisine=X.
// Items only in CUISINE_CATEGORIES (lib/discover/constants.ts) route to /nearby?cuisine=X.
const CUISINE_POOL: DiscoveryRailItem[] = [
  // Primary discovery cuisines — all in DISCOVERY_CUISINE_OPTIONS → /chefs?cuisine=X
  { type: 'cuisine', label: 'Italian', href: cuisineLandingHref('italian'), icon: 'pasta' },
  { type: 'cuisine', label: 'Japanese', href: cuisineLandingHref('japanese'), icon: 'sushi' },
  { type: 'cuisine', label: 'Greek', href: cuisineLandingHref('greek'), icon: 'leaf' },
  { type: 'cuisine', label: 'Mexican', href: cuisineLandingHref('mexican'), icon: 'taco' },
  { type: 'cuisine', label: 'Thai', href: cuisineLandingHref('thai'), icon: 'pepper' },
  {
    type: 'cuisine',
    label: 'Mediterranean',
    href: cuisineLandingHref('mediterranean'),
    icon: 'leaf',
  },
  { type: 'cuisine', label: 'Indian', href: cuisineLandingHref('indian'), icon: 'pepper' },
  { type: 'cuisine', label: 'Korean', href: cuisineLandingHref('korean'), icon: 'bowl' },
  { type: 'cuisine', label: 'French', href: cuisineLandingHref('french'), icon: 'wine' },
  { type: 'cuisine', label: 'Chinese', href: cuisineLandingHref('chinese'), icon: 'dumpling' },
  { type: 'cuisine', label: 'Southern', href: cuisineLandingHref('southern'), icon: 'comfort' },
  { type: 'cuisine', label: 'BBQ', href: cuisineLandingHref('barbecue'), icon: 'bbq' },
  { type: 'cuisine', label: 'Seafood', href: cuisineLandingHref('seafood'), icon: 'seafood' },
  { type: 'cuisine', label: 'Caribbean', href: cuisineLandingHref('caribbean'), icon: 'fish' },
  {
    type: 'cuisine',
    label: 'Middle Eastern',
    href: cuisineLandingHref('middle_eastern'),
    icon: 'grains',
  },
  { type: 'cuisine', label: 'Latin', href: cuisineLandingHref('latin_american'), icon: 'avocado' },
  { type: 'cuisine', label: 'Vegan', href: cuisineLandingHref('vegan'), icon: 'plant' },
  {
    type: 'cuisine',
    label: 'Farm-to-Table',
    href: cuisineLandingHref('farm_to_table'),
    icon: 'carrot',
  },
  { type: 'cuisine', label: 'American', href: cuisineLandingHref('american'), icon: 'burger' },
  { type: 'cuisine', label: 'New American', href: cuisineLandingHref('american'), icon: 'burger' },
  // Additional food types — in CUISINE_CATEGORIES but not DISCOVERY_CUISINE_OPTIONS → /nearby?cuisine=X
  { type: 'cuisine', label: 'Vietnamese', href: cuisineLandingHref('vietnamese'), icon: 'noodles' },
  { type: 'cuisine', label: 'Fusion', href: cuisineLandingHref('fusion'), icon: 'spark' },
  {
    type: 'food_type',
    label: 'Bakery & Pastry',
    href: nearbySearchHref('bakery pastry'),
    icon: 'cookie',
  },
  { type: 'food_type', label: 'Pizza', href: nearbySearchHref('pizza'), icon: 'pizza' },
  { type: 'food_type', label: 'Noodles', href: nearbySearchHref('noodles'), icon: 'noodles' },
  { type: 'food_type', label: 'Pasta', href: nearbySearchHref('pasta'), icon: 'pasta' },
  { type: 'food_type', label: 'Sushi', href: nearbySearchHref('sushi'), icon: 'sushi' },
  { type: 'food_type', label: 'Tacos', href: nearbySearchHref('tacos'), icon: 'taco' },
  { type: 'food_type', label: 'Burgers', href: nearbySearchHref('burgers'), icon: 'burger' },
  { type: 'food_type', label: 'Steak', href: nearbySearchHref('steak'), icon: 'steak' },
  { type: 'food_type', label: 'Ramen', href: nearbySearchHref('ramen'), icon: 'ramen' },
  { type: 'food_type', label: 'Dumplings', href: nearbySearchHref('dumplings'), icon: 'dumpling' },
  {
    type: 'food_type',
    label: 'Fried Chicken',
    href: nearbySearchHref('fried chicken'),
    icon: 'flame',
  },
  { type: 'food_type', label: 'Salads', href: nearbySearchHref('salads'), icon: 'salad' },
  {
    type: 'food_type',
    label: 'Sandwiches',
    href: nearbySearchHref('sandwiches'),
    icon: 'sandwich',
  },
  { type: 'food_type', label: 'Desserts', href: nearbySearchHref('desserts'), icon: 'cake' },
  { type: 'craving', label: 'Comfort Food', href: eatCravingHref('comfort food'), icon: 'comfort' },
  {
    type: 'food_type',
    label: 'Small Plates',
    href: nearbySearchHref('small plates'),
    icon: 'small_plates',
  },
  { type: 'food_type', label: 'Vegetarian', href: nearbySearchHref('vegetarian'), icon: 'avocado' },
]

const CRAVING_POOL: DiscoveryRailItem[] = [
  { type: 'food_type', label: 'Pizza', href: nearbySearchHref('pizza'), icon: 'pizza' },
  { type: 'food_type', label: 'Noodles', href: nearbySearchHref('noodles'), icon: 'noodles' },
  { type: 'food_type', label: 'Sushi', href: nearbySearchHref('sushi'), icon: 'sushi' },
  { type: 'food_type', label: 'Tacos', href: nearbySearchHref('tacos'), icon: 'taco' },
  { type: 'food_type', label: 'Burgers', href: nearbySearchHref('burgers'), icon: 'burger' },
  { type: 'food_type', label: 'Pasta', href: nearbySearchHref('pasta'), icon: 'pasta' },
  { type: 'food_type', label: 'Dumplings', href: nearbySearchHref('dumplings'), icon: 'dumpling' },
  { type: 'food_type', label: 'BBQ', href: nearbySearchHref('bbq'), icon: 'bbq' },
  {
    type: 'food_type',
    label: 'Fried Chicken',
    href: nearbySearchHref('fried chicken'),
    icon: 'flame',
  },
  { type: 'food_type', label: 'Steak', href: nearbySearchHref('steak'), icon: 'steak' },
  { type: 'food_type', label: 'Brunch', href: nearbySearchHref('brunch'), icon: 'brunch' },
  { type: 'food_type', label: 'Dessert', href: nearbySearchHref('dessert'), icon: 'cake' },
  { type: 'food_type', label: 'Ramen', href: nearbySearchHref('ramen'), icon: 'ramen' },
  {
    type: 'food_type',
    label: 'Small Plates',
    href: nearbySearchHref('small plates'),
    icon: 'small_plates',
  },
  {
    type: 'food_type',
    label: 'Bakery & Pastry',
    href: nearbySearchHref('bakery pastry'),
    icon: 'cookie',
  },
  { type: 'craving', label: 'Comfort Food', href: eatCravingHref('comfort food'), icon: 'comfort' },
  { type: 'food_type', label: 'Seafood', href: nearbySearchHref('seafood'), icon: 'seafood' },
  { type: 'food_type', label: 'Salads', href: nearbySearchHref('salads'), icon: 'salad' },
  {
    type: 'food_type',
    label: 'Sandwiches',
    href: nearbySearchHref('sandwiches'),
    icon: 'sandwich',
  },
  { type: 'food_type', label: 'Vegetarian', href: nearbySearchHref('vegetarian'), icon: 'avocado' },
]

// ── Row 2: Service, occasion, dietary, and seasonal pool ──
// Featured chefs and location items are injected dynamically at runtime (see buildRow2).
// 28 static items covering intent-first occasions, service types, dietary, and food genres.
const SERVICE_POOL: DiscoveryRailItem[] = [
  // Intent-first occasions → /eat?intent=X
  { type: 'occasion', label: 'Dinner tonight', href: '/eat?intent=tonight', icon: 'utensils' },
  { type: 'occasion', label: 'Dinner party', href: '/eat?intent=dinner_party', icon: 'champagne' },
  { type: 'occasion', label: 'Team dinner', href: '/eat?intent=team_dinner', icon: 'cheers' },
  { type: 'occasion', label: 'Work lunch', href: '/eat?intent=work_lunch', icon: 'sandwich' },
  { type: 'occasion', label: 'Going out', href: '/eat?intent=going_out', icon: 'location' },
  // Event-style occasions → /eat?eventStyle=X
  {
    type: 'occasion',
    label: 'Birthday dinner',
    href: '/eat?eventStyle=Birthday+dinner',
    icon: 'cake',
  },
  {
    type: 'occasion',
    label: 'Holiday party',
    href: '/eat?eventStyle=Holiday+party',
    icon: 'confetti',
  },
  {
    type: 'occasion',
    label: 'Anniversary dinner',
    href: '/eat?eventStyle=Anniversary+dinner',
    icon: 'champagne',
  },
  {
    type: 'occasion',
    label: 'Tasting menu',
    href: '/eat?eventStyle=Tasting+menu',
    icon: 'small_plates',
  },
  { type: 'occasion', label: 'Family style', href: '/eat?eventStyle=Family+style', icon: 'family' },
  // Chef service types → /chefs?serviceType=X (all from DISCOVERY_SERVICE_TYPE_OPTIONS)
  {
    type: 'service',
    label: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
    icon: 'crown',
  },
  { type: 'service', label: 'Meal prep', href: '/chefs?serviceType=meal_prep', icon: 'stack' },
  { type: 'service', label: 'Catering', href: '/chefs?serviceType=catering', icon: 'concierge' },
  {
    type: 'service',
    label: 'Cooking class',
    href: '/chefs?serviceType=cooking_class',
    icon: 'graduation',
  },
  { type: 'service', label: 'Wedding chef', href: '/chefs?serviceType=wedding', icon: 'spark' },
  {
    type: 'service',
    label: 'Personal chef',
    href: '/chefs?serviceType=personal_chef',
    icon: 'chef',
  },
  {
    type: 'service',
    label: 'Corporate dining',
    href: '/chefs?serviceType=corporate',
    icon: 'dining',
  },
  { type: 'service', label: 'Pop-up', href: '/chefs?serviceType=popup', icon: 'spark' },
  { type: 'service', label: 'Event chef', href: '/chefs?serviceType=event_chef', icon: 'chef' },
  { type: 'service', label: 'Retreat chef', href: '/chefs?serviceType=retreat', icon: 'leaf' },
  // Food operator business types → /nearby?type=X (from BUSINESS_TYPES)
  { type: 'service', label: 'Supper club', href: '/nearby?type=supper_club', icon: 'cheers' },
  { type: 'service', label: 'Food truck', href: '/nearby?type=food_truck', icon: 'burger' },
  // Dietary preferences → /chefs?dietary=X
  { type: 'dietary', label: 'Gluten-Free', href: '/chefs?dietary=gluten_free', icon: 'grains' },
  { type: 'dietary', label: 'Vegetarian', href: '/chefs?dietary=vegetarian', icon: 'avocado' },
  { type: 'dietary', label: 'Keto-friendly', href: '/chefs?dietary=keto', icon: 'egg' },
  { type: 'dietary', label: 'Paleo', href: '/chefs?dietary=paleo', icon: 'steak' },
  { type: 'dietary', label: 'Halal', href: '/chefs?dietary=halal', icon: 'leaf' },
  // Seasonal / ingredient discovery → /ingredients
  { type: 'seasonal', label: 'Seasonal menu', href: '/ingredients', icon: 'market' },
  { type: 'occasion', label: 'Brunch', href: '/eat?eventStyle=Brunch', icon: 'brunch' },
  { type: 'occasion', label: 'Date night', href: '/eat?eventStyle=Date+night', icon: 'champagne' },
  {
    type: 'service',
    label: 'Farmers market',
    href: nearbySearchHref('farmers market'),
    icon: 'market',
  },
  // Special dining formats — occasional, low-frequency discovery items
  // Cannabis Dining: 1 item in 29 (~3.4% frequency). Public info page only, not the Cannabis Portal.
  {
    type: 'special_dining',
    label: 'Cannabis Dining',
    href: '/cannabis/public',
    icon: 'leaf',
  },
]

const INTENT_POOL: DiscoveryRailItem[] = [
  {
    type: 'service',
    label: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
    icon: 'crown',
  },
  { type: 'occasion', label: 'Date night', href: '/eat?eventStyle=Date+night', icon: 'champagne' },
  {
    type: 'occasion',
    label: 'Birthday dinner',
    href: '/eat?eventStyle=Birthday+dinner',
    icon: 'cake',
  },
  {
    type: 'occasion',
    label: 'Holiday party',
    href: '/eat?eventStyle=Holiday+party',
    icon: 'confetti',
  },
  { type: 'service', label: 'Catering', href: '/chefs?serviceType=catering', icon: 'concierge' },
  { type: 'service', label: 'Meal prep', href: '/chefs?serviceType=meal_prep', icon: 'stack' },
  { type: 'occasion', label: 'Dinner party', href: '/eat?intent=dinner_party', icon: 'champagne' },
  { type: 'occasion', label: 'Family meal', href: '/eat?eventStyle=Family+meal', icon: 'family' },
  { type: 'occasion', label: "Chef's Table", href: '/eat?eventStyle=Chef%27s+Table', icon: 'chef' },
  {
    type: 'occasion',
    label: 'Tasting menu',
    href: '/eat?eventStyle=Tasting+menu',
    icon: 'small_plates',
  },
  {
    type: 'service',
    label: 'Corporate dinner',
    href: '/chefs?serviceType=corporate',
    icon: 'cheers',
  },
  { type: 'occasion', label: 'Farm dinner', href: '/eat?eventStyle=Farm+dinner', icon: 'leaf' },
  { type: 'occasion', label: 'Dinner tonight', href: '/eat?intent=tonight', icon: 'utensils' },
  {
    type: 'occasion',
    label: 'Anniversary dinner',
    href: '/eat?eventStyle=Anniversary+dinner',
    icon: 'champagne',
  },
  {
    type: 'service',
    label: 'Cooking class',
    href: '/chefs?serviceType=cooking_class',
    icon: 'graduation',
  },
  { type: 'service', label: 'Wedding chef', href: '/chefs?serviceType=wedding', icon: 'spark' },
  {
    type: 'service',
    label: 'Personal chef',
    href: '/chefs?serviceType=personal_chef',
    icon: 'chef',
  },
  { type: 'service', label: 'Pop-up', href: '/chefs?serviceType=popup', icon: 'spark' },
  { type: 'service', label: 'Retreat chef', href: '/chefs?serviceType=retreat', icon: 'leaf' },
  { type: 'special_dining', label: 'Cannabis Dining', href: '/cannabis/public', icon: 'leaf' },
]

type DiscoveryRowRole = 'cuisine' | 'craving' | 'intent'

interface DiscoveryRowConfig {
  role: DiscoveryRowRole
  items: DiscoveryRailItem[]
  offsetClassName: string
  ariaLabel: string
}

const ROW_MOTION: Record<
  DiscoveryRowRole,
  { base: number; wave: number; period: number; phase: number; secondaryRatio: number }
> = {
  // cuisine: steady primary discovery — consistent, minimal variation, most reliable
  cuisine: { base: 1.05, wave: 0.05, period: 11500, phase: 0.0, secondaryRatio: 0.52 },
  // craving: lively appetite-driven — more speed variation, shorter wave cycle
  craving: { base: 1.48, wave: 0.26, period: 5400, phase: 2.1, secondaryRatio: 0.37 },
  // intent: calm service-oriented — slow drift, long period, feels intentional
  intent: { base: 0.6, wave: 0.07, period: 18000, phase: 4.7, secondaryRatio: 0.44 },
}

function getRowSpeed(role: DiscoveryRowRole, time: number) {
  const m = ROW_MOTION[role]
  const wave = Math.sin(time / m.period + m.phase) * m.wave
  const secondaryWave = Math.sin(time / (m.period * m.secondaryRatio) + m.phase) * m.wave * 0.35
  return Math.max(0.38, m.base + wave + secondaryWave)
}

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
    icon: 'chef',
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
      icon: 'location',
    },
    {
      type: 'location',
      label: `Near ${city}`,
      href: `/nearby?location=${encodeURIComponent(ctx.location.trim())}`,
      icon: 'market',
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
  /** Authenticated user personalization signals. When present, boosts preferred cuisines and
   * service types to the front of each row. Anonymous users receive the static ordering. */
  userSignals?: UserScrollSignals | null
}

interface DiscoveryPillProps {
  item: DiscoveryRailItem
  locationContext: HomepageLocationContext | null
  blockLocationContext?: boolean
  rowRole: DiscoveryRowRole
}

function DiscoveryPill({
  item,
  locationContext,
  blockLocationContext = false,
  rowRole,
}: DiscoveryPillProps) {
  const flagRaw = getCuisineFlagUrl(item)
  const flagUrls = flagRaw === null ? [] : Array.isArray(flagRaw) ? flagRaw : [flagRaw]
  const hasFlagBg = flagUrls.length > 0
  const Icon = getDiscoveryIcon(item)
  const style = getPillStyle(item)
  const href = buildDiscoveryHref(item.href, blockLocationContext ? null : locationContext)
  const primary = rowRole === 'cuisine'
  // Flag pills show the real flag as a background — no icon badge needed.
  const showIconBadge = !hasFlagBg

  // Build CSS multi-background for single or multi-flag pills.
  const flagBgStyle: React.CSSProperties | undefined = hasFlagBg
    ? flagUrls.length === 1
      ? {
          backgroundImage: `url(${flagUrls[0]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
          // N equal vertical panels side-by-side.
          // backgroundPosition percentage is relative to (container - bgSize), so for N=3:
          // panel 0 → 0%, panel 1 → 50%, panel 2 → 100%.
          backgroundImage: flagUrls.map((u) => `url(${u})`).join(', '),
          backgroundSize: flagUrls
            .map(() => `${(100 / flagUrls.length).toFixed(4)}% 100%`)
            .join(', '),
          backgroundPosition: flagUrls
            .map(
              (_, i) => `${flagUrls.length === 1 ? 0 : (i * 100) / (flagUrls.length - 1)}% center`
            )
            .join(', '),
          backgroundRepeat: 'no-repeat',
        }
    : undefined

  return (
    <Link
      href={href}
      draggable={false}
      style={flagBgStyle}
      className={[
        'discovery-pill group inline-flex shrink-0 items-center rounded-full border font-semibold leading-none tracking-normal transition-all duration-200',
        showIconBadge ? 'gap-2' : 'gap-0',
        primary ? 'min-h-[46px] px-4 py-2.5 text-[14px]' : 'min-h-[40px] px-3.5 py-2 text-[13px]',
        'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0e08] active:translate-y-0',
        hasFlagBg
          ? 'relative overflow-hidden border-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-white/45 hover:text-white'
          : ['backdrop-blur-md', style.link].join(' '),
      ].join(' ')}
      onClick={() => trackDiscoveryClick(item)}
    >
      {/* Dark overlay so text stays legible over any flag */}
      {hasFlagBg && <span className="absolute inset-0 bg-black/52" aria-hidden="true" />}
      {showIconBadge && (
        <span
          className={[
            'grid shrink-0 place-items-center rounded-full border transition-colors',
            primary ? 'h-7 w-7' : 'h-6 w-6',
            style.icon,
          ].join(' ')}
          aria-hidden="true"
        >
          <Icon className={primary ? 'h-4 w-4' : 'h-3.5 w-3.5'} weight="bold" />
        </span>
      )}
      <span className={['whitespace-nowrap', hasFlagBg ? 'relative z-10' : ''].join(' ')}>
        {item.label}
      </span>
      {item.sublabel && (
        <span
          className={[
            'max-w-[9rem] truncate text-[11px] font-medium leading-none opacity-65',
            hasFlagBg ? 'relative z-10' : '',
          ].join(' ')}
        >
          {item.sublabel}
        </span>
      )}
    </Link>
  )
}

export function CuisineMarquee({
  locationContext = null,
  featuredChefs = null,
  culinarySignals = null,
  userSignals = null,
}: CuisineMarqueeProps) {
  const rowRefs = useRef<Record<DiscoveryRowRole, HTMLDivElement | null>>({
    cuisine: null,
    craving: null,
    intent: null,
  })
  const [rowPaused, setRowPaused] = useState<Record<DiscoveryRowRole, boolean>>({
    cuisine: false,
    craving: false,
    intent: false,
  })
  const rowPausedRef = useRef<Record<DiscoveryRowRole, boolean>>({
    cuisine: false,
    craving: false,
    intent: false,
  })
  const resumeTimers = useRef<Record<DiscoveryRowRole, ReturnType<typeof setTimeout> | null>>({
    cuisine: null,
    craving: null,
    intent: null,
  })
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const dragState = useRef<{
    active: boolean
    role: DiscoveryRowRole | null
    el: HTMLDivElement
    startX: number
    scrollLeft: number
    moved: boolean
  } | null>(null)
  // Preserves the "moved" flag across the pointerup→click event gap.
  // dragState is nulled in onPointerUp (before click fires), so we need
  // a separate ref to know whether the last gesture was a drag.
  const dragMovedRef = useRef(false)

  const scheduleResumeRow = useCallback((role: DiscoveryRowRole) => {
    const t = resumeTimers.current[role]
    if (t) clearTimeout(t)
    resumeTimers.current[role] = setTimeout(() => {
      setRowPaused((prev) => ({ ...prev, [role]: false }))
      resumeTimers.current[role] = null
    }, RESUME_DELAY)
  }, [])

  const pauseRow = useCallback((role: DiscoveryRowRole) => {
    const t = resumeTimers.current[role]
    if (t) {
      clearTimeout(t)
      resumeTimers.current[role] = null
    }
    setRowPaused((prev) => (prev[role] ? prev : { ...prev, [role]: true }))
  }, [])

  useEffect(() => {
    return () => {
      ;(['cuisine', 'craving', 'intent'] as DiscoveryRowRole[]).forEach((role) => {
        const t = resumeTimers.current[role]
        if (t) clearTimeout(t)
      })
    }
  }, [])

  useEffect(() => {
    rowPausedRef.current = rowPaused
  }, [rowPaused])

  // ── Pointer handlers (unified mouse + touch) ──

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const role = (el.getAttribute('data-discovery-row') ?? null) as DiscoveryRowRole | null
      el.setPointerCapture(e.pointerId)
      if (role) pauseRow(role)
      dragMovedRef.current = false
      dragState.current = {
        active: true,
        role,
        el,
        startX: e.clientX,
        scrollLeft: el.scrollLeft,
        moved: false,
      }
    },
    [pauseRow]
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state?.active) return
    const dx = e.clientX - state.startX
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true
      dragMovedRef.current = true
    }
    state.el.scrollLeft = state.scrollLeft - dx
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragState.current?.el.hasPointerCapture(e.pointerId)) {
        dragState.current.el.releasePointerCapture(e.pointerId)
      }
      const role = dragState.current?.role ?? null
      dragState.current = null
      if (role) scheduleResumeRow(role)
    },
    [scheduleResumeRow]
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

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (role) pauseRow(role)
    },
    [pauseRow]
  )

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (!role) return
      const isThisRowDragged = dragState.current?.active && dragState.current.role === role
      if (!isThisRowDragged) scheduleResumeRow(role)
    },
    [scheduleResumeRow]
  )

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const role = (el.getAttribute('data-discovery-row') ?? null) as DiscoveryRowRole | null
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault()
        if (role) pauseRow(role)
        el.scrollLeft += e.deltaX || e.deltaY
        if (role) scheduleResumeRow(role)
      }
    },
    [pauseRow, scheduleResumeRow]
  )

  // ── Auto-scroll via requestAnimationFrame ──
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  useEffect(() => {
    if (reducedMotion.current) return

    const tick = (time: number) => {
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 0
      lastTimeRef.current = time
      // Guard against large jumps (tab backgrounded, etc.)
      if (dt > 0 && dt < 200) {
        ;(['cuisine', 'craving', 'intent'] as DiscoveryRowRole[]).forEach((role) => {
          if (rowPausedRef.current[role]) return
          const el = rowRefs.current[role]
          if (!el) return
          el.scrollLeft += getRowSpeed(role, time) * (dt / 16.67)
          const halfWidth = el.scrollWidth / 2
          if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
            el.scrollLeft -= halfWidth
          }
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Duplicate each row for seamless looping.
  // Row 2 is built dynamically: static service pool + featured chefs + location items.
  const row1 = useMemo(() => {
    // Apply user preference boosting: move matched cuisines to front, keep all others after.
    // This is purely an ordering change — no pills are removed.
    let pool = CUISINE_POOL.filter((item) => item.type === 'cuisine')
    if (userSignals?.boostedCuisines.length) {
      const boosted = pool.filter((item) =>
        userSignals.boostedCuisines.some((c) => item.href.includes(c))
      )
      const rest = pool.filter(
        (item) => !userSignals.boostedCuisines.some((c) => item.href.includes(c))
      )
      pool = [...boosted, ...rest]
    }
    return [...pool, ...pool]
  }, [userSignals])

  const row2 = useMemo(() => {
    const pool = [...CRAVING_POOL]
    return [...pool, ...pool]
  }, [])

  const row3 = useMemo(() => {
    let servicePool = [...INTENT_POOL]
    if (userSignals?.boostedServiceTypes.length) {
      const boosted = servicePool.filter((item) =>
        userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      const rest = servicePool.filter(
        (item) => !userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      servicePool = [...boosted, ...rest]
    }
    return [...servicePool, ...servicePool]
  }, [userSignals])

  const rows: DiscoveryRowConfig[] = [
    {
      role: 'cuisine',
      items: row1,
      offsetClassName: 'pl-0',
      ariaLabel: 'Cuisine types',
    },
    {
      role: 'craving',
      items: row2,
      offsetClassName: 'pl-10 sm:pl-14',
      ariaLabel: 'Favorite dishes and cravings',
    },
    {
      role: 'intent',
      items: row3,
      offsetClassName: 'pl-4 sm:pl-24',
      ariaLabel: 'Occasions and service formats',
    },
  ]

  return (
    <div
      className="cuisine-marquee-container relative mt-8 py-2"
      onClickCapture={onClickCapture}
      role="navigation"
      aria-label="Browse by cuisine, cravings, service, or occasion"
    >
      <div className="flex flex-col gap-2">
        {rows.map((row, rowIndex) => (
          <div
            key={row.role}
            ref={(el) => {
              rowRefs.current[row.role] = el
            }}
            className="cuisine-marquee-row cursor-grab overflow-x-auto py-0.5 active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-label={row.ariaLabel}
            data-discovery-row={row.role}
          >
            <div className={['flex w-max gap-2', row.offsetClassName].join(' ')}>
              {row.items.map((item, i) => (
                <DiscoveryPill
                  key={`r${rowIndex + 1}-${item.label}-${i}`}
                  item={item}
                  locationContext={locationContext}
                  rowRole={row.role}
                  blockLocationContext={
                    item.type === 'featured_chef' || item.type === 'special_dining'
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
