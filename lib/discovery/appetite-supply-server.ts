import 'server-only'

import { unstable_cache } from 'next/cache'
import { pgClient } from '@/lib/db'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { FOUNDER_EMAIL } from '@/lib/platform/owner-account'
import {
  buildAppetiteSupplyCensus,
  type AppetiteSupplyCensus,
  type AppetiteSupplySourceBatch,
  type AppetiteSupplySourceRecord,
} from '@/lib/discovery/appetite-supply'

const LISTING_CAP = 1000
const CULINARY_CAP = 2000

function priceRangeLabel(value: string | null | undefined): string | null {
  if (value === 'budget' || value === '$') return 'Budget-friendly'
  if (value === 'moderate' || value === '$$') return 'Mid-range'
  if (value === 'luxury' || value === '$$$$') return 'Splurge'
  return null
}

function serviceSignals(values: readonly string[]): string[] {
  const signals: string[] = []
  if (values.some((value) => value === 'private_dinner' || value === 'personal_chef')) {
    signals.push('Private chef')
  }
  if (values.includes('meal_prep')) signals.push('Meal prep')
  return signals
}

async function loadChefSupply(): Promise<AppetiteSupplySourceBatch> {
  try {
    const [chefs, countRows] = await Promise.all([
      getDiscoverableChefs(),
      pgClient<{ count: number }[]>`
        SELECT count(*)::int AS count
        FROM chefs c
        JOIN chef_preferences cp ON cp.chef_id = c.id
        WHERE c.slug IS NOT NULL
          AND cp.network_discoverable = true
          AND (c.directory_approved = true OR lower(c.email) = lower(${FOUNDER_EMAIL}))
          AND lower(coalesce(c.email, '')) NOT LIKE '%@local.chefflow'
          AND lower(coalesce(c.email, '')) NOT LIKE '%demo@%'
          AND lower(coalesce(c.email, '')) NOT LIKE '%test@%'
      `,
    ])
    const totalKnown = Number(countRows[0]?.count ?? 0)
    if (totalKnown > 0 && chefs.length === 0) {
      return { source: 'chefs', status: 'failed', totalKnown, records: [] }
    }

    const records: AppetiteSupplySourceRecord[] = chefs.map((chef) => {
      const cuisines = chef.discovery.cuisine_types ?? []
      const dietary = chef.discovery.dietary_specialties ?? []
      const services = chef.discovery.service_types ?? []
      return {
        id: `chef-${chef.id}`,
        sourceType: 'chef',
        texts: [
          chef.display_name,
          chef.tagline,
          chef.bio,
          ...cuisines,
          ...dietary,
          ...services,
          ...serviceSignals(services),
          priceRangeLabel(chef.discovery.price_range),
        ],
        availabilityWeight: chef.discovery.accepting_inquiries === false ? 0.25 : 0.75,
      }
    })

    return {
      source: 'chefs',
      status: records.length < totalKnown ? 'capped' : 'complete',
      totalKnown,
      records,
    }
  } catch {
    return { source: 'chefs', status: 'failed', totalKnown: null, records: [] }
  }
}

type ListingSupplyRow = {
  id: string
  name: string
  description: string | null
  cuisine_types: string[] | null
  business_type: string | null
  price_range: string | null
}

