'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { iconDefinitions, iconMappings } from '@/lib/db/schema/schema'
import { eq, and, sql, count } from 'drizzle-orm'
import type {
  IconCategory,
  IconDefinition,
  IconMapping,
  IconLanguageSummary,
} from './icon-language-types'

const db: any = createServerClient()

export async function getIconDefinitions(category?: IconCategory): Promise<IconDefinition[]> {
  const chef = await requireChef()
  const conditions = [eq(iconDefinitions.tenantId, chef.tenantId!)]
  if (category) {
    conditions.push(eq(iconDefinitions.category, category))
  }
  const rows = await db
    .select()
    .from(iconDefinitions)
    .where(and(...conditions))
  return rows as IconDefinition[]
}

export async function upsertIconDefinition(
  name: string,
  category: IconCategory,
  svgContent?: string,
  lucideIcon?: string,
  emoji?: string,
  meaning?: string,
  usageGuidelines?: string
): Promise<IconDefinition> {
  const chef = await requireChef()
  if (!meaning) throw new Error('meaning is required')
  const [row] = await db
    .insert(iconDefinitions)
    .values({
      tenantId: chef.tenantId!,
      name,
      category,
      svgContent: svgContent ?? null,
      lucideIcon: lucideIcon ?? null,
      emoji: emoji ?? null,
      meaning,
      usageGuidelines: usageGuidelines ?? null,
    })
    .onConflictDoUpdate({
      target: [iconDefinitions.tenantId, iconDefinitions.name],
      set: {
        category,
        svgContent: svgContent ?? null,
        lucideIcon: lucideIcon ?? null,
        emoji: emoji ?? null,
        meaning,
        usageGuidelines: usageGuidelines ?? null,
      },
    })
    .returning()
  return row as IconDefinition
}

export async function getIconMappings(context?: string): Promise<IconMapping[]> {
  const chef = await requireChef()
  const conditions = [eq(iconMappings.tenantId, chef.tenantId!)]
  if (context) {
    conditions.push(eq(iconMappings.context, context))
  }
  const rows = await db
    .select()
    .from(iconMappings)
    .where(and(...conditions))
  return rows as IconMapping[]
}

export async function upsertIconMapping(
  context: string,
  iconName: string,
  purpose?: string
): Promise<IconMapping> {
  const chef = await requireChef()
  const [row] = await db
    .insert(iconMappings)
    .values({
      tenantId: chef.tenantId!,
      context,
      iconName,
      purpose: purpose ?? null,
    })
    .onConflictDoUpdate({
      target: [iconMappings.tenantId, iconMappings.context],
      set: {
        iconName,
        purpose: purpose ?? null,
      },
    })
    .returning()
  return row as IconMapping
}

export async function deleteIconMapping(mappingId: string): Promise<void> {
  const chef = await requireChef()
  await db
    .delete(iconMappings)
    .where(and(eq(iconMappings.id, mappingId), eq(iconMappings.tenantId, chef.tenantId!)))
}

export async function getIconLanguageSummary(): Promise<IconLanguageSummary> {
  const chef = await requireChef()

  const catRows = await db
    .select({ category: iconDefinitions.category, cnt: count() })
    .from(iconDefinitions)
    .where(eq(iconDefinitions.tenantId, chef.tenantId!))
    .groupBy(iconDefinitions.category)

  const allCategories: IconCategory[] = [
    'navigation',
    'action',
    'status',
    'entity',
    'culinary',
    'finance',
    'communication',
  ]
  const byCategory = {} as Record<IconCategory, number>
  let totalIcons = 0
  for (const c of allCategories) {
    const found = catRows.find((r: any) => r.category === c)
    byCategory[c] = found ? Number(found.cnt) : 0
    totalIcons += byCategory[c]
  }

  const [mappingCount] = await db
    .select({ cnt: count() })
    .from(iconMappings)
    .where(eq(iconMappings.tenantId, chef.tenantId!))

  const totalMappings = Number(mappingCount.cnt)

  const mappedNames = db
    .select({ iconName: iconMappings.iconName })
    .from(iconMappings)
    .where(eq(iconMappings.tenantId, chef.tenantId!))

  const unmappedRows = await db
    .select({ name: iconDefinitions.name })
    .from(iconDefinitions)
    .where(
      and(
        eq(iconDefinitions.tenantId, chef.tenantId!),
        sql`${iconDefinitions.name} NOT IN (${mappedNames})`
      )
    )
  const unmappedContexts = unmappedRows.map((r: any) => r.name as string)

  return { totalIcons, byCategory, totalMappings, unmappedContexts }
}
