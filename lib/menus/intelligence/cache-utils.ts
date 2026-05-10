// Menu Intelligence: cache invalidation utility
// Shared across intelligence sub-modules that mutate data.

'use server'

import { revalidateTag } from 'next/cache'
import {
  MENU_CONTEXT_CACHE_TAG,
  MENU_PERF_CACHE_TAG,
  MENU_SEASONAL_CACHE_TAG,
  MENU_TASTE_CACHE_TAG,
} from '@/lib/menus/menu-intelligence-cache'

/** Bust all menu intelligence caches for a given menu */
export async function revalidateMenuIntelligenceCache(menuId: string) {
  revalidateTag(`${MENU_CONTEXT_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_PERF_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_SEASONAL_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_TASTE_CACHE_TAG}-${menuId}`)
}
