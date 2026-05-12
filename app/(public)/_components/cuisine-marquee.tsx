'use client'

import React from 'react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCuisinePageHref } from '@/lib/discovery/cuisine-pages'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import {
  applyDiscoveryRailScores,
  type DiscoveryRailDebugScore,
} from '@/lib/discovery/discovery-rail-scoring'
import {
  DISCOVERY_RECENTS_STORAGE_KEY,
  trackDiscoveryClick,
  trackDiscoveryInteraction,
  type DiscoveryRecentClick,
} from '@/lib/discovery/track-discovery-click'
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
  Heart,
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
  ThumbsDown,
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
  | 'chef_pick'
  | 'combo'
  | 'story'
  | 'surprise'
  | 'seasonal'
  | 'location'
  | 'mood'
  | 'price'
  | 'time'
  | 'group_size'
  | 'saved'
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
  presentation?: 'pill' | 'story'
  eyebrow?: string
  /** Secondary line shown inside the pill — used for featured_chef items (e.g. "Italian · Miami") */
  sublabel?: string
  /** Dev-only scoring explanation attached by the homepage discovery scorer. */
  debugScore?: DiscoveryRailDebugScore
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
export function buildDiscoveryHref(baseHref: string, ctx: HomepageLocationContext | null): string {
  if (!ctx || !ctx.location.trim()) return baseHref
  const [path, qs] = baseHref.split('?')
  const supportsLocation =
    path.startsWith('/chefs') || path.startsWith('/nearby') || path.startsWith('/eat')
  if (!supportsLocation) return baseHref

  const params = new URLSearchParams(qs ?? '')
  params.set('location', ctx.location.trim())
  if (
    ctx.lat !== null &&
    ctx.lng !== null &&
    (path.startsWith('/chefs') || path.startsWith('/nearby'))
  ) {
    params.set('lat', String(ctx.lat))
    if (path.startsWith('/nearby')) {
      params.set('lon', String(ctx.lng))
    } else if (path.startsWith('/chefs')) {
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
  chef_pick: 'spark',
  combo: 'spark',
  story: 'spark',
  surprise: 'spark',
  seasonal: 'leaf',
  location: 'location',
  mood: 'spark',
  price: 'crown',
  time: 'utensils',
  group_size: 'family',
  saved: 'search',
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

  if (
    item.type === 'food_type' ||
    item.type === 'craving' ||
    item.type === 'mood' ||
    item.type === 'chef_pick' ||
    item.type === 'combo' ||
    item.type === 'story' ||
    item.type === 'surprise'
  ) {
    return {
      link: 'border-[#8f4b3b]/55 bg-[#2a1410]/78 text-[#efb49b] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#c7795f]/70 hover:bg-[#361b14]/90 hover:text-[#ffd5c3]',
      icon: 'border-[#c7795f]/22 bg-[#c7795f]/13 text-[#f1a381]',
    }
  }

  if (
    item.type === 'service' ||
    item.type === 'occasion' ||
    item.type === 'special_dining' ||
    item.type === 'location' ||
    item.type === 'time' ||
    item.type === 'group_size' ||
    item.type === 'saved'
  ) {
    return {
      link: 'border-[#68704a]/55 bg-[#18190f]/76 text-[#cfd9a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#9ba663]/68 hover:bg-[#242516]/90 hover:text-[#eef4bd]',
      icon: 'border-[#9ba663]/22 bg-[#9ba663]/13 text-[#d9e38d]',
    }
  }

  if (
    item.type === 'culinary_signal' ||
    item.type === 'seasonal' ||
    item.type === 'dietary' ||
    item.type === 'price'
  ) {
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
  Italian: 'https://flagcdn.com/w320/it.png',
  Japanese: 'https://flagcdn.com/w320/jp.png',
  French: 'https://flagcdn.com/w320/fr.png',
  Korean: 'https://flagcdn.com/w320/kr.png',
  Thai: 'https://flagcdn.com/w320/th.png',
  Greek: 'https://flagcdn.com/w320/gr.png',
  Mexican: 'https://flagcdn.com/w320/mx.png',
  Indian: 'https://flagcdn.com/w320/in.png',
  Chinese: 'https://flagcdn.com/w320/cn.png',
  Vietnamese: 'https://flagcdn.com/w320/vn.png',
  Lebanese: 'https://flagcdn.com/w320/lb.png',
  Turkish: 'https://flagcdn.com/w320/tr.png',
  Persian: 'https://flagcdn.com/w320/ir.png',
  Egyptian: 'https://flagcdn.com/w320/eg.png',
  // Regional cuisines — most iconic/representative flag
  Mediterranean: 'https://flagcdn.com/w320/gr.png', // Greece
  'Middle Eastern': 'https://flagcdn.com/w320/sa.png', // Saudi Arabia
  Caribbean: 'https://flagcdn.com/w320/jm.png', // Jamaica
  Latin: 'https://flagcdn.com/w320/br.png', // Brazil
  American: 'https://flagcdn.com/w320/us.png',
  'New American': 'https://flagcdn.com/w320/us.png',
  Southern: 'https://flagcdn.com/w320/us.png',
  Seafood: 'https://flagcdn.com/w320/pt.png', // Portugal
  'Farm-to-Table': 'https://flagcdn.com/w320/us.png',
  Vegan: 'https://flagcdn.com/w320/de.png', // Germany
  BBQ: 'https://flagcdn.com/w320/us.png',
  // Fusion — three equal panels: Asia / Europe / Americas
  Fusion: [
    'https://flagcdn.com/w320/jp.png', // Japan
    'https://flagcdn.com/w320/fr.png', // France
    'https://flagcdn.com/w320/mx.png', // Mexico
  ],
}

// ── Food & occasion emoji map ──
// Used on rows 2 & 3 in place of SVG icon badges.
const DISCOVERY_EMOJI_MAP: Record<string, string> = {
  // Dishes / food types
  Pizza: '🍕',
  Noodles: '🍜',
  Sushi: '🍣',
  Tacos: '🌮',
  Burgers: '🍔',
  Pasta: '🍝',
  Dumplings: '🥟',
  BBQ: '🔥',
  'Fried Chicken': '🍗',
  Steak: '🥩',
  Brunch: '🥞',
  Dessert: '🍰',
  Desserts: '🍰',
  Ramen: '🍜',
  'Small Plates': '🫹',
  'Bakery & Pastry': '🥐',
  'Comfort Food': '🍲',
  Seafood: '🦐',
  Salads: '🥗',
  Sandwiches: '🥪',
  Vegetarian: '🥬',
  // Occasions
  'Private dinner': '🕯️',
  'Date night': '🌹',
  'Birthday dinner': '🎂',
  'Holiday party': '🎉',
  Catering: '🍽️',
  'Meal prep': '📦',
  'Dinner party': '🥂',
  'Family meal': '🏡',
  "Chef's Table": '✨',
  'Tasting menu': '✨',
  'Corporate dinner': '🤝',
  'Farm dinner': '🌾',
  'Dinner tonight': '🌙',
  'Anniversary dinner': '💐',
  'Cooking class': '📚',
  'Wedding chef': '💍',
  'Personal chef': '👨‍🍳',
  'Pop-up': '⚡',
  'Retreat chef': '🏕️',
  'Cannabis Dining': '🌿',
  'Team dinner': '🥂',
  'Work lunch': '🍱',
  'Going out': '🗺️',
  'Family style': '👨‍👩‍👧',
  'Supper club': '🕯️',
  'Food truck': '🚚',
  'Gluten-Free': '🌾',
  'Keto-friendly': '🥩',
  Paleo: '🥖',
  Halal: '🌙',
  'Seasonal menu': '🌿',
  'Farmers market': '🛒',
}

/** Returns the flag URL(s) for a cuisine item. Single string or array for multi-flag. Null for non-cuisine. */
function getCuisineFlagUrl(item: DiscoveryRailItem): string | string[] | null {
  if (item.type !== 'cuisine') return null
  return CUISINE_FLAG_URLS[item.label] ?? null
}

// ── Country/region label shown below cuisine name on flag pills ──
const CUISINE_COUNTRY_LABELS: Record<string, string> = {
  Italian: 'Italy',
  Japanese: 'Japan',
  French: 'France',
  Korean: 'Korea',
  Thai: 'Thailand',
  Greek: 'Greece',
  Mexican: 'Mexico',
  Indian: 'India',
  Chinese: 'China',
  Vietnamese: 'Vietnam',
  Lebanese: 'Lebanon',
  Turkish: 'Turkey',
  Persian: 'Iran',
  Egyptian: 'Egypt',
  Mediterranean: 'Greece · Turkey',
  'Middle Eastern': 'Saudi Arabia',
  Caribbean: 'Jamaica',
  Latin: 'Brazil',
  American: 'USA',
  'New American': 'USA',
  Southern: 'USA',
  Seafood: 'Portugal',
  'Farm-to-Table': 'USA',
  Vegan: 'Germany',
  BBQ: 'USA',
  Fusion: 'Asia · Europe · Americas',
}

function getCuisineCountryLabel(item: DiscoveryRailItem): string | null {
  if (item.type !== 'cuisine') return null
  return CUISINE_COUNTRY_LABELS[item.label] ?? null
}

// ── Per-cuisine hover glow colors (HSL) ──
// Used as box-shadow on hover for flag cards.
const CUISINE_GLOW_COLORS: Record<string, string> = {
  Italian: 'rgba(0,140,70,0.55)', // Italian green
  Japanese: 'rgba(188,0,45,0.55)', // Rising sun red
  French: 'rgba(0,85,164,0.55)', // French blue
  Korean: 'rgba(205,10,10,0.50)', // Korean red
  Thai: 'rgba(165,25,46,0.50)', // Thai red
  Greek: 'rgba(13,94,175,0.55)', // Greek blue
  Mexican: 'rgba(0,130,60,0.50)', // Mexican green
  Indian: 'rgba(255,103,31,0.55)', // Indian orange
  Chinese: 'rgba(222,41,16,0.60)', // Chinese red
  Vietnamese: 'rgba(218,37,29,0.55)', // Vietnamese red
  Lebanese: 'rgba(0,122,61,0.50)',
  Turkish: 'rgba(227,10,23,0.55)',
  Persian: 'rgba(35,159,64,0.50)',
  Egyptian: 'rgba(206,17,38,0.50)',
  Mediterranean: 'rgba(13,94,175,0.50)',
  'Middle Eastern': 'rgba(0,130,60,0.45)',
  Caribbean: 'rgba(0,156,0,0.45)', // Jamaican green
  Latin: 'rgba(0,155,58,0.45)', // Brazilian green
  American: 'rgba(60,59,110,0.50)', // US navy blue
  'New American': 'rgba(60,59,110,0.50)',
  Southern: 'rgba(60,59,110,0.45)',
  Seafood: 'rgba(0,100,168,0.45)', // Portuguese blue
  'Farm-to-Table': 'rgba(60,59,110,0.40)',
  Vegan: 'rgba(0,0,0,0.40)', // German black
  BBQ: 'rgba(60,59,110,0.40)',
  Fusion: 'rgba(188,0,45,0.40)', // Mix — JP red
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
  { type: 'cuisine', label: 'Lebanese', href: cuisineLandingHref('lebanese'), icon: 'grains' },
  { type: 'cuisine', label: 'Turkish', href: cuisineLandingHref('turkish'), icon: 'grains' },
  { type: 'cuisine', label: 'Persian', href: cuisineLandingHref('persian'), icon: 'grains' },
  { type: 'cuisine', label: 'Egyptian', href: cuisineLandingHref('egyptian'), icon: 'grains' },
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
  { type: 'food_type', label: 'Pho', href: nearbySearchHref('pho'), icon: 'noodles' },
  { type: 'food_type', label: 'Biryani', href: nearbySearchHref('biryani'), icon: 'bowl' },
  { type: 'food_type', label: 'Kebab', href: nearbySearchHref('kebab'), icon: 'flame' },
  {
    type: 'food_type',
    label: 'Dumpling night',
    href: nearbySearchHref('dumplings'),
    icon: 'dumpling',
  },
  { type: 'food_type', label: 'Pastries', href: nearbySearchHref('pastries'), icon: 'cookie' },
  { type: 'chef_pick', label: "Chef's picks", href: '/chefs?sort=featured', icon: 'spark' },
  { type: 'chef_pick', label: 'Trending now', href: '/chefs?sort=availability', icon: 'flame' },
  {
    type: 'chef_pick',
    label: 'Hidden gems',
    href: '/nearby?sort=featured&q=hidden+gems',
    icon: 'search',
  },
  { type: 'mood', label: 'Cozy', href: eatCravingHref('cozy'), icon: 'comfort' },
  { type: 'mood', label: 'Spicy', href: eatCravingHref('spicy'), icon: 'pepper' },
  { type: 'mood', label: 'Fresh', href: eatCravingHref('fresh'), icon: 'leaf' },
  { type: 'mood', label: 'Indulgent', href: eatCravingHref('indulgent'), icon: 'cake' },
  { type: 'mood', label: 'Light', href: eatCravingHref('light'), icon: 'salad' },
  { type: 'mood', label: 'Adventurous', href: eatCravingHref('adventurous'), icon: 'spark' },
  { type: 'dietary', label: 'Vegan', href: '/chefs?dietary=vegan', icon: 'plant' },
  { type: 'dietary', label: 'Dairy-free', href: '/chefs?dietary=dairy_free', icon: 'leaf' },
  { type: 'dietary', label: 'Allergy-aware', href: '/chefs?dietary=allergy_aware', icon: 'leaf' },
  { type: 'dietary', label: 'Halal', href: '/chefs?dietary=religious_diets&q=halal', icon: 'leaf' },
  {
    type: 'dietary',
    label: 'Kosher',
    href: '/chefs?dietary=religious_diets&q=kosher',
    icon: 'leaf',
  },
  {
    type: 'dietary',
    label: 'Low-carb',
    href: '/chefs?dietary=medical_diets&q=low+carb',
    icon: 'egg',
  },
  {
    type: 'dietary',
    label: 'High-protein',
    href: '/chefs?dietary=medical_diets&q=high+protein',
    icon: 'steak',
  },
  { type: 'occasion', label: 'Breakfast', href: '/eat?eventStyle=Breakfast', icon: 'coffee' },
  { type: 'occasion', label: 'Lunch', href: '/eat?eventStyle=Lunch', icon: 'sandwich' },
  { type: 'occasion', label: 'Late-night', href: '/eat?intent=late_night', icon: 'spark' },
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
  { type: 'occasion', label: 'First date', href: '/eat?eventStyle=First+date', icon: 'champagne' },
  { type: 'occasion', label: 'Game night', href: '/eat?eventStyle=Game+night', icon: 'cheers' },
  { type: 'occasion', label: 'Celebration', href: '/eat?eventStyle=Celebration', icon: 'confetti' },
  { type: 'occasion', label: 'After-work', href: '/eat?eventStyle=After-work', icon: 'cheers' },
  { type: 'occasion', label: 'Brunch', href: '/eat?eventStyle=Brunch', icon: 'brunch' },
  { type: 'occasion', label: 'Dessert party', href: '/eat?eventStyle=Dessert+party', icon: 'cake' },
  { type: 'time', label: 'Quick eats', href: '/eat?intent=quick_eats', icon: 'flame' },
  { type: 'time', label: 'Under 30 min', href: '/nearby?q=quick+food', icon: 'utensils' },
  { type: 'time', label: 'Open now', href: '/nearby?q=open+now', icon: 'location' },
  { type: 'time', label: 'Delivery-friendly', href: '/nearby?q=delivery', icon: 'market' },
  { type: 'group_size', label: 'Solo', href: '/eat?partySize=1', icon: 'utensils' },
  { type: 'group_size', label: 'Couple', href: '/eat?partySize=2', icon: 'champagne' },
  { type: 'group_size', label: 'Family', href: '/eat?partySize=family', icon: 'family' },
  { type: 'group_size', label: 'Big group', href: '/eat?partySize=large', icon: 'cheers' },
  { type: 'price', label: '$', href: '/chefs?priceRange=budget', icon: 'crown' },
  { type: 'price', label: '$$', href: '/chefs?priceRange=mid', icon: 'crown' },
  { type: 'price', label: '$$$', href: '/chefs?priceRange=premium', icon: 'crown' },
  { type: 'price', label: 'Budget-friendly', href: '/chefs?priceRange=budget', icon: 'spark' },
  { type: 'price', label: 'Splurge', href: '/chefs?priceRange=luxury', icon: 'crown' },
  { type: 'saved', label: 'Surprise me', href: '/eat?intent=surprise_me', icon: 'spark' },
  {
    type: 'saved',
    label: 'Recently viewed',
    href: '/chefs?sort=featured&q=recent',
    icon: 'search',
  },
  { type: 'saved', label: 'Saved chefs', href: '/chefs?sort=featured&q=saved', icon: 'chef' },
  { type: 'special_dining', label: 'Cannabis Dining', href: '/cannabis/public', icon: 'leaf' },
]

type DiningMoment = 'morning' | 'midday' | 'evening' | 'late'

const MOMENT_ITEMS: Record<DiningMoment, DiscoveryRailItem[]> = {
  morning: [
    { type: 'time', label: 'Morning coffee', href: '/nearby?q=coffee', icon: 'coffee' },
    { type: 'occasion', label: 'Breakfast', href: '/eat?eventStyle=Breakfast', icon: 'coffee' },
    {
      type: 'combo',
      label: 'Budget brunch',
      href: '/chefs?priceRange=budget&q=brunch',
      icon: 'brunch',
    },
  ],
  midday: [
    { type: 'occasion', label: 'Work lunch', href: '/eat?intent=work_lunch', icon: 'sandwich' },
    { type: 'time', label: 'Quick lunch', href: '/nearby?q=quick+lunch', icon: 'flame' },
    { type: 'combo', label: 'Fresh bowls', href: eatCravingHref('fresh bowls'), icon: 'salad' },
  ],
  evening: [
    { type: 'occasion', label: 'Dinner tonight', href: '/eat?intent=tonight', icon: 'utensils' },
    {
      type: 'combo',
      label: 'Spicy date night',
      href: '/eat?eventStyle=Date+night&craving=spicy',
      icon: 'pepper',
    },
    {
      type: 'combo',
      label: 'Seafood tasting',
      href: '/chefs?cuisine=seafood&serviceType=private_dinner',
      icon: 'seafood',
    },
  ],
  late: [
    { type: 'occasion', label: 'Late-night', href: '/eat?intent=late_night', icon: 'spark' },
    { type: 'time', label: 'Open now', href: '/nearby?q=open+now', icon: 'location' },
    {
      type: 'combo',
      label: 'Comfort after dark',
      href: eatCravingHref('comfort food'),
      icon: 'comfort',
    },
  ],
}

const COMBO_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'combo',
    label: 'Vegan dinner party',
    href: '/chefs?dietary=vegan&serviceType=private_dinner',
    icon: 'plant',
  },
  {
    type: 'combo',
    label: 'Big group BBQ',
    href: '/chefs?cuisine=barbecue&serviceType=catering',
    icon: 'bbq',
  },
  {
    type: 'combo',
    label: 'Budget-friendly brunch',
    href: '/chefs?priceRange=budget&q=brunch',
    icon: 'brunch',
  },
  {
    type: 'combo',
    label: 'Cozy pasta night',
    href: '/chefs?cuisine=italian&serviceType=private_dinner',
    icon: 'pasta',
  },
]

const STORY_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'story',
    presentation: 'story',
    eyebrow: 'Chef edit',
    label: "Chef's picks",
    sublabel: 'Featured talent ready for private dining',
    href: '/chefs?sort=featured',
    icon: 'spark',
  },
  {
    type: 'story',
    presentation: 'story',
    eyebrow: 'Seasonal',
    label: 'Peak ingredients',
    sublabel: 'Menus built around what is good now',
    href: '/ingredients',
    icon: 'market',
  },
  {
    type: 'story',
    presentation: 'story',
    eyebrow: 'Discovery',
    label: 'Hidden gems',
    sublabel: 'Operators and chefs worth browsing',
    href: '/nearby?q=hidden+gems',
    icon: 'search',
  },
]

