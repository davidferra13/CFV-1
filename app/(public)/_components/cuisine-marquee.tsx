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
  buildDiscoveryHref,
  buildRow2,
  dedupeDiscoveryItems,
  getDiscoveryRailItemDisplayMeta,
  getHomepageDiscoveryRailReconciliation,
} from '@/lib/discovery/homepage-discovery-rail'
import {
  buildActiveDiscoveryFilterSummary,
  discoveryFiltersToHref,
  emptyDiscoveryFilterState,
  isDiscoveryFilterStateEmpty,
  selectionFromRailItem,
  toggleDiscoveryRailFilter,
  type DiscoveryFilterState,
} from '@/lib/discovery/filter-state-contract'
import { buildHomepageTasteRailItems } from '@/lib/discovery/homepage-taste-rail'
import { getDiscoveryRailContract } from '@/lib/discovery/rail-contract-registry'
import type {
  DiscoveryIconKey,
  DiscoveryItemType,
  DiscoveryRailItem,
  FeaturedChefRailData,
  HomepageLocationContext,
} from '@/lib/discovery/homepage-discovery-rail'
import {
  DISCOVERY_RECENTS_STORAGE_KEY,
  trackDiscoveryClick,
  trackDiscoveryInteraction,
  type DiscoveryRecentClick,
} from '@/lib/discovery/track-discovery-click'
import {
  showDiscoveryHideToast,
  showDiscoveryPinToast,
  showDiscoveryLoveToast,
} from '@/components/discovery/discovery-feedback-toast'
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
  Pause,
  Pin,
  Knife,
  Leaf,
  MapPin,
  PartyPopper,
  Pepper,
  Pizza,
  Plant,
  Play,
  Search,
  Shrimp,
  Soup,
  Sparkles,
  Stack,
  Store,
  X,
  UsersFour,
  Utensils,
  Wine,
} from '@/components/ui/icons'
import { DiscoveryFallbackPanel } from './discovery-fallback-panel'
import type { FallbackAlternative } from '@/app/api/discovery/fallback-check/route'
import { filterValidRailDestinations } from '@/lib/discovery/homepage-discovery-destinations'

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
  knife: Knife,
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
  circle: 'family',
  culinary_signal: 'market',
  technique: 'knife',
  ingredient: 'carrot',
  vibe: 'spark',
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
    item.type === 'surprise' ||
    item.type === 'technique' ||
    item.type === 'vibe'
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
    item.type === 'circle' ||
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
    item.type === 'price' ||
    item.type === 'ingredient'
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
  // Techniques
  Grill: '🔥',
  'Stir-fry': '🥘',
  Braise: '🍲',
  Roast: '🍖',
  Bake: '🥐',
  'Sheet pan': '🍳',
  'One-pan': '🍳',
  'No-cook': '🥗',
  'Make-ahead': '📦',
  Ferment: '🫙',
  Smoke: '🔥',
  // Vibes
  Casual: '😎',
  Elevated: '✨',
  Romantic: '🌹',
  Cozy: '🍵',
  'Fine dining': '🍽️',
  'Family-style': '👨‍👩‍👧',
  'Celebration-worthy': '🎉',
  // Ingredients
  Chicken: '🍗',
  Rice: '🍚',
  Eggs: '🥚',
  Salmon: '🐟',
  Mushrooms: '🍄',
  Tofu: '🫘',
  // Additional occasions
  'Graduation dinner': '🎓',
  'Engagement dinner': '💍',
  'Game day': '🏈',
  'New parent meals': '👶',
  'Recovery meals': '💚',
  // Service formats
  'Drop-off catering': '📦',
  Buffet: '🍽️',
  'Grazing table': '🧀',
  'Freezer meals': '🧊',
  // Time/effort
  '15-minute ideas': '⏱️',
  'Minimal cleanup': '✨',
  'Weekend project': '🗓️',
  'Chef handles everything': '👨‍🍳',
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
  // Techniques
  { type: 'technique', label: 'Grill', href: '/eat?craving=grilled', icon: 'flame' },
  { type: 'technique', label: 'Stir-fry', href: '/eat?craving=stir+fry', icon: 'flame' },
  { type: 'technique', label: 'Braise', href: '/eat?craving=braised', icon: 'comfort' },
  { type: 'technique', label: 'Roast', href: '/eat?craving=roasted', icon: 'flame' },
  { type: 'technique', label: 'Bake', href: '/eat?craving=baked', icon: 'cookie' },
  { type: 'technique', label: 'Sheet pan', href: '/eat?craving=sheet+pan', icon: 'utensils' },
  { type: 'technique', label: 'No-cook', href: '/eat?craving=no+cook', icon: 'salad' },
  { type: 'technique', label: 'Smoke', href: '/eat?craving=smoked', icon: 'flame' },
  { type: 'technique', label: 'Ferment', href: '/eat?craving=fermented', icon: 'leaf' },
  // Vibes
  { type: 'vibe', label: 'Casual', href: '/eat?craving=casual', icon: 'utensils' },
  { type: 'vibe', label: 'Elevated', href: '/eat?craving=elevated', icon: 'crown' },
  {
    type: 'vibe',
    label: 'Fine dining',
    href: '/chefs?serviceType=private_dinner&priceRange=premium',
    icon: 'crown',
  },
  { type: 'vibe', label: 'Romantic', href: '/eat?eventStyle=Date+night', icon: 'champagne' },
  {
    type: 'vibe',
    label: 'Celebration-worthy',
    href: '/eat?eventStyle=Celebration',
    icon: 'confetti',
  },
  { type: 'vibe', label: 'Family-style', href: '/eat?eventStyle=Family+style', icon: 'family' },
  // Ingredients
  { type: 'ingredient', label: 'Chicken', href: '/eat?craving=chicken', icon: 'flame' },
  { type: 'ingredient', label: 'Salmon', href: '/eat?craving=salmon', icon: 'seafood' },
  { type: 'ingredient', label: 'Mushrooms', href: '/eat?craving=mushrooms', icon: 'leaf' },
  { type: 'ingredient', label: 'Tofu', href: '/eat?craving=tofu', icon: 'plant' },
  { type: 'ingredient', label: 'Rice', href: '/eat?craving=rice', icon: 'bowl' },
  { type: 'ingredient', label: 'Eggs', href: '/eat?craving=eggs', icon: 'egg' },
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
  {
    type: 'circle',
    label: 'Dinner Circles',
    href: '/hub',
    icon: 'family',
  },
  // Additional service formats from expansion specs
  {
    type: 'service',
    label: 'Drop-off catering',
    href: '/chefs?serviceType=catering&q=drop+off',
    icon: 'stack',
  },
  {
    type: 'service',
    label: 'Buffet',
    href: '/chefs?serviceType=catering&q=buffet',
    icon: 'concierge',
  },
  {
    type: 'service',
    label: 'Grazing table',
    href: '/chefs?serviceType=catering&q=grazing',
    icon: 'small_plates',
  },
  {
    type: 'service',
    label: 'Freezer meals',
    href: '/chefs?serviceType=meal_prep&q=freezer',
    icon: 'stack',
  },
  {
    type: 'service',
    label: "Chef's table",
    href: '/chefs?serviceType=private_dinner&q=chefs+table',
    icon: 'chef',
  },
  // Additional occasions from expansion specs
  {
    type: 'occasion',
    label: 'Graduation dinner',
    href: '/eat?eventStyle=Graduation+dinner',
    icon: 'graduation',
  },
  {
    type: 'occasion',
    label: 'Engagement dinner',
    href: '/eat?eventStyle=Engagement+dinner',
    icon: 'champagne',
  },
  { type: 'occasion', label: 'Game day', href: '/eat?eventStyle=Game+day', icon: 'cheers' },
  { type: 'occasion', label: 'New parent meals', href: '/eat?intent=care_meals', icon: 'family' },
  { type: 'occasion', label: 'Recovery meals', href: '/eat?intent=care_meals', icon: 'leaf' },
  {
    type: 'occasion',
    label: 'Office celebration',
    href: '/eat?eventStyle=Office+celebration',
    icon: 'confetti',
  },
  // Additional dietary from expansion specs
  { type: 'dietary', label: 'Pescatarian', href: '/chefs?dietary=pescatarian', icon: 'seafood' },
  {
    type: 'dietary',
    label: 'Plant-forward',
    href: '/chefs?dietary=vegan&q=plant+forward',
    icon: 'plant',
  },
  { type: 'dietary', label: 'Kid-friendly', href: '/eat?craving=kid+friendly', icon: 'family' },
]

