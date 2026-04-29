'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CharityHourEntry, CharityHoursSummary, CharityOrganization } from './hours-types'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import {
  getOrganizationLinks,
  getPropublicaOrganizationUrl,
  normalizeEin,
  normalizeWebsiteUrl,
} from './organization-links'

const LogHoursSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(500),
  organizationAddress: z.string().max(500).optional(),
  googlePlaceId: z.string().max(200).optional(),
  ein: z.string().max(20).optional(),
  organizationWebsiteUrl: z.string().max(500).optional(),
  isVerified501c: z.boolean().default(false),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  hours: z.number().gt(0, 'Hours must be greater than 0').lte(24, 'Max 24 hours per entry'),
  notes: z.string().max(2000).optional(),
})

const UpdateHoursSchema = LogHoursSchema.extend({
  id: z.string().uuid(),
})

type CharityHourRow = {
  id: string
  community_organization_id?: string | null
  organization_name: string
  organization_address: string | null
  google_place_id: string | null
  ein: string | null
  is_verified_501c: boolean
  service_date: string
  hours: number | string
  notes: string | null
  created_at: string
}

type CommunityOrganizationRow = {
  id: string
  chef_id: string
  display_name: string
  address: string | null
  google_place_id: string | null
  ein: string | null
  website_url: string | null
  verification_source: string | null
  verification_url: string | null
  is_verified_501c: boolean
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

type NormalizedHoursInput = {
  organizationName: string
  organizationAddress: string | null
  googlePlaceId: string | null
  ein: string | null
  organizationWebsiteUrl: string | null
  isVerified501c: boolean
  serviceDate: string
  hours: number
  notes: string | null
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeHoursInput(input: z.output<typeof LogHoursSchema>): NormalizedHoursInput {
  return {
    organizationName: input.organizationName.trim(),
    organizationAddress: trimToNull(input.organizationAddress),
    googlePlaceId: trimToNull(input.googlePlaceId),
    ein: normalizeEin(input.ein),
    organizationWebsiteUrl: normalizeWebsiteUrl(input.organizationWebsiteUrl),
    isVerified501c: input.isVerified501c,
    serviceDate: input.serviceDate,
    hours: input.hours,
    notes: trimToNull(input.notes),
  }
}

function isCommunityOrganizationSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('community_organizations') ||
    message.includes('community_organization_id') ||
    message.includes('42P01') ||
    message.includes('42703')
  )
}

function matchesNormalizedOrganization(
  row: Pick<CommunityOrganizationRow, 'display_name' | 'address'>,
  input: Pick<NormalizedHoursInput, 'organizationName' | 'organizationAddress'>
): boolean {
  return (
    row.display_name.trim().toLowerCase() === input.organizationName.toLowerCase() &&
    (row.address ?? '').trim().toLowerCase() === (input.organizationAddress ?? '').toLowerCase()
  )
}

async function fetchCommunityOrganizationsByIds(
  db: any,
  ids: string[]
): Promise<Map<string, CommunityOrganizationRow>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await db.from('community_organizations').select('*').in('id', ids)
  if (error) throw new Error(`Failed to fetch community organizations: ${error.message}`)

  return new Map(((data as CommunityOrganizationRow[] | null) ?? []).map((row) => [row.id, row]))
}