const BUYER_INTENT_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'occasion',
    presentation: 'story',
    eyebrow: 'Soon',
    label: 'Dinner tonight',
    sublabel: 'Start with chefs sorted for availability',
    href: '/chefs?sort=availability&intent=tonight',
    icon: 'utensils',
  },
  {
    type: 'occasion',
    presentation: 'story',
    eyebrow: 'Weekend',
    label: 'This weekend',
    sublabel: 'Private dinners, birthdays, and hosted meals',
    href: '/chefs?sort=availability&intent=weekend',
    icon: 'spark',
  },
  {
    type: 'price',
    presentation: 'story',
    eyebrow: 'Budget',
    label: 'Under $100/person',
    sublabel: 'Browse budget-friendly chef options',
    href: '/chefs?priceRange=budget',
    icon: 'crown',
  },
  {
    type: 'chef_pick',
    presentation: 'story',
    eyebrow: 'Proof',
    label: 'Reviewed chefs',
    sublabel: 'Start with featured chef profiles',
    href: '/chefs?sort=featured',
    icon: 'spark',
  },
  {
    type: 'service',
    presentation: 'story',
    eyebrow: 'At home',
    label: 'Private dinner',
    sublabel: 'Restaurant-level service in your space',
    href: '/chefs?serviceType=private_dinner',
    icon: 'crown',
  },
]