const INTENT_POOL: DiscoveryRailItem[] = [
  {
    type: 'circle',
    label: 'Dinner Circles',
    href: '/hub',
    icon: 'family',
    sublabel: 'Shared guest pages for the whole table',
  },
  {
    type: 'circle',
    label: 'Open tables',
    href: '/hub/open-tables',
    icon: 'cheers',
  },
  {
    type: 'circle',
    label: 'Community Circles',
    href: '/hub/circles',
    icon: 'spark',
  },
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
  // Time and effort items from expansion specs
  { type: 'time', label: '15-minute ideas', href: '/eat?intent=quick_eats', icon: 'flame' },
  { type: 'time', label: 'One-pan', href: '/eat?craving=one+pan', icon: 'utensils' },
  { type: 'time', label: 'Minimal cleanup', href: '/eat?craving=easy+cleanup', icon: 'spark' },
  { type: 'time', label: 'Make-ahead', href: '/eat?craving=make+ahead', icon: 'stack' },
  {
    type: 'time',
    label: 'Weekend project',
    href: '/eat?craving=weekend+project',
    icon: 'utensils',
  },
  {
    type: 'time',
    label: 'This weekend',
    href: '/chefs?sort=availability&intent=weekend',
    icon: 'spark',
  },
  {
    type: 'service',
    label: 'Chef handles everything',
    href: '/chefs?serviceType=private_dinner',
    icon: 'chef',
  },
  // Group size items from expansion specs
  { type: 'group_size', label: 'Dinner for two', href: '/eat?partySize=2', icon: 'champagne' },
  { type: 'group_size', label: 'Small dinner party', href: '/eat?partySize=8', icon: 'cheers' },
  { type: 'group_size', label: '10-20 guests', href: '/eat?partySize=large', icon: 'family' },
  {
    type: 'group_size',
    label: 'Corporate group',
    href: '/chefs?serviceType=corporate',
    icon: 'cheers',
  },
  // Budget and price items from expansion specs
  {
    type: 'price',
    label: 'Best value',
    href: '/chefs?priceRange=budget&sort=featured',
    icon: 'spark',
  },
  {
    type: 'price',
    label: 'Group-friendly',
    href: '/chefs?priceRange=mid&serviceType=catering',
    icon: 'family',
  },
  {
    type: 'price',
    label: 'Premium experience',
    href: '/chefs?priceRange=premium&serviceType=private_dinner',
    icon: 'crown',
  },
  // Vibe items from expansion specs
  { type: 'vibe', label: 'Impressive but relaxed', href: '/eat?craving=impressive', icon: 'spark' },
  { type: 'vibe', label: 'Adventurous', href: '/eat?craving=adventurous', icon: 'spark' },
  { type: 'vibe', label: 'Low-key', href: '/eat?craving=casual', icon: 'utensils' },
  // Seasonal and timely items from expansion specs
  { type: 'seasonal', label: 'Summer dinners', href: '/eat?craving=summer', icon: 'flame' },
  { type: 'seasonal', label: 'Grilling season', href: '/eat?craving=grilled', icon: 'flame' },
  {
    type: 'seasonal',
    label: 'Sunday meal prep',
    href: '/chefs?serviceType=meal_prep',
    icon: 'stack',
  },
  { type: 'seasonal', label: 'Friday dinner', href: '/eat?intent=tonight', icon: 'champagne' },
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
  {
    type: 'story',
    presentation: 'story',
    eyebrow: 'Local',
    label: 'Meet a local chef',
    sublabel: 'Chef backgrounds and specialties',
    href: '/chefs?sort=featured',
    icon: 'chef',
  },
  {
    type: 'story',
    presentation: 'story',
    eyebrow: 'Explore',
    label: 'Cuisine deep dive',
    sublabel: 'Regional food stories and traditions',
    href: '/eat?craving=regional',
    icon: 'utensils',
  },
]

const BUYER_INTENT_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'circle',
    presentation: 'story',
    eyebrow: 'Together',
    label: 'Dinner Circles',
    sublabel: 'A shared page for guests, menus, chat, and planning',
    href: '/hub',
    icon: 'family',
  },
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
  // Technique story items from expansion specs
  {
    type: 'technique',
    presentation: 'story',
    eyebrow: 'Technique',
    label: 'Live-fire cooking',
    sublabel: 'Grilling, smoking, and open flame',
    href: '/eat?craving=grilled',
    icon: 'flame',
  },
  {
    type: 'technique',
    presentation: 'story',
    eyebrow: 'Craft',
    label: 'Fermentation',
    sublabel: 'Pickles, kimchi, and cultured flavors',
    href: '/eat?craving=fermented',
    icon: 'leaf',
  },
  // Ingredient story items from expansion specs
  {
    type: 'ingredient',
    presentation: 'story',
    eyebrow: 'Ingredient',
    label: 'Seasonal produce',
    sublabel: 'Cook with what is good right now',
    href: '/ingredients',
    icon: 'market',
  },
  // Vibe story items from expansion specs
  {
    type: 'vibe',
    presentation: 'story',
    eyebrow: 'Vibe',
    label: 'Cozy dinner',
    sublabel: 'Comfort, warmth, and intimate evenings',
    href: '/eat?craving=cozy',
    icon: 'comfort',
  },
  {
    type: 'vibe',
    presentation: 'story',
    eyebrow: 'Experience',
    label: 'Elevated dining',
    sublabel: 'Polished, premium, and special',
    href: '/chefs?priceRange=premium&serviceType=private_dinner',
    icon: 'crown',
  },
  // Service format story items from expansion specs
  {
    type: 'service',
    presentation: 'story',
    eyebrow: 'Format',
    label: 'Grazing table',
    sublabel: 'Casual boards and shared spreads',
    href: '/chefs?serviceType=catering&q=grazing',
    icon: 'small_plates',
  },
  {
    type: 'service',
    presentation: 'story',
    eyebrow: 'Easy',
    label: 'Drop-off meals',
    sublabel: 'Chef-prepared, delivered to your door',
    href: '/chefs?serviceType=catering&q=drop+off',
    icon: 'stack',
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
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/eat?craving=braised',
    icon: 'comfort',
    sublabel: 'Try a slow braise',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/eat?craving=fermented',
    icon: 'leaf',
    sublabel: 'Explore fermented flavors',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/eat?craving=cozy',
    icon: 'comfort',
    sublabel: 'Make it cozy tonight',
  },
  {
    type: 'surprise',
    label: 'Surprise me',
    href: '/chefs?cuisine=mediterranean&serviceType=private_dinner',
    icon: 'leaf',
    sublabel: 'Mediterranean private dinner',
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

type DiscoveryRowRole = 'cuisine' | 'mobile' | 'craving' | 'intent'

const DISCOVERY_ROW_ROLES: DiscoveryRowRole[] = ['cuisine', 'mobile', 'craving', 'intent']
const DISCOVERY_PINNED_STORAGE_KEY = 'cf:public-discovery:pinned-items'
const DISCOVERY_HIDDEN_STORAGE_KEY = 'cf:public-discovery:hidden-items'
const DISCOVERY_TASTE_ROTATION_KEY = 'cf:public-discovery:taste-rotation-count'
const DISCOVERY_STORAGE_LIMIT = 24

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
  mobile: { base: 0.6, wave: 0.06, period: 12800, phase: 1.3, secondaryRatio: 0.43 },
  cuisine: { base: 0.92, wave: 0.07, period: 10400, phase: 0.0, secondaryRatio: 0.5 },
  // craving: lively appetite-driven — more speed variation, shorter wave cycle
  craving: { base: 0.52, wave: 0.05, period: 17200, phase: 2.4, secondaryRatio: 0.46 },
  // intent: calm service-oriented — slow drift, long period, feels intentional
  intent: { base: 0.72, wave: 0.1, period: 8600, phase: 4.6, secondaryRatio: 0.36 },
}

function getRowSpeed(role: DiscoveryRowRole, time: number) {
  const m = ROW_MOTION[role]
  const wave = Math.sin(time / m.period + m.phase) * m.wave
  const secondaryWave = Math.sin(time / (m.period * m.secondaryRatio) + m.phase) * m.wave * 0.35
  return Math.max(0.38, m.base + wave + secondaryWave)
}

const FEEDBACK_ITEM_TYPES = new Set<DiscoveryItemType>([
  'featured_chef',
  'chef_pick',
  'story',
  'surprise',
  'saved',
  'location',
  'culinary_signal',
  'special_dining',
  'technique',
  'ingredient',
  'vibe',
])

function shouldShowDiscoveryFeedback(item: DiscoveryRailItem): boolean {
  return item.presentation === 'story' || FEEDBACK_ITEM_TYPES.has(item.type)
}

function isSelectableDiscoveryItem(item: DiscoveryRailItem): boolean {
  return getDiscoveryRailContract(item.type).filterFacets.length > 0
}

function isSelectedDiscoveryItem(
  filters: DiscoveryFilterState,
  item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>
): boolean {
  const selection = selectionFromRailItem(item)
  return filters.selectedRailItems.some(
    (entry) => entry.type === selection.type && entry.value === selection.value
  )
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
/** Converts a FeaturedChefRailData record into a DiscoveryRailItem for the rail. */
function chefToRailItem(chef: FeaturedChefRailData): DiscoveryRailItem {
  const parts: string[] = []
  if (chef.primaryCuisine) {
    parts.push(chef.primaryCuisine.charAt(0).toUpperCase() + chef.primaryCuisine.slice(1))
  }
  if (chef.city && chef.state) {
    parts.push(`${chef.city}, ${chef.state}`)
  } else if (chef.city) {
    parts.push(chef.city)
  }
  // Proof enrichment: specialty or price tier as third segment (max 3 parts)
  if (parts.length < 3 && chef.specialty) {
    parts.push(chef.specialty)
  } else if (parts.length < 3 && chef.priceTier) {
    const tierLabels: Record<string, string> = {
      budget: 'Budget-friendly',
      mid: 'Mid-range',
      premium: 'Premium',
      luxury: 'Luxury',
    }
    const label = tierLabels[chef.priceTier]
    if (label) parts.push(label)
  }
  // Dietary strengths if still room (max 3 total)
  if (parts.length < 3 && chef.dietaryStrengths && chef.dietaryStrengths.length > 0) {
    parts.push(chef.dietaryStrengths.slice(0, 2).join(', '))
  }

  const eyebrow = chef.acceptingInquiries === true ? 'Available chef' : 'Featured chef'

  return {
    type: 'featured_chef',
    presentation: 'story',
    eyebrow,
    label: chef.displayName,
    href: `/chef/${chef.slug}`,
    icon: 'chef',
    sublabel: parts.length > 0 ? parts.join(' \u00b7 ') : undefined,
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

function getDiscoveryItemKey(item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>): string {
  return `${item.type}:${item.href}:${item.label}`.toLowerCase()
}

function readStoredDiscoveryItems(storageKey: string): DiscoveryRailItem[] {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey) ?? '[]'
    ) as DiscoveryRailItem[]
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is DiscoveryRailItem =>
        Boolean(
          item &&
          typeof item.type === 'string' &&
          typeof item.label === 'string' &&
          typeof item.href === 'string'
        )
      )
      .slice(0, DISCOVERY_STORAGE_LIMIT)
  } catch {
    return []
  }
}

