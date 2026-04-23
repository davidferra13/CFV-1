import { z } from 'zod'
import {
  LOCATION_BEST_FOR_OPTIONS,
  LOCATION_EXPERIENCE_TAG_OPTIONS,
  LOCATION_SERVICE_TYPE_OPTIONS,
  normalizeLocationOptionValues,
} from '@/lib/partners/location-experiences'

export const PARTNER_LOCATION_CHANGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const

export type PartnerLocationChangeRequestStatus =
  (typeof PARTNER_LOCATION_CHANGE_REQUEST_STATUSES)[number]

const LocationExperienceTagSchema = z.enum(LOCATION_EXPERIENCE_TAG_OPTIONS)
const LocationBestForSchema = z.enum(LOCATION_BEST_FOR_OPTIONS)
const LocationServiceTypeSchema = z.enum(LOCATION_SERVICE_TYPE_OPTIONS)

export const PartnerLocationProposalSchema = z.object({
  name: z.string().trim().min(1, 'Location name is required'),
  address: z.string().trim().nullable().optional().or(z.literal('')),
  city: z.string().trim().nullable().optional().or(z.literal('')),
  state: z.string().trim().nullable().optional().or(z.literal('')),
  zip: z.string().trim().nullable().optional().or(z.literal('')),
  booking_url: z.string().trim().url().nullable().optional().or(z.literal('')),
  description: z.string().trim().nullable().optional().or(z.literal('')),
  max_guest_count: z.number().int().positive().nullable().optional(),
  experience_tags: z.array(LocationExperienceTagSchema).optional().default([]),
  best_for: z.array(LocationBestForSchema).optional().default([]),
  service_types: z.array(LocationServiceTypeSchema).optional().default([]),
})

export type PartnerLocationProposalInput = z.infer<typeof PartnerLocationProposalSchema>

export type PartnerLocationProposalComparable = {
  name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  booking_url?: string | null
  description?: string | null
  max_guest_count?: number | null
  experience_tags?: readonly string[] | null
  best_for?: readonly string[] | null
  service_types?: readonly string[] | null
}

export const PARTNER_LOCATION_PROPOSAL_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP',
  booking_url: 'Booking URL',
  description: 'Description',
  max_guest_count: 'Max Guest Count',
  experience_tags: 'Media Tags',
  best_for: 'Best For',
  service_types: 'Service Formats',
}

function normalizeTextValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeComparableProposal(input: PartnerLocationProposalComparable) {
  return {
    name: normalizeTextValue(input.name),
    address: normalizeTextValue(input.address),
    city: normalizeTextValue(input.city),
    state: normalizeTextValue(input.state),
    zip: normalizeTextValue(input.zip),
    booking_url: normalizeTextValue(input.booking_url),
    description: normalizeTextValue(input.description),
    max_guest_count: input.max_guest_count ?? null,
    experience_tags: normalizeLocationOptionValues(
      input.experience_tags ?? [],
      LOCATION_EXPERIENCE_TAG_OPTIONS
    ),
    best_for: normalizeLocationOptionValues(input.best_for ?? [], LOCATION_BEST_FOR_OPTIONS),
    service_types: normalizeLocationOptionValues(
      input.service_types ?? [],
      LOCATION_SERVICE_TYPE_OPTIONS
    ),
  }
}

export function sanitizePartnerLocationProposal(input: PartnerLocationProposalInput) {
  const validated = PartnerLocationProposalSchema.parse(input)
  const normalized = normalizeComparableProposal(validated)

  return {
    ...normalized,
    name: validated.name.trim(),
  }
}

export function getPartnerLocationProposalChangedFields(
  current: PartnerLocationProposalComparable,
  proposal: PartnerLocationProposalInput | PartnerLocationProposalComparable
) {
  const currentNormalized = normalizeComparableProposal(current)
  const proposedNormalized = normalizeComparableProposal(proposal)

  return Object.keys(PARTNER_LOCATION_PROPOSAL_FIELD_LABELS).filter((field) => {
    const currentValue = currentNormalized[field as keyof typeof currentNormalized]
    const proposedValue = proposedNormalized[field as keyof typeof proposedNormalized]

    if (Array.isArray(currentValue) || Array.isArray(proposedValue)) {
      return JSON.stringify(currentValue ?? []) !== JSON.stringify(proposedValue ?? [])
    }

    return currentValue !== proposedValue
  })
}
