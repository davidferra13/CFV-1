// Nav filtering hook for progressive disclosure.
// Provides useVisibleRoutes() that filters nav items based on complexity level.
// Integrates with existing nav system without replacing it.

'use client'

import { useMemo } from 'react'
import {
  isNavGroupVisibleAtLevel,
  type ComplexityLevel,
} from '@/lib/progressive-disclosure/complexity-config'

/**
 * Hook that returns whether a nav group should be visible at the current complexity level.
 * Works alongside the existing TenantDataPresence-based filtering.
 *
 * @param complexityLevel - Current chef's complexity level
 * @param navGroupIds - Array of all nav group IDs
 * @returns Set of visible group IDs and helper utilities
 */
export function useVisibleRoutes(complexityLevel: ComplexityLevel, navGroupIds: string[]) {
  const visibleGroups = useMemo(() => {
    if (complexityLevel === 'pro') return new Set(navGroupIds)
    return new Set(navGroupIds.filter((id) => isNavGroupVisibleAtLevel(id, complexityLevel)))
  }, [complexityLevel, navGroupIds])

  const hiddenCount = navGroupIds.length - visibleGroups.size
  const hasHiddenFeatures = hiddenCount > 0

  return {
    /** Set of nav group IDs visible at the current level */
    visibleGroups,
    /** Number of groups hidden by the current level */
    hiddenCount,
    /** Whether any features are hidden (show "more features available" indicator) */
    hasHiddenFeatures,
    /** Check if a specific group is visible */
    isGroupVisible: (groupId: string) => visibleGroups.has(groupId),
  }
}