const SURPRISE_TARGETS: DiscoveryRailItem[] = [
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/eat?craving=adventurous&intent=surprise_me',
    icon: 'spark',
    sublabel: 'Something outside the usual rotation',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/chefs?cuisine=thai&serviceType=private_dinner&sort=availability',
    icon: 'pepper',
    sublabel: 'Thai private dinner ideas',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/nearby?q=hidden+gems',
    icon: 'search',
    sublabel: 'Unexpected local operators',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/chefs?priceRange=mid&sort=availability',
    icon: 'flame',
    sublabel: 'Mid-range chefs with availability',
  },
]

function getDiningMoment(date = new Date()): DiningMoment {
  const hour = date.getHours()
  if (hour < 11) return 'morning'
  if (hour < 16) return 'midday'
  if (hour < 22) return 'evening'
  return 'late'
}

function buildLocationSmartItems(ctx: HomepageLocationContext | null): DiscoveryRailItem[] {
  if (!ctx?.location.trim()) return []
  const city = ctx.location.split(',')[0]?.trim()
  if (!city) return []

  const lowerCity = city.toLowerCase()
  const localSpecialty = lowerCity.includes('austin')
    ? { label: `${city} BBQ`, href: cuisineLandingHref('barbecue'), icon: 'bbq' as const }
    : lowerCity.includes('miami')
      ? { label: `${city} seafood`, href: cuisineLandingHref('seafood'), icon: 'seafood' as const }
      : lowerCity.includes('new york') ||
          lowerCity.includes('nyc') ||
          lowerCity.includes('brooklyn')
        ? { label: `${city} pizza`, href: nearbySearchHref('pizza'), icon: 'pizza' as const }
        : lowerCity.includes('los angeles') || lowerCity.includes('la')
          ? { label: `${city} sushi`, href: cuisineLandingHref('japanese'), icon: 'sushi' as const }
          : { label: `${city} private chefs`, href: '/chefs', icon: 'chef' as const }

  return [
    {
      type: 'story',
      presentation: 'story',
      eyebrow: 'Near you',
      label: localSpecialty.label,
      sublabel: 'Local signal based on your search',
      href: localSpecialty.href,
      icon: localSpecialty.icon,
    },
    {
      type: 'location',
      label: `Available in ${city}`,
      href: `/chefs?location=${encodeURIComponent(ctx.location.trim())}&sort=availability`,
      icon: 'location',
    },
    {
      type: 'occasion',
      presentation: 'story',
      eyebrow: 'Local',
      label: `This weekend in ${city}`,
      sublabel: 'Availability-led chef browsing',
      href: `/chefs?location=${encodeURIComponent(ctx.location.trim())}&sort=availability&intent=weekend`,
      icon: 'spark',
    },
  ]
}