function writeStoredDiscoveryItems(storageKey: string, items: DiscoveryRailItem[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items.slice(0, DISCOVERY_STORAGE_LIMIT)))
  } catch {
    // Local storage is a progressive enhancement.
  }
}

function readHiddenDiscoveryKeys(): Set<string> {
  return new Set(readStoredDiscoveryItems(DISCOVERY_HIDDEN_STORAGE_KEY).map(getDiscoveryItemKey))
}

function readNextTasteRotationSeed(): string {
  if (typeof window === 'undefined') return 'server'

  try {
    const today = new Date().toISOString().slice(0, 10)
    const currentRaw = window.sessionStorage.getItem(DISCOVERY_TASTE_ROTATION_KEY)
    const current = currentRaw ? JSON.parse(currentRaw) : null
    const nextCount =
      current && current.day === today && Number.isInteger(current.count) ? current.count + 1 : 1

    window.sessionStorage.setItem(
      DISCOVERY_TASTE_ROTATION_KEY,
      JSON.stringify({ day: today, count: nextCount })
    )

    return `${today}:${nextCount}`
  } catch {
    return `${Date.now()}`
  }
}

type DiscoveryProfileApiItem = {
  itemType: DiscoveryItemType
  itemValue: string
  itemLabel: string | null
  href: string | null
  metadata?: Record<string, unknown> | null
}

type DiscoveryProfileApiResponse = {
  ok?: boolean
  authenticated?: boolean
  profile?: {
    pinned?: DiscoveryProfileApiItem[]
    dismissed?: DiscoveryProfileApiItem[]
  }
}

function profileItemToRailItem(item: DiscoveryProfileApiItem): DiscoveryRailItem | null {
  if (!item.href) return null

  const metadata = item.metadata ?? {}
  const icon = typeof metadata.item_icon === 'string' ? metadata.item_icon : undefined
  const sublabel =
    typeof metadata.item_sublabel === 'string' ? metadata.item_sublabel : 'Saved discovery shortcut'

  return {
    type: item.itemType,
    label: item.itemLabel ?? item.itemValue,
    href: item.href,
    icon: icon as DiscoveryIconKey | undefined,
    presentation: 'story',
    eyebrow: 'Pinned',
    sublabel,
  }
}

function toStoredDiscoveryItem(item: DiscoveryRailItem): DiscoveryRailItem {
  const { debugScore: _debugScore, ...stored } = item
  return stored
}

function toPinnedDiscoveryItem(item: DiscoveryRailItem): DiscoveryRailItem {
  const stored = toStoredDiscoveryItem(item)
  return {
    ...stored,
    presentation: 'story',
    eyebrow: 'Pinned',
    sublabel: stored.sublabel ?? 'Saved discovery shortcut',
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
const MOMENTUM_MIN_VELOCITY = 0.025
const MOMENTUM_MAX_VELOCITY = 3.2
const MOMENTUM_DECAY_PER_FRAME = 0.94
const MOMENTUM_MAX_FRAME_MS = 64

function getLoopedScrollLeft(el: HTMLDivElement, nextScrollLeft: number): number {
  const halfWidth = el.scrollWidth / 2
  if (halfWidth <= el.clientWidth) {
    return Math.max(0, Math.min(nextScrollLeft, el.scrollWidth - el.clientWidth))
  }

  let next = nextScrollLeft
  while (next < 0) next += halfWidth
  while (next >= halfWidth) next -= halfWidth
  return next
}

function applyLoopedScrollDelta(el: HTMLDivElement, delta: number): void {
  el.scrollLeft = getLoopedScrollLeft(el, el.scrollLeft + delta)
}

function capturePointerSafely(el: HTMLDivElement, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    // Synthetic touch verification and older browsers can lack an active pointer capture target.
  }
}

function releasePointerSafely(el: HTMLDivElement, pointerId: number): void {
  try {
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
  } catch {
    // Pointer capture may already be gone after touch cancellation.
  }
}

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
  /** Compact keeps homepage discovery secondary to search by collapsing the rail into one scrollable row. */
  variant?: 'full' | 'compact'
}

interface DiscoveryPillProps {
  item: DiscoveryRailItem
  locationContext: HomepageLocationContext | null
  compact?: boolean
  blockLocationContext?: boolean
  rowRole: DiscoveryRowRole
  rowPosition: number
  rowItemCount: number
  isDuplicate?: boolean
  isPinned?: boolean
  isSelectable?: boolean
  isSelected?: boolean
  interactionReady?: boolean
  onPinToggle?: (item: DiscoveryRailItem, pinned: boolean) => void
  onHide?: (item: DiscoveryRailItem) => void
  onUnhide?: (item: DiscoveryRailItem) => void
  onSelectToggle?: (item: DiscoveryRailItem, rowRole: DiscoveryRowRole) => void
}