async function loadListingSupply(): Promise<AppetiteSupplySourceBatch> {
  try {
    const [countRows, rows] = await Promise.all([
      pgClient<{ count: number }[]>`
        SELECT count(*)::int AS count
        FROM directory_listings
        WHERE status IN ('discovered', 'claimed', 'verified')
      `,
      pgClient<ListingSupplyRow[]>`
        SELECT id, name, description, cuisine_types, business_type, price_range
        FROM directory_listings
        WHERE status IN ('discovered', 'claimed', 'verified')
        ORDER BY featured DESC, lead_score DESC NULLS LAST, name ASC
        LIMIT ${LISTING_CAP}
      `,
    ])
    const totalKnown = Number(countRows[0]?.count ?? 0)
    const records: AppetiteSupplySourceRecord[] = rows.map((row) => ({
      id: `listing-${row.id}`,
      sourceType: 'listing',
      texts: [
        row.name,
        row.description,
        ...(row.cuisine_types ?? []),
        row.business_type,
        row.business_type === 'restaurant' ? 'Going out' : null,
        priceRangeLabel(row.price_range),
      ],
      availabilityWeight: 1,
    }))

    return {
      source: 'listings',
      status: records.length < totalKnown ? 'capped' : 'complete',
      totalKnown,
      records,
    }
  } catch {
    return { source: 'listings', status: 'failed', totalKnown: null, records: [] }
  }
}

type CulinarySupplyRow = {
  source_type: 'menu' | 'package' | 'meal_prep_item'
  source_id: string
  title: string
  description: string | null
  tags: string[] | null
  total_count: number
}

async function loadCulinarySupply(): Promise<AppetiteSupplySourceBatch> {
  try {
    const rows = await pgClient<CulinarySupplyRow[]>`
      WITH supply AS (
        SELECT
          'menu'::text AS source_type,
          m.id::text AS source_id,
          m.name AS title,
          m.description,
          ARRAY_REMOVE(ARRAY[m.cuisine_type, m.service_style::text], NULL)::text[] AS tags
        FROM menus m
        JOIN chefs c ON c.id = m.tenant_id
        WHERE m.is_showcase = true
          AND m.status <> 'archived'
          AND c.slug IS NOT NULL
        UNION ALL

        SELECT
          'package'::text AS source_type,
          ep.id::text AS source_id,
          ep.name AS title,
          ep.description,
          COALESCE(ep.cuisine_types, ARRAY[]::text[]) || ARRAY[ep.package_type::text] AS tags
        FROM experience_packages ep
        JOIN chefs c ON c.id = ep.tenant_id
        WHERE ep.is_active = true
          AND c.slug IS NOT NULL

        UNION ALL

        SELECT
          'meal_prep_item'::text AS source_type,
          mpi.id::text AS source_id,
          mpi.name AS title,
          mpi.description,
          COALESCE(mpi.dietary_tags, ARRAY[]::text[]) || ARRAY[mpi.category::text] AS tags
        FROM meal_prep_items mpi
        JOIN chefs c ON c.id = mpi.chef_id
        WHERE mpi.is_available = true
          AND c.slug IS NOT NULL
      )
      SELECT
        source_type,
        source_id,
        title,
        description,
        tags,
        count(*) OVER()::int AS total_count
      FROM supply
      ORDER BY source_type, source_id
      LIMIT ${CULINARY_CAP}
    `

    const totalKnown = Number(rows[0]?.total_count ?? 0)
    const records: AppetiteSupplySourceRecord[] = rows.map((row) => {
      const tags = row.tags ?? []
      return {
        id: `${row.source_type}-${row.source_id}`,
        sourceType: row.source_type,
        texts: [row.title, row.description, ...tags, ...serviceSignals(tags)],
        availabilityWeight: 1,
      }
    })

    return {
      source: 'culinary',
      status: records.length < totalKnown ? 'capped' : 'complete',
      totalKnown,
      records,
    }
  } catch {
    return { source: 'culinary', status: 'failed', totalKnown: null, records: [] }
  }
}

async function loadAppetiteSupplyCensus(): Promise<AppetiteSupplyCensus> {
  const batches = await Promise.all([loadChefSupply(), loadListingSupply(), loadCulinarySupply()])
  return buildAppetiteSupplyCensus(batches)
}

export const getAppetiteSupplyCensus = unstable_cache(
  loadAppetiteSupplyCensus,
  ['appetite-supply-census-v1'],
  { revalidate: 300, tags: ['appetite-supply', 'directory-chefs'] }
)
