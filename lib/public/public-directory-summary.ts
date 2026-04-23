import type { DirectoryChef } from '@/lib/directory/actions'
import { getDiscoveryServiceTypeLabel } from '@/lib/discovery/constants'
import { getChefCoverage, normalizeDirectoryValue } from '@/lib/directory/utils'

type SummaryChip = {
  label: string
  count: number
}

export type PublicDirectorySummary = {
  totalChefs: number
  acceptingChefs: number
  coverageCount: number
  stateCount: number
  serviceCount: number
  topCoverage: SummaryChip[]
  topStates: SummaryChip[]
  topServices: SummaryChip[]
}

function sortSummaryChips(chips: SummaryChip[]) {
  return [...chips].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label)
  })
}

function buildSummaryChips(valuesByChef: string[][]) {
  const counts = new Map<string, SummaryChip>()

  for (const values of valuesByChef) {
    const seenForChef = new Set<string>()

    for (const rawValue of values) {
      const label = rawValue.trim()
      const key = normalizeDirectoryValue(label)
      if (!key || seenForChef.has(key)) continue
      seenForChef.add(key)

      const current = counts.get(key)
      if (current) {
        current.count += 1
      } else {
        counts.set(key, { label, count: 1 })
      }
    }
  }

  return sortSummaryChips(Array.from(counts.values()))
}

function getChefStates(chef: DirectoryChef) {
  const states = new Set<string>()

  if (chef.discovery.service_area_state?.trim()) {
    states.add(chef.discovery.service_area_state.trim())
  }

  for (const partner of chef.partners) {
    for (const location of partner.partner_locations) {
      if (location.state?.trim()) states.add(location.state.trim())
    }
  }

  return Array.from(states)
}

function getChefServices(chef: DirectoryChef) {
  return Array.from(
    new Set(
      chef.discovery.service_types.map((serviceType) => getDiscoveryServiceTypeLabel(serviceType))
    )
  )
}

export function buildPublicDirectorySummary(chefs: DirectoryChef[]): PublicDirectorySummary {
  const topCoverage = buildSummaryChips(chefs.map((chef) => getChefCoverage(chef)))
  const topStates = buildSummaryChips(chefs.map((chef) => getChefStates(chef)))
  const topServices = buildSummaryChips(chefs.map((chef) => getChefServices(chef)))

  return {
    totalChefs: chefs.length,
    acceptingChefs: chefs.filter((chef) => chef.discovery.accepting_inquiries).length,
    coverageCount: topCoverage.length,
    stateCount: topStates.length,
    serviceCount: topServices.length,
    topCoverage,
    topStates,
    topServices,
  }
}