function dedupeDiscoveryItems(items: DiscoveryRailItem[]): DiscoveryRailItem[] {
  const seen = new Set<string>()
  const next: DiscoveryRailItem[] = []
  for (const item of items) {
    const key = `${item.type}:${item.label}:${item.href}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

type DiscoveryRowRole = 'cuisine' | 'mobile' | 'craving' | 'intent'

const DISCOVERY_ROW_ROLES: DiscoveryRowRole[] = ['cuisine', 'mobile', 'craving', 'intent']

interface DiscoveryRowConfig {
  role: DiscoveryRowRole
  label: string
  items: DiscoveryRailItem[]
  offsetClassName: string
  ariaLabel: string
  className?: string
  labelClassName?: string
}

const ROW_MOTION: Record<
  DiscoveryRowRole,
  { base: number; wave: number; period: number; phase: number; secondaryRatio: number }
> = {
  // cuisine: steady primary discovery — consistent, minimal variation, most reliable
  mobile: { base: 0.72, wave: 0.05, period: 9800, phase: 1.2, secondaryRatio: 0.48 },
  cuisine: { base: 0.82, wave: 0.04, period: 11500, phase: 0.0, secondaryRatio: 0.52 },
  // craving: lively appetite-driven — more speed variation, shorter wave cycle
  craving: { base: 1.0, wave: 0.12, period: 7200, phase: 2.1, secondaryRatio: 0.37 },
  // intent: calm service-oriented — slow drift, long period, feels intentional
  intent: { base: 0.46, wave: 0.05, period: 18000, phase: 4.7, secondaryRatio: 0.44 },
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
export function buildRow2(
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
    presentation: 'story',
    eyebrow: 'Featured chef',
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
    {
      type: 'service',
      label: `Private dinner in ${city}`,
      href: `/chefs?location=${encodeURIComponent(ctx.location.trim())}&serviceType=private_dinner`,
      icon: 'crown',
    },
    {
      type: 'price',
      label: `Budget-friendly in ${city}`,
      href: `/chefs?location=${encodeURIComponent(ctx.location.trim())}&priceRange=budget`,
      icon: 'crown',
    },
  ]
}

function readRecentDiscoveryItems(): DiscoveryRailItem[] {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(DISCOVERY_RECENTS_STORAGE_KEY) ?? '[]'
    ) as DiscoveryRecentClick[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 3).map((entry) => ({
      type: 'saved',
      label: entry.label,
      href: entry.href,
      icon: entry.icon ?? 'search',
      sublabel: 'Recently viewed',
    }))
  } catch {
    return []
  }
}

function withDiscoveryDebug(
  item: DiscoveryRailItem,
  debugScore: DiscoveryRailDebugScore
): DiscoveryRailItem {
  return { ...item, debugScore }
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
  rowPosition: number
  rowItemCount: number
  isDuplicate?: boolean
}

function DiscoveryPill({
  item,
  locationContext,
  blockLocationContext = false,
  rowRole,
  rowPosition,
  rowItemCount,
  isDuplicate = false,
}: DiscoveryPillProps) {
  const flagRaw = getCuisineFlagUrl(item)
  const flagUrls = flagRaw === null ? [] : Array.isArray(flagRaw) ? flagRaw : [flagRaw]
  const hasFlagBg = flagUrls.length > 0
  const countryLabel = getCuisineCountryLabel(item)
  const emoji = !hasFlagBg ? (DISCOVERY_EMOJI_MAP[item.label] ?? null) : null
  const Icon = getDiscoveryIcon(item)
  const style = getPillStyle(item)
  const href = buildDiscoveryHref(item.href, blockLocationContext ? null : locationContext)
  const primary = rowRole === 'cuisine'
  // Flag pills show the real flag as a background — no icon badge needed.
  const showIconBadge = !hasFlagBg
  // Flag cards: cuisine-row flag pills become tall rectangular cards instead of pills
  const isCard = hasFlagBg && primary
  const isStory = item.presentation === 'story'

  // Build CSS multi-background for single or multi-flag pills.
  const flagBgStyle: React.CSSProperties | undefined = hasFlagBg
    ? flagUrls.length === 1
      ? {
          backgroundImage: `url(${flagUrls[0]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
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

  const textOutlineStyle: React.CSSProperties | undefined = hasFlagBg
    ? { textShadow: '0 1px 3px rgba(0,0,0,0.72)' }
    : undefined

  const glowColor = isCard ? (CUISINE_GLOW_COLORS[item.label] ?? null) : null
  const glowStyle: React.CSSProperties | undefined = glowColor
    ? ({ '--cuisine-glow': glowColor } as React.CSSProperties)
    : undefined
  const pillRef = useRef<HTMLAnchorElement | null>(null)
  const impressionTrackedRef = useRef(false)
  const [feedbackAction, setFeedbackAction] = useState<'love' | 'hate' | null>(null)
  const trackingContext = useMemo(
    () => ({
      href,
      rowRole,
      rowPosition,
      rowItemCount,
      isDuplicate,
      locationAttached: href !== item.href,
    }),
    [href, isDuplicate, item.href, rowItemCount, rowPosition, rowRole]
  )

  useEffect(() => {
    if (isDuplicate || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    const el = pillRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (impressionTrackedRef.current) return
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.55) return

        impressionTrackedRef.current = true
        trackDiscoveryInteraction('impression', item, trackingContext)
        observer.disconnect()
      },
      { threshold: [0.55] }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isDuplicate, item, trackingContext])

  const onFeedbackClick = useCallback(
    (action: 'love' | 'hate', e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDuplicate) return

      setFeedbackAction(action)
      trackDiscoveryInteraction(action, item, trackingContext)
    },
    [isDuplicate, item, trackingContext]
  )

  return (
    <span className="group/feedback relative inline-flex shrink-0">
      <Link
        ref={pillRef}
        href={href}
        draggable={false}
        style={glowStyle}
        className={[
          'discovery-pill group shrink-0 border font-semibold leading-none tracking-normal transition-all duration-200',
          isStory
            ? 'inline-flex h-[82px] w-[172px] min-w-[172px] max-w-[172px] flex-col items-start justify-between overflow-hidden rounded-xl px-3 py-2.5 text-left text-[13px] sm:h-[88px] sm:w-[190px] sm:min-w-[190px] sm:max-w-[190px] sm:px-3.5 sm:py-3'
            : isCard
              ? // Card layout: tall rect, text pinned to bottom-center
                'inline-flex min-h-[82px] w-[96px] min-w-[96px] max-w-[96px] flex-col items-center justify-end gap-0 overflow-hidden rounded-xl px-2 py-2 text-[12px] sm:min-h-[96px] sm:w-[116px] sm:min-w-[116px] sm:max-w-[116px] sm:py-2.5 sm:text-[13px]'
              : // Standard pill layout
                'inline-flex items-center rounded-full',
          !isCard && !isStory && (showIconBadge ? 'gap-2' : 'gap-0'),
          !isCard &&
            !isStory &&
            (primary
              ? 'min-h-[46px] px-4 py-2.5 text-[14px]'
              : 'min-h-[40px] px-3.5 py-2 text-[13px]'),
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0e08] active:translate-y-0',
          hasFlagBg
            ? 'relative overflow-hidden border-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-white/45 hover:text-white'
            : [isStory ? 'backdrop-blur-xl' : 'backdrop-blur-md', style.link].join(' '),
        ].join(' ')}
        aria-hidden={isDuplicate ? true : undefined}
        tabIndex={isDuplicate ? -1 : undefined}
        onClick={() => {
          if (!isDuplicate) {
            trackDiscoveryClick(item, trackingContext)
            window.dispatchEvent(new Event('cf:discovery-recents-updated'))
          }
        }}
      >
        {isStory && (
          <span className="flex w-full items-center justify-between gap-3">
            <span className="truncate text-[10px] font-bold uppercase tracking-widest text-white/45">
              {item.eyebrow ?? 'Discovery'}
            </span>
            <Icon className="h-4 w-4 shrink-0 text-[#f1a381]" weight="bold" aria-hidden="true" />
          </span>
        )}
        {/* Flag background at 50% opacity */}
        {hasFlagBg && (
          <span className="absolute inset-0 opacity-50" style={flagBgStyle} aria-hidden="true" />
        )}
        {/* Gradient: for cards, strong bottom darkening; for non-card pills, gentle top-to-bottom */}
        {hasFlagBg && (
          <span
            className={
              isCard
                ? 'absolute inset-0 bg-gradient-to-t from-black/78 via-black/24 to-black/5'
                : 'absolute inset-0 bg-gradient-to-t from-black/60 to-black/10'
            }
            aria-hidden="true"
          />
        )}
        {showIconBadge && !isStory && (
          <span
            className={[
              'grid shrink-0 place-items-center rounded-full border transition-colors',
              primary ? 'h-7 w-7' : 'h-6 w-6',
              style.icon,
            ].join(' ')}
            aria-hidden="true"
          >
            {emoji ? (
              <span className={primary ? 'text-base leading-none' : 'text-sm leading-none'}>
                {emoji}
              </span>
            ) : (
              <Icon className={primary ? 'h-4 w-4' : 'h-3.5 w-3.5'} weight="bold" />
            )}
          </span>
        )}
        {hasFlagBg && countryLabel ? (
          <span className="relative z-10 flex w-full min-w-0 flex-col items-center gap-0.5 text-center">
            <span className="max-w-full truncate whitespace-nowrap" style={textOutlineStyle}>
              {item.label}
            </span>
            <span
              className="max-w-full truncate whitespace-nowrap text-[10px] font-normal tracking-wide opacity-85"
              style={textOutlineStyle}
            >
              {countryLabel}
            </span>
          </span>
        ) : (
          <span
            className={[
              isStory
                ? 'max-w-full whitespace-normal text-[15px] leading-tight'
                : 'whitespace-nowrap',
              hasFlagBg ? 'relative z-10' : '',
            ].join(' ')}
            style={textOutlineStyle}
          >
            {item.label}
          </span>
        )}
        {item.sublabel && (
          <span
            className={[
              isStory
                ? 'line-clamp-2 max-w-full text-[11px] font-medium leading-snug opacity-65'
                : 'max-w-[9rem] truncate text-[11px] font-medium leading-none opacity-65',
              hasFlagBg ? 'relative z-10' : '',
            ].join(' ')}
            style={textOutlineStyle}
          >
            {item.sublabel}
          </span>
        )}
        {process.env.NODE_ENV !== 'production' && item.debugScore && !isDuplicate && (
          <span
            className="absolute bottom-1 right-1 z-20 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white/65 backdrop-blur-sm"
            title={`${item.debugScore.reason} (${item.debugScore.score})`}
            aria-hidden="true"
          >
            {item.debugScore.score}
          </span>
        )}
      </Link>
      {!isDuplicate && (
        <span
          className={[
            'pointer-events-none absolute right-1 top-1 z-20 flex gap-1 rounded-full bg-black/25 p-0.5 shadow-sm backdrop-blur-sm transition-opacity group-focus-within/feedback:pointer-events-auto group-focus-within/feedback:opacity-100 group-hover/feedback:pointer-events-auto group-hover/feedback:opacity-100',
            feedbackAction ? 'pointer-events-auto opacity-100' : 'opacity-0',
          ].join(' ')}
          aria-label={`Feedback for ${item.label}`}
        >
          <button
            type="button"
            className={[
              'grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-black/35 text-white/70 transition-colors hover:border-[#e8a96b]/60 hover:bg-[#3a2115]/90 hover:text-[#ffd6a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55',
              feedbackAction === 'love' ? 'border-[#e8a96b]/70 bg-[#3a2115] text-[#ffd6a3]' : '',
            ].join(' ')}
            aria-label={`More like ${item.label}`}
            aria-pressed={feedbackAction === 'love'}
            title="More like this"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onFeedbackClick('love', e)}
          >
            <Heart className="h-3 w-3" weight={feedbackAction === 'love' ? 'fill' : 'bold'} />
          </button>
          <button
            type="button"
            className={[
              'grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-black/35 text-white/70 transition-colors hover:border-[#efb49b]/60 hover:bg-[#361b14]/90 hover:text-[#ffd5c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb49b]/55',
              feedbackAction === 'hate' ? 'border-[#efb49b]/70 bg-[#361b14] text-[#ffd5c3]' : '',
            ].join(' ')}
            aria-label={`Less like ${item.label}`}
            aria-pressed={feedbackAction === 'hate'}
            title="Less like this"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onFeedbackClick('hate', e)}
          >
            <ThumbsDown className="h-3 w-3" weight={feedbackAction === 'hate' ? 'fill' : 'bold'} />
          </button>
        </span>
      )}
    </span>
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
    mobile: null,
    craving: null,
    intent: null,
  })
  const [rowPaused, setRowPaused] = useState<Record<DiscoveryRowRole, boolean>>({
    cuisine: false,
    mobile: false,
    craving: false,
    intent: false,
  })
  const rowPausedRef = useRef<Record<DiscoveryRowRole, boolean>>({
    cuisine: false,
    mobile: false,
    craving: false,
    intent: false,
  })
  const resumeTimers = useRef<Record<DiscoveryRowRole, ReturnType<typeof setTimeout> | null>>({
    cuisine: null,
    mobile: null,
    craving: null,
    intent: null,
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pageVisibleRef = useRef(true)
  const containerVisibleRef = useRef(true)
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
  const [diningMoment, setDiningMoment] = useState<DiningMoment>('evening')
  const [recentItems, setRecentItems] = useState<DiscoveryRailItem[]>([])
  const [surpriseItem, setSurpriseItem] = useState<DiscoveryRailItem>(SURPRISE_TARGETS[0])

  useEffect(() => {
    setDiningMoment(getDiningMoment())
    setRecentItems(readRecentDiscoveryItems())
    setSurpriseItem(SURPRISE_TARGETS[Math.floor(Math.random() * SURPRISE_TARGETS.length)])

    function refreshRecents() {
      setRecentItems(readRecentDiscoveryItems())
    }

    window.addEventListener('storage', refreshRecents)
    window.addEventListener('focus', refreshRecents)
    window.addEventListener('cf:discovery-recents-updated', refreshRecents)
    return () => {
      window.removeEventListener('storage', refreshRecents)
      window.removeEventListener('focus', refreshRecents)
      window.removeEventListener('cf:discovery-recents-updated', refreshRecents)
    }
  }, [])

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
    const timers = resumeTimers.current
    return () => {
      DISCOVERY_ROW_ROLES.forEach((role) => {
        const t = timers[role]
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
  const onRowFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (role) pauseRow(role)
    },
    [pauseRow]
  )

  const onRowBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (!role) return
      const nextFocus = e.relatedTarget instanceof Node ? e.relatedTarget : null
      if (nextFocus && e.currentTarget.contains(nextFocus)) return
      scheduleResumeRow(role)
    },
    [scheduleResumeRow]
  )

  const onRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return

      const el = e.currentTarget
      const role = (el.getAttribute('data-discovery-row') ?? null) as DiscoveryRowRole | null
      e.preventDefault()
      if (role) pauseRow(role)

      const halfWidth = el.scrollWidth / 2
      const step = Math.max(120, Math.round(el.clientWidth * 0.7))
      const behavior: ScrollBehavior = reducedMotion.current ? 'auto' : 'smooth'

      if (e.key === 'Home') {
        el.scrollTo({ left: 0, behavior })
      } else if (e.key === 'End') {
        el.scrollTo({ left: Math.max(0, halfWidth - el.clientWidth), behavior })
      } else {
        el.scrollBy({ left: e.key === 'ArrowLeft' ? -step : step, behavior })
      }

      if (role) scheduleResumeRow(role)
    },
    [pauseRow, scheduleResumeRow]
  )

  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncReducedMotion = () => {
      reducedMotion.current = media.matches
      if (media.matches) lastTimeRef.current = 0
    }

    syncReducedMotion()
    media.addEventListener('change', syncReducedMotion)
    return () => media.removeEventListener('change', syncReducedMotion)
  }, [])

  useEffect(() => {
    const updatePageVisibility = () => {
      pageVisibleRef.current = document.visibilityState === 'visible'
      if (pageVisibleRef.current) lastTimeRef.current = 0
    }

    updatePageVisibility()
    document.addEventListener('visibilitychange', updatePageVisibility)

    const el = containerRef.current
    if (!el || !('IntersectionObserver' in window)) {
      return () => document.removeEventListener('visibilitychange', updatePageVisibility)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        containerVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting) lastTimeRef.current = 0
      },
      { threshold: 0.05 }
    )
    observer.observe(el)

    return () => {
      document.removeEventListener('visibilitychange', updatePageVisibility)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (reducedMotion.current) return

    const tick = (time: number) => {
      if (reducedMotion.current || !pageVisibleRef.current || !containerVisibleRef.current) {
        lastTimeRef.current = 0
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const dt = lastTimeRef.current ? time - lastTimeRef.current : 0
      lastTimeRef.current = time
      // Guard against large jumps (tab backgrounded, etc.)
      if (dt > 0 && dt < 200) {
        DISCOVERY_ROW_ROLES.forEach((role) => {
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
    const locationSmartItems = buildLocationSmartItems(locationContext)
    const enhancedPool = dedupeDiscoveryItems([
      ...locationSmartItems.slice(0, 1),
      ...pool.slice(0, 10),
      ...locationSmartItems.slice(1),
      ...pool.slice(10),
    ])
    const scoredPool = applyDiscoveryRailScores(
      enhancedPool,
      userSignals,
      {
        role: 'cuisine',
        locationActive: Boolean(locationContext?.location.trim()),
      },
      withDiscoveryDebug
    )
    return [...scoredPool, ...scoredPool]
  }, [locationContext, userSignals])

  const row2 = useMemo(() => {
    const pool = dedupeDiscoveryItems([
      ...STORY_ITEMS,
      ...MOMENT_ITEMS[diningMoment],
      ...COMBO_ITEMS,
      ...CRAVING_POOL,
    ])
    const scoredPool = applyDiscoveryRailScores(
      pool,
      userSignals,
      {
        role: 'craving',
        locationActive: Boolean(locationContext?.location.trim()),
      },
      withDiscoveryDebug
    )
    return [...scoredPool, ...scoredPool]
  }, [diningMoment, locationContext, userSignals])

  const row3 = useMemo(() => {
    const chefItems = (featuredChefs ?? []).slice(0, 5).map(chefToRailItem)
    const locationItems = [
      ...buildLocationItems(locationContext),
      ...buildLocationSmartItems(locationContext),
    ]
    const signalItems = (culinarySignals ?? []).slice(0, 3)
    let servicePool = dedupeDiscoveryItems([
      surpriseItem,
      ...BUYER_INTENT_ITEMS,
      ...recentItems,
      ...MOMENT_ITEMS[diningMoment],
      ...INTENT_POOL.filter(
        (item) =>
          item.label !== 'Surprise me' &&
          item.label !== 'Recently viewed' &&
          item.label !== 'Saved chefs'
      ),
    ])
    if (userSignals?.boostedServiceTypes.length) {
      const boosted = servicePool.filter((item) =>
        userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      const rest = servicePool.filter(
        (item) => !userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      servicePool = [...boosted, ...rest]
    }
    const pool = buildRow2(servicePool, chefItems, locationItems, signalItems)
    const scoredPool = applyDiscoveryRailScores(
      pool,
      userSignals,
      {
        role: 'intent',
        locationActive: Boolean(locationContext?.location.trim()),
      },
      withDiscoveryDebug
    )
    return [...scoredPool, ...scoredPool]
  }, [
    culinarySignals,
    diningMoment,
    featuredChefs,
    locationContext,
    recentItems,
    surpriseItem,
    userSignals,
  ])

  const mobileRow2 = useMemo(() => {
    const row2Single = row2.slice(0, Math.floor(row2.length / 2))
    const row3Single = row3.slice(0, Math.floor(row3.length / 2))
    const mobileIntentItems = row3Single
      .filter((item) =>
        ['service', 'occasion', 'location', 'featured_chef', 'culinary_signal', 'saved'].includes(
          item.type
        )
      )
      .slice(0, 8)
    const pool = dedupeDiscoveryItems([
      ...mobileIntentItems.slice(0, 4),
      ...row2Single.slice(0, 10),
      ...mobileIntentItems.slice(4),
      ...row2Single.slice(10),
    ])
    const scoredPool = applyDiscoveryRailScores(
      pool,
      userSignals,
      {
        role: 'mobile',
        locationActive: Boolean(locationContext?.location.trim()),
      },
      withDiscoveryDebug
    )
    return [...scoredPool, ...scoredPool]
  }, [locationContext, row2, row3, userSignals])

  const rows: DiscoveryRowConfig[] = [
    {
      role: 'cuisine',
      label: 'Cuisines',
      items: row1,
      offsetClassName: 'pl-0',
      ariaLabel: 'Cuisine types',
    },
    {
      role: 'mobile',
      label: 'Discover',
      items: mobileRow2,
      offsetClassName: 'pl-4',
      ariaLabel: 'Personalized dishes, occasions, services, and local picks',
      className: 'sm:hidden',
      labelClassName: 'sm:hidden',
    },
    {
      role: 'craving',
      label: 'Dishes',
      items: row2,
      offsetClassName: 'pl-4 sm:pl-14',
      ariaLabel: 'Favorite dishes and cravings',
      className: 'hidden sm:block',
      labelClassName: 'hidden sm:flex',
    },
    {
      role: 'intent',
      label: 'Occasions',
      items: row3,
      offsetClassName: 'pl-2 sm:pl-24',
      ariaLabel: 'Occasions and service formats',
      className: 'hidden sm:block',
      labelClassName: 'hidden sm:flex',
    },
  ]

  const ROW_DOTS: Record<string, string> = {
    cuisine: 'bg-amber-400/60',
    mobile: 'bg-emerald-400/50',
    craving: 'bg-red-400/50',
    intent: 'bg-emerald-400/50',
  }

  return (
    <>
      {/* Section labels */}
      <div className="mb-3 mt-5 flex items-center gap-2 px-2 sm:mt-8" aria-hidden="true">
        {rows.map((row, i) => (
          <React.Fragment key={row.role}>
            {i > 0 && (
              <span className={['text-[11px] text-white/15', row.labelClassName ?? ''].join(' ')}>
                &middot;
              </span>
            )}
            <span
              className={[
                'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40',
                row.labelClassName ?? '',
              ].join(' ')}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${ROW_DOTS[row.role]}`} />
              {row.label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div
        ref={containerRef}
        className="cuisine-marquee-container relative py-2"
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
              className={[
                `cuisine-marquee-row discovery-row-ready row-${rowIndex + 1} cursor-grab overflow-x-auto py-0.5 active:cursor-grabbing`,
                row.className ?? '',
              ].join(' ')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              onFocus={onRowFocus}
              onBlur={onRowBlur}
              onKeyDown={onRowKeyDown}
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
                    rowPosition={i % Math.max(1, Math.floor(row.items.length / 2))}
                    rowItemCount={Math.max(1, Math.floor(row.items.length / 2))}
                    isDuplicate={i >= Math.floor(row.items.length / 2)}
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
    </>
  )
}
