// Public Dietary Trust Summary
// Derives calm trust chips and marketplace filter facets from
// chef_service_config and chef_directory_listings data.
// No server actions here; pure derivation logic.

// ── Types ───────────────────────────────────────────────────────────────────

export type TrustChip = {
  id: string
  label: string
  tone: 'calm' | 'highlight'
}

export type PublicDietaryTrustSummary = {
  specialties: string[]
  trustChips: TrustChip[]
  hasAllergyHandling: boolean
  hasMenuApproval: boolean
  hasMedicalDietHandling: boolean
  hasReligiousDietHandling: boolean
  plainEnglishSummary: string | null
}

// ── Service config shape (subset we need) ───────────────────────────────────

type ServiceConfigInput = {
  handles_allergies?: boolean | null
  handles_religious_diets?: boolean | null
  handles_medical_diets?: boolean | null
  shares_menu_for_approval?: boolean | null
  custom_dietary_note?: string | null
}

// ── Derivation ──────────────────────────────────────────────────────────────

/**
 * Derive a public trust summary from service config and directory specialties.
 * Returns null if there's no meaningful dietary data to surface.
 */
export function derivePublicTrustSummary(
  config: ServiceConfigInput | null,
  dietarySpecialties: string[] | null
): PublicDietaryTrustSummary | null {
  const specialties = dietarySpecialties?.filter(Boolean) ?? []
  const hasConfig = config != null
  const handlesAllergies = config?.handles_allergies ?? false
  const hasMenuApproval = config?.shares_menu_for_approval ?? false
  const hasMedicalDiets = config?.handles_medical_diets ?? false
  const hasReligiousDiets = config?.handles_religious_diets ?? false

  // If nothing to show, return null so the UI can omit the section
  if (!hasConfig && specialties.length === 0) return null
  if (!handlesAllergies && !hasMedicalDiets && !hasReligiousDiets && specialties.length === 0) {
    return null
  }

  const chips: TrustChip[] = []

  // Specialty chips from directory listing
  for (const spec of specialties) {
    chips.push({
      id: `specialty-${spec.toLowerCase().replace(/\s+/g, '-')}`,
      label: spec,
      tone: 'calm',
    })
  }

  // Capability chips from service config
  if (handlesAllergies) {
    chips.push({ id: 'allergy-aware', label: 'Allergy-Aware', tone: 'calm' })
  }
  if (hasMedicalDiets) {
    chips.push({ id: 'medical-diets', label: 'Medical Diets', tone: 'calm' })
  }
  if (hasReligiousDiets) {
    chips.push({ id: 'religious-diets', label: 'Religious Diets', tone: 'calm' })
  }
  if (hasMenuApproval) {
    chips.push({ id: 'menu-approval', label: 'Menu Shared for Approval', tone: 'highlight' })
  }

  // Build a plain-English summary
  const summary = buildPlainEnglishSummary(
    handlesAllergies,
    hasMedicalDiets,
    hasReligiousDiets,
    hasMenuApproval,
    config?.custom_dietary_note ?? null
  )

  return {
    specialties,
    trustChips: chips,
    hasAllergyHandling: handlesAllergies,
    hasMenuApproval,
    hasMedicalDietHandling: hasMedicalDiets,
    hasReligiousDietHandling: hasReligiousDiets,
    plainEnglishSummary: summary,
  }
}

function buildPlainEnglishSummary(
  allergies: boolean,
  medical: boolean,
  religious: boolean,
  menuApproval: boolean,
  customNote: string | null
): string | null {
  const parts: string[] = []

  if (allergies && menuApproval) {
    parts.push(
      'This chef handles food allergies and shares menus for your approval before cooking.'
    )
  } else if (allergies) {
    parts.push('This chef accommodates food allergies and dietary restrictions.')
  }

  if (medical) {
    parts.push('Medical dietary needs can be accommodated.')
  }
  if (religious) {
    parts.push('Religious dietary requirements can be accommodated.')
  }

  if (customNote?.trim()) {
    parts.push(customNote.trim())
  }

  return parts.length > 0 ? parts.join(' ') : null
}

// ── Marketplace filter matching ─────────────────────────────────────────────

/** Public filter IDs that map to service config or specialties */
export const MARKETPLACE_DIETARY_FILTERS = [
  { id: 'vegan', label: 'Vegan', matchField: 'specialty' },
  { id: 'vegetarian', label: 'Vegetarian', matchField: 'specialty' },
  { id: 'gluten_free', label: 'Gluten-Free', matchField: 'specialty' },
  { id: 'dairy_free', label: 'Dairy-Free', matchField: 'specialty' },
  { id: 'allergy_aware', label: 'Allergy-Aware', matchField: 'config' },
  { id: 'medical_diets', label: 'Medical Diets', matchField: 'config' },
  { id: 'religious_diets', label: 'Religious Diets', matchField: 'config' },
] as const

export type MarketplaceDietaryFilterId = (typeof MARKETPLACE_DIETARY_FILTERS)[number]['id']

/**
 * Check if a chef matches a given dietary filter.
 * Used for client-side filtering after data fetch.
 */
export function chefMatchesDietaryFilter(
  filterId: MarketplaceDietaryFilterId,
  config: ServiceConfigInput | null,
  specialties: string[]
): boolean {
  const specialtiesLower = specialties.map((s) => s.toLowerCase().replace(/[-\s]+/g, '_'))

  switch (filterId) {
    case 'vegan':
      return specialtiesLower.includes('vegan')
    case 'vegetarian':
      return specialtiesLower.includes('vegetarian')
    case 'gluten_free':
      return specialtiesLower.some((s) => s.includes('gluten') && s.includes('free'))
    case 'dairy_free':
      return specialtiesLower.some((s) => s.includes('dairy') && s.includes('free'))
    case 'allergy_aware':
      return config?.handles_allergies === true
    case 'medical_diets':
      return config?.handles_medical_diets === true
    case 'religious_diets':
      return config?.handles_religious_diets === true
    default:
      return false
  }
}