async function resolveCommunityOrganization(
  db: any,
  chefId: string,
  input: NormalizedHoursInput
): Promise<CommunityOrganizationRow | null> {
  try {
    let existing: CommunityOrganizationRow | null = null

    if (input.googlePlaceId) {
      const { data, error } = await db
        .from('community_organizations')
        .select('*')
        .eq('chef_id', chefId)
        .eq('google_place_id', input.googlePlaceId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      existing = (data as CommunityOrganizationRow | null) ?? null
    }

    if (!existing && input.ein) {
      const { data, error } = await db
        .from('community_organizations')
        .select('*')
        .eq('chef_id', chefId)
        .eq('ein', input.ein)
        .maybeSingle()
      if (error) throw new Error(error.message)
      existing = (data as CommunityOrganizationRow | null) ?? null
    }

    if (!existing) {
      const { data, error } = await db
        .from('community_organizations')
        .select('*')
        .eq('chef_id', chefId)
        .ilike('display_name', input.organizationName)
        .limit(10)
      if (error) throw new Error(error.message)
      existing =
        ((data as CommunityOrganizationRow[] | null) ?? []).find((row) =>
          matchesNormalizedOrganization(row, input)
        ) ?? null
    }

    const verificationSource =
      input.isVerified501c && input.ein
        ? 'propublica'
        : input.googlePlaceId
          ? 'google_places'
          : (existing?.verification_source ?? null)
    const verificationUrl =
      input.isVerified501c && input.ein
        ? getPropublicaOrganizationUrl(input.ein)
        : (existing?.verification_url ?? null)
    const row = {
      chef_id: chefId,
      display_name: input.organizationName,
      address: input.organizationAddress,
      google_place_id: input.googlePlaceId ?? existing?.google_place_id ?? null,
      ein: input.ein ?? existing?.ein ?? null,
      website_url: input.organizationWebsiteUrl ?? existing?.website_url ?? null,
      verification_source: verificationSource,
      verification_url: verificationUrl,
      is_verified_501c: existing?.is_verified_501c || input.isVerified501c,
      last_verified_at:
        input.isVerified501c && input.ein
          ? new Date().toISOString()
          : (existing?.last_verified_at ?? null),
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data, error } = await db
        .from('community_organizations')
        .update(row)
        .eq('id', existing.id)
        .eq('chef_id', chefId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as CommunityOrganizationRow
    }

    const { data, error } = await db
      .from('community_organizations')
      .insert({
        ...row,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as CommunityOrganizationRow
  } catch (error) {
    if (isCommunityOrganizationSchemaMissing(error)) return null
    throw error
  }
}

function mapRow(
  row: CharityHourRow,
  organization?: CommunityOrganizationRow | null
): CharityHourEntry {
  const organizationName = organization?.display_name ?? row.organization_name
  const organizationAddress = organization?.address ?? row.organization_address ?? null
  const googlePlaceId = organization?.google_place_id ?? row.google_place_id ?? null
  const ein = organization?.ein ?? row.ein ?? null
  const organizationWebsiteUrl = organization?.website_url ?? null
  const organizationVerificationSource = organization?.verification_source ?? null
  const organizationVerificationUrl = organization?.verification_url ?? null
  const isVerified501c = organization?.is_verified_501c ?? row.is_verified_501c ?? false

  return {
    id: row.id,
    organizationId: row.community_organization_id ?? organization?.id ?? null,
    organizationName,
    organizationAddress,
    googlePlaceId,
    ein,
    isVerified501c,
    organizationWebsiteUrl,
    organizationVerificationSource,
    organizationVerificationUrl,
    links: getOrganizationLinks({
      organizationName,
      organizationAddress,
      googlePlaceId,
      ein,
      websiteUrl: organizationWebsiteUrl,
      verificationUrl: organizationVerificationUrl,
    }),
    serviceDate: row.service_date,
    hours: Number(row.hours),
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}

function mapOrganizationFromEntries(
  entry: CharityHourEntry,
  existing?: CharityOrganization
): CharityOrganization {
  if (existing) {
    existing.totalHours = Math.round((existing.totalHours + entry.hours) * 100) / 100
    if (entry.serviceDate > existing.lastUsed) existing.lastUsed = entry.serviceDate
    if (!existing.websiteUrl && entry.organizationWebsiteUrl) {
      existing.websiteUrl = entry.organizationWebsiteUrl
      existing.links = getOrganizationLinks({
        organizationName: existing.organizationName,
        organizationAddress: existing.organizationAddress,
        googlePlaceId: existing.googlePlaceId,
        ein: existing.ein,
        websiteUrl: existing.websiteUrl,
        verificationUrl: existing.verificationUrl,
      })
    }
    return existing
  }

  return {
    id: entry.organizationId,
    organizationName: entry.organizationName,
    organizationAddress: entry.organizationAddress,
    googlePlaceId: entry.googlePlaceId,
    ein: entry.ein,
    isVerified501c: entry.isVerified501c,
    websiteUrl: entry.organizationWebsiteUrl,
    verificationSource: entry.organizationVerificationSource,
    verificationUrl: entry.organizationVerificationUrl,
    links: entry.links,
    lastUsed: entry.serviceDate,
    totalHours: Math.round(entry.hours * 100) / 100,
  }
}

async function revalidateCommunityImpactPaths(chefId: string) {
  revalidatePath('/charity')
  revalidatePath('/charity/hours')
  revalidatePath('/settings/credentials')
  revalidatePath('/settings/client-preview')
  revalidatePath('/settings')

  try {
    const db: any = createServerClient()
    const { data } = await db.from('chefs').select('slug').eq('id', chefId).single()
    if (data?.slug) {
      revalidatePath(`/chef/${data.slug}`)
      revalidatePath(`/chef/${data.slug}/inquire`)
    }
  } catch {
    // Public pages still refresh via the explicit route revalidations above.
  }
}

function warnBroadcastFailure(action: 'insert' | 'update' | 'delete', err: unknown) {
  console.warn(`[charity/hours-actions] ${action} broadcast failed`, err)
}

export async function logCharityHours(
  input: z.input<typeof LogHoursSchema>
): Promise<CharityHourEntry> {
  const user = await requireChef()
  const parsed = normalizeHoursInput(LogHoursSchema.parse(input))
  const db: any = createServerClient()
  const organization = await resolveCommunityOrganization(db, user.entityId, parsed)

  const insertRow: Record<string, unknown> = {
    chef_id: user.tenantId!,
    organization_name: organization?.display_name ?? parsed.organizationName,
    organization_address: organization?.address ?? parsed.organizationAddress,
    google_place_id: organization?.google_place_id ?? parsed.googlePlaceId,
    ein: organization?.ein ?? parsed.ein,
    is_verified_501c: organization?.is_verified_501c ?? parsed.isVerified501c,
    service_date: parsed.serviceDate,
    hours: parsed.hours,
    notes: parsed.notes,
  }

  if (organization?.id) insertRow.community_organization_id = organization.id

  const { data, error } = await db.from('charity_hours').insert(insertRow).select('*').single()
  if (error) throw new Error(`Failed to log charity hours: ${error.message}`)

  await revalidateCommunityImpactPaths(user.entityId)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'charity_hours',
      action: 'insert',
      reason: 'Charity hours logged',
    })
  } catch (err) {
    warnBroadcastFailure('insert', err)
  }
  return mapRow(data as CharityHourRow, organization)
}

export async function updateCharityHours(
  input: z.input<typeof UpdateHoursSchema>
): Promise<CharityHourEntry> {
  const user = await requireChef()
  const parsed = UpdateHoursSchema.parse(input)
  const normalized = normalizeHoursInput(parsed)
  const db: any = createServerClient()
  const organization = await resolveCommunityOrganization(db, user.entityId, normalized)

  const updateRow: Record<string, unknown> = {
    organization_name: organization?.display_name ?? normalized.organizationName,
    organization_address: organization?.address ?? normalized.organizationAddress,
    google_place_id: organization?.google_place_id ?? normalized.googlePlaceId,
    ein: organization?.ein ?? normalized.ein,
    is_verified_501c: organization?.is_verified_501c ?? normalized.isVerified501c,
    service_date: normalized.serviceDate,
    hours: normalized.hours,
    notes: normalized.notes,
    updated_at: new Date().toISOString(),
  }

  if (organization?.id) updateRow.community_organization_id = organization.id

  const { data, error } = await db
    .from('charity_hours')
    .update(updateRow)
    .eq('id', parsed.id)
    .eq('chef_id', user.tenantId!)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update charity hours: ${error.message}`)

  await revalidateCommunityImpactPaths(user.entityId)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'charity_hours',
      action: 'update',
      reason: 'Charity hours updated',
    })
  } catch (err) {
    warnBroadcastFailure('update', err)
  }
  return mapRow(data as CharityHourRow, organization)
}

export async function deleteCharityHours(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  z.string().uuid().parse(id)
  const db: any = createServerClient()

  const { error } = await db
    .from('charity_hours')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
  if (error) throw new Error(`Failed to delete charity hours: ${error.message}`)

  await revalidateCommunityImpactPaths(user.entityId)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'charity_hours',
      action: 'delete',
      reason: 'Charity hours deleted',
    })
  } catch (err) {
    warnBroadcastFailure('delete', err)
  }

  return { success: true }
}

export async function getCharityHours(filters?: {
  startDate?: string
  endDate?: string
  organizationName?: string
}): Promise<CharityHourEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('charity_hours')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('service_date', { ascending: false })
    .limit(500)

  if (filters?.startDate) query = query.gte('service_date', filters.startDate)
  if (filters?.endDate) query = query.lte('service_date', filters.endDate)
  if (filters?.organizationName) query = query.eq('organization_name', filters.organizationName)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch charity hours: ${error.message}`)

  const rows = ((data as CharityHourRow[] | null) ?? []).map((row) => ({
    ...row,
    community_organization_id: row.community_organization_id ?? null,
  }))
  const organizationIds = Array.from(
    new Set(rows.map((row) => row.community_organization_id).filter(Boolean) as string[])
  )
  const organizationMap = await fetchCommunityOrganizationsByIds(db, organizationIds)

  return rows.map((row) =>
    mapRow(row, organizationMap.get(row.community_organization_id ?? '') ?? null)
  )
}