function DiscoveryPill({
  item,
  locationContext,
  compact = false,
  blockLocationContext = false,
  rowRole,
  rowPosition,
  rowItemCount,
  isDuplicate = false,
  isPinned = false,
  isSelectable = false,
  isSelected = false,
  interactionReady = true,
  onPinToggle,
  onHide,
  onUnhide,
  onSelectToggle,
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
  const isVisualCard = !compact && item.presentation === 'visual_card'
  const isStory = !compact && item.presentation === 'story'
  const showFeedbackControls = !isDuplicate && shouldShowDiscoveryFeedback(item)
  const itemMeta = getDiscoveryRailItemDisplayMeta(item, locationContext)

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

  const glowColor = isCard || isVisualCard ? (CUISINE_GLOW_COLORS[item.label] ?? null) : null
  const glowStyle: React.CSSProperties | undefined = glowColor
    ? ({ '--cuisine-glow': glowColor, '--card-glow': glowColor } as React.CSSProperties)
    : undefined
  // Category-specific pill glow class for Row 2 items
  const pillGlowClass = (() => {
    switch (item.type) {
      case 'occasion':
        return 'pill-glow-occasion'
      case 'service':
        return 'pill-glow-service'
      case 'dietary':
        return 'pill-glow-dietary'
      case 'time':
        return 'pill-glow-time'
      case 'group_size':
      case 'price':
        return 'pill-glow-group'
      default:
        return ''
    }
  })()
  const pillRef = useRef<HTMLAnchorElement | null>(null)
  const impressionTrackedRef = useRef(false)
  const [feedbackAction, setFeedbackAction] = useState<'love' | 'hide' | null>(null)
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

  const onMoreLikeClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDuplicate) return

      setFeedbackAction('love')
      trackDiscoveryInteraction('love', item, trackingContext)
      showDiscoveryLoveToast(item)
    },
    [isDuplicate, item, trackingContext]
  )

  const onPinClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDuplicate) return

      const nextPinned = !isPinned
      onPinToggle?.(item, nextPinned)
      trackDiscoveryInteraction(nextPinned ? 'pin' : 'unpin', item, {
        ...trackingContext,
        rowRole,
      })
      showDiscoveryPinToast(item, nextPinned)
    },
    [isDuplicate, isPinned, item, onPinToggle, rowRole, trackingContext]
  )

  const onHideClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDuplicate) return

      setFeedbackAction('hide')
      onHide?.(item)
      trackDiscoveryInteraction('dismiss', item, trackingContext)
      showDiscoveryHideToast(item, () => {
        setFeedbackAction(null)
        onUnhide?.(item)
        trackDiscoveryInteraction('undismiss', item, trackingContext)
      })
    },
    [isDuplicate, item, onHide, onUnhide, trackingContext]
  )

  return (
    <span
      className={[
        'group/feedback relative inline-flex shrink-0 snap-start',
        isVisualCard ? 'min-w-[160px] sm:min-w-[180px]' : '',
        item.type === 'featured_chef' && isStory ? 'min-w-[320px]' : '',
      ].join(' ')}
    >
      {isVisualCard ? (
        <a
          ref={pillRef as React.Ref<HTMLAnchorElement>}
          href={href}
          draggable={false}
          className="cuisine-visual-card"
          aria-hidden={isDuplicate ? true : undefined}
          tabIndex={isDuplicate ? -1 : undefined}
          style={{ '--card-glow': glowColor ?? undefined, ...glowStyle } as React.CSSProperties}
          title={`${itemMeta.reason} Source: ${itemMeta.source}. Freshness: ${itemMeta.freshness}.`}
          data-discovery-lane={itemMeta.lane}
          data-discovery-source={itemMeta.source}
          data-discovery-freshness={itemMeta.freshness}
          onClick={(event) => {
            if (!isDuplicate) {
              trackDiscoveryClick(item, trackingContext)
              window.dispatchEvent(new Event('cf:discovery-recents-updated'))
            }
          }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-1 p-3">
            <span className="card-emoji">{DISCOVERY_EMOJI_MAP[item.label] ?? emoji ?? '🍽️'}</span>
            <span className="text-xs font-medium text-white">{item.label}</span>
            {countryLabel && <span className="text-[10px] text-white/50">{countryLabel}</span>}
          </div>
          {flagUrls.length > 0 && <img src={flagUrls[0]} className="card-flag" alt="" />}
        </a>
      ) : (
        <Link
          ref={pillRef}
          href={href}
          draggable={false}
          style={glowStyle}
          className={[
            'discovery-pill group shrink-0 border font-semibold leading-none tracking-normal transition-all duration-200',
            pillGlowClass,
            isStory
              ? 'inline-flex h-[106px] w-[210px] min-w-[210px] max-w-[210px] flex-col items-start justify-between overflow-hidden rounded-xl px-3 py-2.5 text-left text-[13px] sm:h-[112px] sm:w-[232px] sm:min-w-[232px] sm:max-w-[232px] sm:px-3.5 sm:py-3'
              : isCard && !compact
                ? // Card layout: tall rect, text pinned to bottom-center
                  'inline-flex min-h-[82px] w-[96px] min-w-[96px] max-w-[96px] flex-col items-center justify-end gap-0 overflow-hidden rounded-xl px-2 py-2 text-[12px] sm:min-h-[96px] sm:w-[116px] sm:min-w-[116px] sm:max-w-[116px] sm:py-2.5 sm:text-[13px]'
                : // Standard pill layout
                  'inline-flex items-center rounded-full',
            !isCard && !isStory && (showIconBadge ? 'gap-2' : 'gap-0'),
            !isCard &&
              !isStory &&
              (primary
                ? compact
                  ? 'min-h-[36px] px-3 py-1.5 text-[12px]'
                  : 'min-h-[46px] px-4 py-2.5 text-[14px]'
                : 'min-h-[40px] px-3.5 py-2 text-[13px]'),
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0e08] active:translate-y-0',
            hasFlagBg
              ? 'relative overflow-hidden border-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-white/45 hover:text-white'
              : [isStory ? 'backdrop-blur-xl' : 'backdrop-blur-md', style.link].join(' '),
            isSelected
              ? 'border-[#e8a96b]/90 ring-2 ring-[#e8a96b]/65 ring-offset-2 ring-offset-[#1a0e08]'
              : '',
            isSelectable && !interactionReady ? 'pointer-events-none' : '',
          ].join(' ')}
          aria-hidden={isDuplicate ? true : undefined}
          aria-disabled={isSelectable && !interactionReady ? true : undefined}
          aria-pressed={isSelectable && !isDuplicate ? isSelected : undefined}
          data-selected={isSelectable && isSelected && !isDuplicate ? 'true' : undefined}
          data-discovery-lane={itemMeta.lane}
          data-discovery-source={itemMeta.source}
          data-discovery-freshness={itemMeta.freshness}
          title={`${itemMeta.reason} Source: ${itemMeta.source}. Freshness: ${itemMeta.freshness}.`}
          tabIndex={isDuplicate || (isSelectable && !interactionReady) ? -1 : undefined}
          onClick={(event) => {
            if (isSelectable && !interactionReady) {
              event.preventDefault()
              return
            }

            if (!isDuplicate && isSelectable && onSelectToggle) {
              event.preventDefault()
              onSelectToggle(item, rowRole)
              event.currentTarget.blur()
              trackDiscoveryInteraction('click', item, trackingContext)
              window.dispatchEvent(new Event('cf:discovery-recents-updated'))
              return
            }

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
          {item.sublabel && !hasFlagBg && !isStory && (
            <span
              className={[
                'max-w-[9rem] truncate text-[11px] font-medium leading-none opacity-65',
                hasFlagBg ? 'relative z-10' : '',
              ].join(' ')}
              style={textOutlineStyle}
            >
              {item.sublabel}
            </span>
          )}
          {isStory && (
            <span className="flex w-full flex-col gap-1">
              <span className="line-clamp-1 max-w-full text-[11px] font-medium leading-snug text-white/70">
                {item.reason ?? item.sublabel ?? itemMeta.reason}
              </span>
              <span className="flex max-w-full items-center justify-between gap-2 text-[10px] font-semibold leading-none text-white/45">
                <span className="truncate">{itemMeta.source}</span>
                <span className="shrink-0 text-[#ffd6a3]/75">{itemMeta.actionLabel}</span>
              </span>
            </span>
          )}
        </Link>
      )}
      {showFeedbackControls && (
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
            onClick={onMoreLikeClick}
          >
            <Heart className="h-3 w-3" weight={feedbackAction === 'love' ? 'fill' : 'bold'} />
          </button>
          <button
            type="button"
            className={[
              'grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-black/35 text-white/70 transition-colors hover:border-[#cfd9a0]/60 hover:bg-[#242516]/90 hover:text-[#eef4bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfd9a0]/55',
              isPinned ? 'border-[#cfd9a0]/70 bg-[#242516] text-[#eef4bd]' : '',
            ].join(' ')}
            aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
            aria-pressed={isPinned}
            title={isPinned ? 'Unpin shortcut' : 'Pin shortcut'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onPinClick}
          >
            <Pin className="h-3 w-3" weight={isPinned ? 'fill' : 'bold'} />
          </button>
          <button
            type="button"
            className={[
              'grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-black/35 text-white/70 transition-colors hover:border-[#efb49b]/60 hover:bg-[#361b14]/90 hover:text-[#ffd5c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb49b]/55',
              feedbackAction === 'hide' ? 'border-[#efb49b]/70 bg-[#361b14] text-[#ffd5c3]' : '',
            ].join(' ')}
            aria-label={`Hide ${item.label}`}
            aria-pressed={feedbackAction === 'hide'}
            title="Hide this"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onHideClick}
          >
            <X className="h-3 w-3" weight="bold" />
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
  variant = 'full',
}: CuisineMarqueeProps) {
  const rowRefs = useRef<Record<DiscoveryRowRole, HTMLDivElement | null>>({
    cuisine: null,
    mobile: null,
    craving: null,
    intent: null,
  })
  const hoveredRowRef = useRef<HTMLDivElement | null>(null)
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
    pointerId: number
    pointerType: string
    startX: number
    lastX: number
    lastTime: number
    scrollLeft: number
    velocity: number
    moved: boolean
  } | null>(null)
  const syntheticDragState = useRef<{
    active: boolean
    role: DiscoveryRowRole | null
    pointerId: number
    startX: number
    scrollLeft: number
    moved: boolean
  } | null>(null)
  const momentumState = useRef<
    Record<
      DiscoveryRowRole,
      { raf: number; velocity: number; lastTime: number; el: HTMLDivElement } | null
    >
  >({
    cuisine: null,
    mobile: null,
    craving: null,
    intent: null,
  })
  // Preserves the "moved" flag across the pointerup→click event gap.
  // dragState is nulled in onPointerUp (before click fires), so we need
  // a separate ref to know whether the last gesture was a drag.
  const dragMovedRef = useRef(false)
  const dragMomentumFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [diningMoment, setDiningMoment] = useState<DiningMoment>('evening')
  const [recentItems, setRecentItems] = useState<DiscoveryRailItem[]>([])
  const [pinnedItems, setPinnedItems] = useState<DiscoveryRailItem[]>([])
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set())
  const [surpriseItem, setSurpriseItem] = useState<DiscoveryRailItem>(SURPRISE_TARGETS[0])
  const [profileAuthenticated, setProfileAuthenticated] = useState<boolean | null>(null)
  const [tasteRotationSeed, setTasteRotationSeed] = useState('server')
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [selectedFilters, setSelectedFilters] = useState<DiscoveryFilterState>(() =>
    emptyDiscoveryFilterState()
  )
  const [fallbackStatus, setFallbackStatus] = useState<
    'idle' | 'checking' | 'has_results' | 'no_results'
  >('idle')
  const [fallbackAlternatives, setFallbackAlternatives] = useState<FallbackAlternative[]>([])
  const [fallbackBroadenedLabel, setFallbackBroadenedLabel] = useState<string | null>(null)
  const [interactionReady, setInteractionReady] = useState(false)
  const autoScrollEnabledRef = useRef(true)

  useEffect(() => {
    setInteractionReady(true)
    setDiningMoment(getDiningMoment())
    setSurpriseItem(SURPRISE_TARGETS[Math.floor(Math.random() * SURPRISE_TARGETS.length)])
    setTasteRotationSeed(readNextTasteRotationSeed())
  }, [])

  useEffect(() => {
    if (profileAuthenticated !== false) return

    setRecentItems(readRecentDiscoveryItems())
    setPinnedItems(
      readStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY).map(toPinnedDiscoveryItem)
    )
    setHiddenKeys(readHiddenDiscoveryKeys())

    function refreshStoredDiscoveryState() {
      setRecentItems(readRecentDiscoveryItems())
      setPinnedItems(
        readStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY).map(toPinnedDiscoveryItem)
      )
      setHiddenKeys(readHiddenDiscoveryKeys())
    }

    window.addEventListener('storage', refreshStoredDiscoveryState)
    window.addEventListener('focus', refreshStoredDiscoveryState)
    window.addEventListener('cf:discovery-recents-updated', refreshStoredDiscoveryState)
    window.addEventListener('cf:discovery-shortcuts-updated', refreshStoredDiscoveryState)
    return () => {
      window.removeEventListener('storage', refreshStoredDiscoveryState)
      window.removeEventListener('focus', refreshStoredDiscoveryState)
      window.removeEventListener('cf:discovery-recents-updated', refreshStoredDiscoveryState)
      window.removeEventListener('cf:discovery-shortcuts-updated', refreshStoredDiscoveryState)
    }
  }, [profileAuthenticated])

  useEffect(() => {
    let cancelled = false

    async function hydratePersistentProfile() {
      try {
        const response = await fetch('/api/discovery/profile', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        const data = (await response.json()) as DiscoveryProfileApiResponse
        if (cancelled) return
        if (!data.authenticated || !data.profile) {
          setProfileAuthenticated(false)
          return
        }

        const serverPinned = (data.profile.pinned ?? [])
          .map(profileItemToRailItem)
          .filter((item): item is DiscoveryRailItem => item !== null)
        const serverDismissed = (data.profile.dismissed ?? [])
          .map(profileItemToRailItem)
          .filter((item): item is DiscoveryRailItem => item !== null)

        setProfileAuthenticated(true)
        setRecentItems([])
        setPinnedItems(serverPinned.map(toPinnedDiscoveryItem))
        setHiddenKeys(new Set(serverDismissed.map(getDiscoveryItemKey)))
      } catch {
        // Persistent profile hydration is an authenticated enhancement.
        if (!cancelled) setProfileAuthenticated(false)
      }
    }

    hydratePersistentProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const isHiddenItem = useCallback(
    (item: DiscoveryRailItem) => hiddenKeys.has(getDiscoveryItemKey(item)),
    [hiddenKeys]
  )

  const isPinnedItem = useCallback(
    (item: DiscoveryRailItem) =>
      pinnedItems.some((pinned) => getDiscoveryItemKey(pinned) === getDiscoveryItemKey(item)),
    [pinnedItems]
  )

  const filterHiddenItems = useCallback(
    (items: DiscoveryRailItem[]) => items.filter((item) => !isHiddenItem(item)),
    [isHiddenItem]
  )

  const handlePinToggle = useCallback(
    (item: DiscoveryRailItem, pinned: boolean) => {
      const itemKey = getDiscoveryItemKey(item)
      if (profileAuthenticated !== false) {
        setPinnedItems((current) =>
          pinned
            ? [
                toPinnedDiscoveryItem(item),
                ...current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey),
              ]
            : current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey)
        )
        return
      }

      const current = readStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY)
      const next = pinned
        ? [
            toPinnedDiscoveryItem(item),
            ...current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey),
          ]
        : current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey)

      writeStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY, next)
      setPinnedItems(next.map(toPinnedDiscoveryItem))
      window.dispatchEvent(new Event('cf:discovery-shortcuts-updated'))
    },
    [profileAuthenticated]
  )

  const handleHide = useCallback(
    (item: DiscoveryRailItem) => {
      const itemKey = getDiscoveryItemKey(item)
      if (profileAuthenticated !== false) {
        setPinnedItems((current) =>
          current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey)
        )
        setHiddenKeys((current) => new Set([...current, itemKey]))
        return
      }

      const current = readStoredDiscoveryItems(DISCOVERY_HIDDEN_STORAGE_KEY)
      const next = [
        toStoredDiscoveryItem(item),
        ...current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey),
      ]
      const nextPinned = readStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY).filter(
        (entry) => getDiscoveryItemKey(entry) !== itemKey
      )

      writeStoredDiscoveryItems(DISCOVERY_HIDDEN_STORAGE_KEY, next)
      writeStoredDiscoveryItems(DISCOVERY_PINNED_STORAGE_KEY, nextPinned)
      setPinnedItems(nextPinned.map(toPinnedDiscoveryItem))
      setHiddenKeys(new Set(next.map(getDiscoveryItemKey)))
      window.dispatchEvent(new Event('cf:discovery-shortcuts-updated'))
    },
    [profileAuthenticated]
  )

  const handleUnhide = useCallback(
    (item: DiscoveryRailItem) => {
      const itemKey = getDiscoveryItemKey(item)
      if (profileAuthenticated !== false) {
        setHiddenKeys((current) => {
          const next = new Set(current)
          next.delete(itemKey)
          return next
        })
        return
      }

      const current = readStoredDiscoveryItems(DISCOVERY_HIDDEN_STORAGE_KEY)
      const next = current.filter((entry) => getDiscoveryItemKey(entry) !== itemKey)
      writeStoredDiscoveryItems(DISCOVERY_HIDDEN_STORAGE_KEY, next)
      setHiddenKeys(new Set(next.map(getDiscoveryItemKey)))
      window.dispatchEvent(new Event('cf:discovery-shortcuts-updated'))
    },
    [profileAuthenticated]
  )

  const scheduleResumeRow = useCallback((role: DiscoveryRowRole) => {
    const t = resumeTimers.current[role]
    if (t) clearTimeout(t)
    resumeTimers.current[role] = setTimeout(() => {
      setRowPaused((prev) => ({ ...prev, [role]: false }))
      resumeTimers.current[role] = null
    }, RESUME_DELAY)
  }, [])

  const handleSelectionToggle = useCallback(
    (item: DiscoveryRailItem, rowRole: DiscoveryRowRole) => {
      setSelectedFilters((current) => toggleDiscoveryRailFilter(current, item))
      const t = resumeTimers.current[rowRole]
      if (t) {
        clearTimeout(t)
        resumeTimers.current[rowRole] = null
      }
      setRowPaused((current) => (current[rowRole] ? { ...current, [rowRole]: false } : current))
    },
    []
  )

  const clearSelections = useCallback(() => {
    setSelectedFilters(emptyDiscoveryFilterState())
    setFallbackStatus('idle')
    setFallbackAlternatives([])
    setFallbackBroadenedLabel(null)
  }, [])

  // Debounced zero-results check — fires when filter selections change
  useEffect(() => {
    if (isDiscoveryFilterStateEmpty(selectedFilters)) {
      setFallbackStatus('idle')
      setFallbackAlternatives([])
      setFallbackBroadenedLabel(null)
      return
    }

    setFallbackStatus('checking')
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        const cuisine = selectedFilters.cuisines[0] ?? ''
        const dietary = selectedFilters.dietary[0] ?? ''
        const serviceType = selectedFilters.fulfillment ?? ''
        const occasion = selectedFilters.occasion ?? ''
        if (cuisine) params.set('cuisine', cuisine)
        if (dietary) params.set('dietary', dietary)
        if (serviceType) params.set('serviceType', serviceType)
        if (occasion) params.set('occasion', occasion)

        const response = await fetch(`/api/discovery/fallback-check?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          setFallbackStatus('idle')
          return
        }
        const data = (await response.json()) as {
          count: number
          hasAlternatives: boolean
          alternatives: FallbackAlternative[]
          broadenedLabel: string | null
        }
        if (data.count > 0) {
          setFallbackStatus('has_results')
          setFallbackAlternatives([])
          setFallbackBroadenedLabel(null)
        } else if (data.hasAlternatives) {
          setFallbackStatus('no_results')
          setFallbackAlternatives(data.alternatives)
          setFallbackBroadenedLabel(data.broadenedLabel)
        } else {
          setFallbackStatus('has_results')
          setFallbackAlternatives([])
          setFallbackBroadenedLabel(null)
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setFallbackStatus('idle')
        }
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [selectedFilters])

  const pauseRow = useCallback((role: DiscoveryRowRole) => {
    const t = resumeTimers.current[role]
    if (t) {
      clearTimeout(t)
      resumeTimers.current[role] = null
    }
    setRowPaused((prev) => (prev[role] ? prev : { ...prev, [role]: true }))
  }, [])

  const cancelMomentum = useCallback((role?: DiscoveryRowRole | null) => {
    const roles = role ? [role] : DISCOVERY_ROW_ROLES
    roles.forEach((rowRole) => {
      const active = momentumState.current[rowRole]
      if (!active) return
      cancelAnimationFrame(active.raf)
      momentumState.current[rowRole] = null
    })
  }, [])

  const startMomentum = useCallback(
    (role: DiscoveryRowRole, el: HTMLDivElement, initialVelocity: number) => {
      cancelMomentum(role)
      if (reducedMotion.current) {
        scheduleResumeRow(role)
        return
      }

      const clampedVelocity = Math.max(
        -MOMENTUM_MAX_VELOCITY,
        Math.min(MOMENTUM_MAX_VELOCITY, initialVelocity)
      )
      if (Math.abs(clampedVelocity) < MOMENTUM_MIN_VELOCITY) {
        scheduleResumeRow(role)
        return
      }

      pauseRow(role)
      applyLoopedScrollDelta(
        el,
        Math.sign(clampedVelocity) * Math.max(18, Math.min(36, Math.abs(clampedVelocity) * 24))
      )

      const tick = (time: number) => {
        const active = momentumState.current[role]
        if (!active) return

        if (reducedMotion.current || !pageVisibleRef.current || !containerVisibleRef.current) {
          momentumState.current[role] = null
          scheduleResumeRow(role)
          return
        }

        const dt = active.lastTime ? Math.min(time - active.lastTime, MOMENTUM_MAX_FRAME_MS) : 16.67
        active.lastTime = time

        if (dt > 0) {
          applyLoopedScrollDelta(active.el, active.velocity * dt)
          active.velocity *= Math.pow(MOMENTUM_DECAY_PER_FRAME, dt / 16.67)
        }

        if (Math.abs(active.velocity) < MOMENTUM_MIN_VELOCITY) {
          momentumState.current[role] = null
          scheduleResumeRow(role)
          return
        }

        active.raf = requestAnimationFrame(tick)
      }

      momentumState.current[role] = {
        raf: requestAnimationFrame(tick),
        velocity: clampedVelocity,
        lastTime: 0,
        el,
      }
    },
    [cancelMomentum, pauseRow, scheduleResumeRow]
  )

  useEffect(() => {
    const timers = resumeTimers.current
    return () => {
      DISCOVERY_ROW_ROLES.forEach((role) => {
        const t = timers[role]
        if (t) clearTimeout(t)
      })
      cancelMomentum()
    }
  }, [cancelMomentum])

  useEffect(() => {
    rowPausedRef.current = rowPaused
  }, [rowPaused])

  useEffect(() => {
    autoScrollEnabledRef.current = autoScrollEnabled
    if (autoScrollEnabled) lastTimeRef.current = 0
  }, [autoScrollEnabled])

  const toggleAutoScroll = useCallback(() => {
    setAutoScrollEnabled((enabled) => !enabled)
  }, [])

  // ── Pointer handlers (unified mouse + touch) ──

  // Block navigation when the gesture was a drag, not a tap.
  // dragMovedRef persists across the pointerup→click gap; cleared after use.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const onSyntheticPointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      syntheticDragState.current = {
        active: true,
        role,
        pointerId: e.pointerId,
        startX: e.clientX,
        scrollLeft: e.currentTarget.scrollLeft,
        moved: false,
      }
      if (role) {
        cancelMomentum(role)
        pauseRow(role)
      }
    },
    [cancelMomentum, pauseRow]
  )

  const onSyntheticPointerMoveCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = syntheticDragState.current
      if (!state?.active || state.pointerId !== e.pointerId) return
      const dx = e.clientX - state.startX
      if (Math.abs(dx) <= DRAG_THRESHOLD) return
      state.moved = true
      dragMovedRef.current = true
      e.currentTarget.scrollLeft = getLoopedScrollLeft(e.currentTarget, state.scrollLeft - dx)
      if (dragMomentumFallbackTimer.current) clearTimeout(dragMomentumFallbackTimer.current)
      const row = e.currentTarget
      const role = state.role
      dragMomentumFallbackTimer.current = setTimeout(() => {
        applyLoopedScrollDelta(row, 40)
        if (role) startMomentum(role, row, 0.48)
      }, 80)
    },
    [startMomentum]
  )

  const onSyntheticPointerUpCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = syntheticDragState.current
      if (!state?.active || state.pointerId !== e.pointerId) return
      syntheticDragState.current = null
      if (!state.moved) return
      applyLoopedScrollDelta(e.currentTarget, 40)
      if (state.role) startMomentum(state.role, e.currentTarget, 0.48)
    },
    [startMomentum]
  )

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const role = (e.currentTarget.getAttribute('data-discovery-row') ??
      null) as DiscoveryRowRole | null
    hoveredRowRef.current = e.currentTarget
    if (role) {
      const t = resumeTimers.current[role]
      if (t) clearTimeout(t)
    }
  }, [])

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (hoveredRowRef.current === e.currentTarget) hoveredRowRef.current = null
      if (!role) return
      const isThisRowDragged = dragState.current?.active && dragState.current.role === role
      if (!isThisRowDragged) scheduleResumeRow(role)
    },
    [scheduleResumeRow]
  )

  // ── Auto-scroll via requestAnimationFrame ──
  useEffect(() => {
    if (!interactionReady) return

    const getRole = (el: HTMLDivElement): DiscoveryRowRole | null =>
      (el.getAttribute('data-discovery-row') ?? null) as DiscoveryRowRole | null

    const handlePointerDown = (event: PointerEvent) => {
      const el = event.currentTarget as HTMLDivElement
      const role = getRole(el)
      if (role) cancelMomentum(role)
      capturePointerSafely(el, event.pointerId)
      if (role) pauseRow(role)
      if (dragMomentumFallbackTimer.current) clearTimeout(dragMomentumFallbackTimer.current)
      dragMomentumFallbackTimer.current = null
      dragMovedRef.current = false
      const time = event.timeStamp || performance.now()
      dragState.current = {
        active: true,
        role,
        el,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        lastX: event.clientX,
        lastTime: time,
        scrollLeft: el.scrollLeft,
        velocity: 0,
        moved: false,
      }
      dragMomentumFallbackTimer.current = setTimeout(() => {
        const current = dragState.current
        if (!current?.moved) return
        const fallbackVelocity = (current.startX - current.lastX) / 180 || 0.3
        applyLoopedScrollDelta(
          current.el,
          Math.sign(fallbackVelocity) * Math.max(24, Math.min(44, Math.abs(fallbackVelocity) * 28))
        )
        if (current.role) startMomentum(current.role, current.el, fallbackVelocity)
      }, 120)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const state = dragState.current
      if (!state?.active || state.pointerId !== event.pointerId) return
      const dx = event.clientX - state.startX
      if (Math.abs(dx) > DRAG_THRESHOLD) {
        state.moved = true
        dragMovedRef.current = true
      }
      const time = event.timeStamp || performance.now()
      const dt = time - state.lastTime
      if (dt > 0) {
        const instantVelocity = (state.lastX - event.clientX) / dt
        state.velocity = state.velocity * 0.35 + instantVelocity * 0.65
        state.lastTime = time
      }
      state.lastX = event.clientX
      state.el.scrollLeft = getLoopedScrollLeft(state.el, state.scrollLeft - dx)
      if (state.moved) {
        if (dragMomentumFallbackTimer.current) clearTimeout(dragMomentumFallbackTimer.current)
        const fallbackRole = state.role
        const fallbackEl = state.el
        const totalDragVelocity = (state.startX - state.lastX) / 180
        const momentumVelocity =
          Math.abs(state.velocity) >= MOMENTUM_MIN_VELOCITY ? state.velocity : totalDragVelocity
        dragMomentumFallbackTimer.current = setTimeout(() => {
          if (Math.abs(momentumVelocity) < MOMENTUM_MIN_VELOCITY) return
          applyLoopedScrollDelta(
            fallbackEl,
            Math.sign(momentumVelocity) *
              Math.max(24, Math.min(44, Math.abs(momentumVelocity) * 28))
          )
          if (!fallbackRole) return
          if (dragState.current === state) dragState.current = null
          startMomentum(fallbackRole, fallbackEl, momentumVelocity)
        }, 80)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const state = dragState.current
      if (!state) return
      releasePointerSafely(state.el, event.pointerId)
      const role = state.role
      dragState.current = null
      if (!role) return
      const totalDragVelocity = state.moved ? (state.startX - state.lastX) / 180 : 0
      const momentumVelocity =
        Math.abs(state.velocity) >= MOMENTUM_MIN_VELOCITY ? state.velocity : totalDragVelocity
      if (state.moved && Math.abs(momentumVelocity) >= MOMENTUM_MIN_VELOCITY) {
        startMomentum(role, state.el, momentumVelocity)
      } else {
        scheduleResumeRow(role)
      }
    }

    const handlePointerCancel = (event: PointerEvent) => {
      const state = dragState.current
      if (!state) return
      releasePointerSafely(state.el, event.pointerId)
      const role = state.role
      dragState.current = null
      if (role) scheduleResumeRow(role)
    }

    const handleWheel = (event: WheelEvent) => {
      const el = event.currentTarget as HTMLDivElement
      const role = getRole(el)
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        if (role) {
          cancelMomentum(role)
          pauseRow(role)
        }
        applyLoopedScrollDelta(el, event.deltaX || event.deltaY)
        if (role) scheduleResumeRow(role)
      }
    }

    const rows = DISCOVERY_ROW_ROLES.map((role) => rowRefs.current[role]).filter(
      (el): el is HTMLDivElement => Boolean(el)
    )
    rows.forEach((row) => {
      row.addEventListener('pointerdown', handlePointerDown)
      row.addEventListener('pointermove', handlePointerMove)
      row.addEventListener('pointerup', handlePointerUp)
      row.addEventListener('pointercancel', handlePointerCancel)
      row.addEventListener('wheel', handleWheel, { passive: false })
    })
    const handleWindowWheel = (event: WheelEvent) => {
      const row = hoveredRowRef.current
      if (!row) return
      const role = getRole(row)
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault()
        if (role) {
          cancelMomentum(role)
          pauseRow(role)
        }
        applyLoopedScrollDelta(row, event.deltaX || event.deltaY)
        if (role) scheduleResumeRow(role)
      }
    }
    window.addEventListener('wheel', handleWindowWheel, { passive: false })

    return () => {
      if (dragMomentumFallbackTimer.current) clearTimeout(dragMomentumFallbackTimer.current)
      dragMomentumFallbackTimer.current = null
      window.removeEventListener('wheel', handleWindowWheel)
      rows.forEach((row) => {
        row.removeEventListener('pointerdown', handlePointerDown)
        row.removeEventListener('pointermove', handlePointerMove)
        row.removeEventListener('pointerup', handlePointerUp)
        row.removeEventListener('pointercancel', handlePointerCancel)
        row.removeEventListener('wheel', handleWheel)
      })
    }
  }, [cancelMomentum, interactionReady, pauseRow, scheduleResumeRow, startMomentum])

  const onRowFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const role = (e.currentTarget.getAttribute('data-discovery-row') ??
        null) as DiscoveryRowRole | null
      if (role) {
        cancelMomentum(role)
        pauseRow(role)
      }
    },
    [cancelMomentum, pauseRow]
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
      if (role) {
        cancelMomentum(role)
        pauseRow(role)
      }

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
    [cancelMomentum, pauseRow, scheduleResumeRow]
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
      if (
        reducedMotion.current ||
        !autoScrollEnabledRef.current ||
        !pageVisibleRef.current ||
        !containerVisibleRef.current
      ) {
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
          applyLoopedScrollDelta(el, getRowSpeed(role, time) * (dt / 16.67))
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Duplicate each row for seamless looping.
  // Rows are split by purpose first, then personalized and scored.
  const row1 = useMemo(() => {
    // Apply user preference boosting: move matched cuisines to front, keep all others after.
    // This is purely an ordering change — no pills are removed.
    const pool = buildHomepageTasteRailItems({
      seed: tasteRotationSeed,
      boostedCuisineSlugs: userSignals?.boostedCuisines ?? [],
    })
    const tastePool = pool.length > 0 ? pool : CUISINE_POOL
    const locationSmartItems = buildLocationSmartItems(locationContext).filter(
      (item) => item.type === 'culinary_signal'
    )
    const enhancedPool = filterValidRailDestinations(
      filterHiddenItems(dedupeDiscoveryItems([...locationSmartItems.slice(0, 1), ...tastePool]))
    )
    const scoredPool = applyDiscoveryRailScores(
      enhancedPool,
      userSignals,
      {
        role: 'cuisine',
        locationActive: Boolean(locationContext?.location.trim()),
      },
      withDiscoveryDebug
    )
    // Mark the first 16 cuisine items as visual cards for large rendering.
    // Only promote cuisines that have a flag URL entry — cuisines without flags
    // fall back to the standard pill layout which looks intentional rather than broken.
    const visualMarked = scoredPool.map((item, idx) => {
      const hasFlag = item.type === 'cuisine' && Boolean(CUISINE_FLAG_URLS[item.label])
      return idx < 16 && hasFlag && !item.presentation
        ? { ...item, presentation: 'visual_card' as const }
        : item
    })
    return [...visualMarked, ...visualMarked]
  }, [filterHiddenItems, locationContext, tasteRotationSeed, userSignals])

  const row2 = useMemo(() => {
    const pool = filterValidRailDestinations(
      filterHiddenItems(
        dedupeDiscoveryItems([
          ...MOMENT_ITEMS[diningMoment],
          ...COMBO_ITEMS,
          ...INTENT_POOL.filter((item) =>
            ['occasion', 'service', 'time', 'group_size', 'price', 'vibe', 'seasonal'].includes(
              item.type
            )
          ),
          ...SERVICE_POOL.filter((item) =>
            ['occasion', 'service', 'special_dining', 'dietary'].includes(item.type)
          ),
        ])
      )
    )
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
  }, [diningMoment, filterHiddenItems, locationContext, userSignals])

  const row3 = useMemo(() => {
    const chefItems = (featuredChefs ?? []).slice(0, 5).map(chefToRailItem)
    const locationItems = [
      ...buildLocationItems(locationContext),
      ...buildLocationSmartItems(locationContext),
    ]
    const signalItems = (culinarySignals ?? []).slice(0, 3)
    let servicePool = filterHiddenItems(
      dedupeDiscoveryItems([
        ...pinnedItems,
        surpriseItem,
        ...BUYER_INTENT_ITEMS,
        ...STORY_ITEMS,
        ...recentItems,
        ...CRAVING_POOL.filter(
          (item) =>
            item.type === 'chef_pick' || item.type === 'technique' || item.type === 'ingredient'
        ),
        ...INTENT_POOL.filter(
          (item) =>
            item.type === 'saved' || item.type === 'special_dining' || item.type === 'circle'
        ),
      ])
    )
    if (userSignals?.boostedServiceTypes.length) {
      const boosted = servicePool.filter((item) =>
        userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      const rest = servicePool.filter(
        (item) => !userSignals.boostedServiceTypes.some((st) => item.href.includes(st))
      )
      servicePool = [...boosted, ...rest]
    }
    const pool = filterValidRailDestinations(
      buildRow2(servicePool, chefItems, locationItems, signalItems)
    )
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
    featuredChefs,
    filterHiddenItems,
    locationContext,
    pinnedItems,
    recentItems,
    surpriseItem,
    userSignals,
  ])

  const mobileRow2 = useMemo(() => {
    const row2Single = row2.slice(0, Math.floor(row2.length / 2))
    const row3Single = row3.slice(0, Math.floor(row3.length / 2))
    const mobileIntentItems = row3Single
      .filter((item) =>
        [
          'featured_chef',
          'chef_pick',
          'story',
          'surprise',
          'saved',
          'circle',
          'location',
          'culinary_signal',
          'special_dining',
          'technique',
          'ingredient',
          'vibe',
        ].includes(item.type)
      )
      .slice(0, 8)
    const pool = filterValidRailDestinations(
      dedupeDiscoveryItems([
        ...mobileIntentItems.slice(0, 4),
        ...row2Single.slice(0, 10),
        ...mobileIntentItems.slice(4),
        ...row2Single.slice(10),
      ])
    )
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

  const compactItems = useMemo(() => {
    const half = (items: DiscoveryRailItem[]) => items.slice(0, Math.floor(items.length / 2))
    const cuisines = half(row1)
    const plans = half(row2)
    const picks = half(row3)
    const interleaved: DiscoveryRailItem[] = []
    const mixPool = [...plans, ...picks]
    const spacing = Math.max(2, Math.floor(cuisines.length / Math.max(1, mixPool.length)))
    let mixIdx = 0
    for (let i = 0; i < cuisines.length; i++) {
      interleaved.push(cuisines[i])
      if ((i + 1) % spacing === 0 && mixIdx < mixPool.length) {
        interleaved.push(mixPool[mixIdx++])
      }
    }
    while (mixIdx < mixPool.length) {
      interleaved.push(mixPool[mixIdx++])
    }
    const pool = dedupeDiscoveryItems(interleaved)
      .map((item) => ({ ...item, presentation: undefined }))
      .sort((a, b) => {
        if (a.label === 'Italian') return -1
        if (b.label === 'Italian') return 1
        return 0
      })
    return [...pool, ...pool]
  }, [row1, row2, row3])

  const rows: DiscoveryRowConfig[] =
    variant === 'compact'
      ? [
          {
            role: 'cuisine',
            label: 'Discover',
            items: compactItems,
            offsetClassName: 'pl-0',
            ariaLabel: 'Browse compact homepage discovery shortcuts',
          },
        ]
      : [
          {
            role: 'cuisine',
            label: 'Cuisines',
            items: row1,
            offsetClassName: 'pl-0',
            ariaLabel: 'Browse by cuisine and dish type',
          },
          {
            role: 'mobile',
            label: 'For you',
            items: mobileRow2,
            offsetClassName: 'pl-4',
            ariaLabel: 'Curated picks, featured chefs, and local suggestions',
            className: 'sm:hidden',
            labelClassName: 'sm:hidden',
          },
          {
            role: 'craving',
            label: 'Plans',
            items: row2,
            offsetClassName: 'pl-5 sm:pl-16',
            ariaLabel: 'Occasions, services, timing, and group planning',
            className: 'hidden sm:block',
            labelClassName: 'hidden sm:flex',
          },
          {
            role: 'intent',
            label: 'For you',
            items: row3,
            offsetClassName: 'pl-3 sm:pl-28',
            ariaLabel: 'Curated picks, featured chefs, and local suggestions',
            className: 'hidden sm:block',
            labelClassName: 'hidden sm:flex',
          },
        ]

  const ROW_DOTS: Record<string, string> = {
    cuisine: 'bg-amber-400/60',
    mobile: 'bg-sky-400/55',
    craving: 'bg-emerald-400/50',
    intent: 'bg-sky-400/55',
  }
  const controlButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 shadow-sm transition hover:border-[#e8a96b]/40 hover:bg-[#e8a96b]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55 disabled:cursor-not-allowed disabled:opacity-50'
  const compactControlButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 shadow-sm transition hover:border-[#e8a96b]/40 hover:bg-[#e8a96b]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55 disabled:cursor-not-allowed disabled:opacity-50'
  const hasSelectedFilters = !isDiscoveryFilterStateEmpty(selectedFilters)
  const selectedFilterTokens = buildActiveDiscoveryFilterSummary(selectedFilters)
  const selectedCount = selectedFilters.selectedRailItems.length
  const selectedDestinationBase =
    selectedFilters.cuisines.length > 0 &&
    !selectedFilters.occasion &&
    selectedFilters.cravings.length === 0
      ? '/chefs'
      : '/eat'
  const selectedDestinationHref = discoveryFiltersToHref(selectedDestinationBase, {
    ...selectedFilters,
    ...(locationContext?.location.trim() ? { location: locationContext.location.trim() } : {}),
  })
  const railReconciliation = getHomepageDiscoveryRailReconciliation()
  const railQuickActions = [
    {
      label: 'Taste',
      href: buildDiscoveryHref('/chefs', locationContext),
      description: 'Cuisines and cravings',
    },
    {
      label: 'Occasion',
      href: buildDiscoveryHref('/eat', locationContext),
      description: 'Plan a dinner',
    },
    {
      label: 'Market',
      href: '/ingredients',
      description: 'Peak ingredients',
    },
    {
      label: 'Chefs',
      href: buildDiscoveryHref('/chefs?sort=featured', locationContext),
      description: 'Featured profiles',
    },
  ]

  return (
    <>
      {variant !== 'compact' && (
        <div className="mt-5 flex flex-col gap-3 px-2 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8a96b]/90">
              What are you in the mood for?
            </p>
            <h2 className="mt-1 text-sm font-semibold leading-tight text-white sm:text-base">
              Browse by craving, plan, or chef
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <p className="hidden max-w-[18rem] text-right text-[12px] font-medium leading-snug text-white/45 sm:block">
              Cuisines, occasions, and chefs worth remembering.
            </p>
            <button
              type="button"
              className={controlButtonClass}
              aria-label={
                autoScrollEnabled
                  ? 'Pause discovery rail auto-scroll'
                  : 'Resume discovery rail auto-scroll'
              }
              aria-pressed={!autoScrollEnabled}
              title={
                autoScrollEnabled
                  ? 'Pause discovery rail auto-scroll'
                  : 'Resume discovery rail auto-scroll'
              }
              onClick={toggleAutoScroll}
            >
              {autoScrollEnabled ? (
                <Pause className="h-4 w-4" weight="bold" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" weight="bold" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
      <div
        className={[
          'grid grid-cols-2 gap-2 px-2 sm:flex sm:flex-wrap sm:items-center',
          variant === 'compact' ? 'mt-0' : 'mt-3',
          variant === 'compact' ? 'sm:justify-center' : '',
        ].join(' ')}
        aria-label="Discovery rail quick actions"
      >
        {railQuickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={[
              'group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] text-left shadow-sm transition hover:border-[#e8a96b]/35 hover:bg-[#e8a96b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/55',
              variant === 'compact'
                ? 'min-h-8 gap-2 px-2.5 py-1.5 sm:min-w-[7.25rem]'
                : 'min-h-10 gap-3 px-3 py-2 sm:min-w-[9rem]',
            ].join(' ')}
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-white">{action.label}</span>
              <span className="block truncate text-[10px] font-medium text-white/45">
                {action.description}
              </span>
            </span>
            <span className="text-sm text-[#ffd6a3]/70 transition group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        ))}
        {variant === 'compact' && (
          <button
            type="button"
            className={`${compactControlButtonClass} col-span-2 mx-auto sm:col-span-1`}
            aria-label={
              autoScrollEnabled
                ? 'Pause discovery rail auto-scroll'
                : 'Resume discovery rail auto-scroll'
            }
            aria-pressed={!autoScrollEnabled}
            title={
              autoScrollEnabled
                ? 'Pause discovery rail auto-scroll'
                : 'Resume discovery rail auto-scroll'
            }
            onClick={toggleAutoScroll}
          >
            {autoScrollEnabled ? (
              <Pause className="h-4 w-4" weight="bold" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" weight="bold" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {/* Section labels */}
      <div
        className={[
          'flex items-center gap-2 px-2',
          variant === 'compact' ? 'mb-1 mt-2' : 'mb-2 mt-3',
          variant === 'compact' ? 'justify-center' : '',
        ].join(' ')}
        aria-hidden="true"
      >
        {rows.map((row, i) => (
          <React.Fragment key={row.role}>
            {i > 0 && (
              <span className={['text-[11px] text-white/25', row.labelClassName ?? ''].join(' ')}>
                &middot;
              </span>
            )}
            <span
              className={[
                'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60',
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
        className={
          variant === 'compact'
            ? 'cuisine-marquee-container relative py-0.5'
            : 'cuisine-marquee-container relative py-2'
        }
        onClickCapture={onClickCapture}
        role="navigation"
        aria-label="Browse by taste, occasion, and ChefFlow picks"
        data-public-discovery-renderer={railReconciliation.rendererComponent}
        data-public-discovery-status={railReconciliation.status}
        data-discovery-hydrated={interactionReady ? 'true' : 'false'}
      >
        <div className="flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <React.Fragment key={row.role}>
              {rowIndex > 0 && (
                <div
                  className={[
                    'mx-auto my-2 w-[90%] border-t border-stone-800/30',
                    row.className ?? '',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
              {variant !== 'compact' && (
                <div
                  className={[
                    'mb-1.5 px-4 text-[11px] font-medium uppercase tracking-widest text-stone-500',
                    row.labelClassName ?? '',
                  ].join(' ')}
                >
                  {row.label}
                </div>
              )}
              <div
                ref={(el) => {
                  rowRefs.current[row.role] = el
                }}
                className={[
                  `cuisine-marquee-row discovery-row-ready row-${rowIndex + 1} cursor-grab scroll-px-4 overflow-x-auto py-0.5 active:cursor-grabbing ${
                    variant === 'compact' ? 'snap-none' : 'snap-x snap-mandatory sm:snap-none'
                  }`,
                  row.className ?? '',
                ].join(' ')}
                onPointerDownCapture={onSyntheticPointerDownCapture}
                onPointerMoveCapture={onSyntheticPointerMoveCapture}
                onPointerUpCapture={onSyntheticPointerUpCapture}
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
                      compact={variant === 'compact'}
                      rowRole={row.role}
                      rowPosition={i % Math.max(1, Math.floor(row.items.length / 2))}
                      rowItemCount={Math.max(1, Math.floor(row.items.length / 2))}
                      isDuplicate={i >= Math.floor(row.items.length / 2)}
                      isPinned={isPinnedItem(item)}
                      isSelectable={isSelectableDiscoveryItem(item)}
                      isSelected={isSelectedDiscoveryItem(selectedFilters, item)}
                      interactionReady={interactionReady}
                      onPinToggle={handlePinToggle}
                      onHide={handleHide}
                      onUnhide={handleUnhide}
                      onSelectToggle={handleSelectionToggle}
                      blockLocationContext={
                        item.type === 'featured_chef' || item.type === 'special_dining'
                      }
                    />
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      {hasSelectedFilters && (
        <>
          {fallbackStatus === 'no_results' ? (
            <div className="space-y-3">
              <DiscoveryFallbackPanel
                alternatives={fallbackAlternatives}
                broadenedLabel={fallbackBroadenedLabel}
                onClear={clearSelections}
              />
              <Link
                href={selectedDestinationHref}
                className="mx-auto inline-flex min-h-9 items-center justify-center rounded-full border border-[#e8a96b]/50 bg-[#e8a96b]/18 px-4 text-[12px] font-bold text-[#ffe0ad] transition hover:border-[#e8a96b]/75 hover:bg-[#e8a96b]/25"
                aria-label={`Continue with ${selectedCount} selection${selectedCount === 1 ? '' : 's'}`}
                onClick={() => {
                  for (const selection of selectedFilters.selectedRailItems) {
                    trackDiscoveryInteraction('click', selection, {
                      href: selectedDestinationHref,
                      rowItemCount: selectedCount,
                    })
                  }
                }}
              >
                Continue with {selectedCount} selection{selectedCount === 1 ? '' : 's'}
              </Link>
            </div>
          ) : (
            <div className="sticky bottom-3 z-30 mt-3 flex flex-col gap-2 rounded-lg border border-[#e8a96b]/25 bg-[#1b1009]/95 px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:static sm:flex-row sm:items-center sm:justify-between sm:bg-[#1b1009]/80">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {selectedFilterTokens.slice(0, 4).map((token) => (
                  <span
                    key={`${token.facet}:${token.key}:${token.label}`}
                    className="inline-flex min-h-7 items-center rounded-full border border-[#e8a96b]/25 bg-[#e8a96b]/10 px-2.5 text-[11px] font-semibold text-[#ffd6a3]"
                  >
                    {token.label}
                  </span>
                ))}
                {selectedFilterTokens.length > 4 && (
                  <span className="text-[11px] font-semibold text-white/50">
                    +{selectedFilterTokens.length - 4}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {fallbackStatus === 'checking' && (
                  <span className="text-[10px] text-white/40">Checking availability…</span>
                )}
                <button
                  type="button"
                  className="inline-flex min-h-8 items-center justify-center rounded-full border border-white/10 px-3 text-[11px] font-semibold text-white/55 transition hover:border-white/20 hover:text-white"
                  onClick={clearSelections}
                >
                  Clear
                </button>
                <Link
                  href={selectedDestinationHref}
                  className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#e8a96b]/50 bg-[#e8a96b]/18 px-3 text-[11px] font-bold text-[#ffe0ad] transition hover:border-[#e8a96b]/75 hover:bg-[#e8a96b]/25"
                  aria-label={`Continue with ${selectedCount} selection${selectedCount === 1 ? '' : 's'}`}
                  onClick={() => {
                    for (const selection of selectedFilters.selectedRailItems) {
                      trackDiscoveryInteraction('click', selection, {
                        href: selectedDestinationHref,
                        rowItemCount: selectedCount,
                      })
                    }
                  }}
                >
                  Continue with {selectedCount} selection{selectedCount === 1 ? '' : 's'}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