export async function getRecentCharityOrgs(): Promise<CharityOrganization[]> {
  const entries = await getCharityHours()
  const orgMap = new Map<string, CharityOrganization>()

  for (const entry of entries) {
    const key =
      entry.organizationId ?? `${entry.organizationName}::${entry.organizationAddress ?? ''}`
    const existing = orgMap.get(key)
    orgMap.set(key, mapOrganizationFromEntries(entry, existing))
  }

  return Array.from(orgMap.values())
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, 20)
}

export async function getCharityHoursSummary(): Promise<CharityHoursSummary> {
  const entries = await getCharityHours()
  const orgMap = new Map<
    string,
    {
      id: string | null
      name: string
      hours: number
      isVerified: boolean
      links: CharityHourEntry['links']
    }
  >()
  let totalHours = 0

  for (const entry of entries) {
    totalHours += entry.hours
    const key =
      entry.organizationId ?? `${entry.organizationName}::${entry.organizationAddress ?? ''}`
    const existing = orgMap.get(key)
    if (existing) {
      existing.hours += entry.hours
    } else {
      orgMap.set(key, {
        id: entry.organizationId,
        name: entry.organizationName,
        hours: entry.hours,
        isVerified: entry.isVerified501c,
        links: entry.links,
      })
    }
  }

  const hoursByOrg = Array.from(orgMap.values())
    .map((row) => ({
      id: row.id,
      name: row.name,
      hours: Math.round(row.hours * 100) / 100,
      isVerified: row.isVerified,
      links: row.links,
    }))
    .sort((a, b) => b.hours - a.hours)

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalEntries: entries.length,
    uniqueOrgs: orgMap.size,
    verified501cOrgs: hoursByOrg.filter((row) => row.isVerified).length,
    hoursByOrg,
  }
}
