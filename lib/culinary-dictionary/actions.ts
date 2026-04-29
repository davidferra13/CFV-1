'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { createServerClient } from '@/lib/db/server'
import { normalizeDictionaryAlias, slugifyCulinaryTerm } from './normalization'
import {
  getDictionaryReviewQueue as readDictionaryReviewQueue,
  getDictionaryTermBySlug,
  searchDictionaryTerms,
} from './queries'
import { DICTIONARY_ALIAS_KINDS, DICTIONARY_TERM_TYPES } from './types'

const SearchSchema = z.object({
  query: z.string().optional(),
  termType: z.enum(['all', ...DICTIONARY_TERM_TYPES] as const).optional(),
  includeChefOverrides: z.boolean().optional(),
})

const AddAliasSchema = z.object({
  termId: z.string().min(1),
  alias: z
    .string()
    .min(1)
    .max(80)
    .transform((value) => value.trim()),
  aliasKind: z.enum(DICTIONARY_ALIAS_KINDS).default('synonym'),
})

const HideAliasSchema = z.object({
  aliasId: z.string().min(1),
})

const CreateTermSchema = z.object({
  canonicalName: z
    .string()
    .min(1)
    .max(100)
    .transform((value) => value.trim()),
  termType: z.enum(DICTIONARY_TERM_TYPES),
  definition: z.string().max(500).optional(),
  aliases: z.array(z.string().min(1).max(80)).optional(),
})

const ResolveReviewSchema = z.object({
  reviewId: z.string().min(1),
  decision: z.enum(['approved', 'rejected', 'dismissed']),
  resolutionAction: z
    .enum(['approve_new_private_term', 'add_alias_to_existing_term', 'reject', 'dismiss'])
    .optional(),
  termId: z.string().optional(),
  canonicalName: z
    .string()
    .max(100)
    .optional()
    .transform((value) => value?.trim()),
  termType: z.enum(DICTIONARY_TERM_TYPES).optional(),
  definition: z
    .string()
    .max(500)
    .optional()
    .transform((value) => value?.trim()),
  alias: z
    .string()
    .max(80)
    .optional()
    .transform((value) => value?.trim()),
  aliasKind: z.enum(DICTIONARY_ALIAS_KINDS).optional(),
})

function revalidateDictionarySurfaces() {
  revalidatePath('/culinary/dictionary')
  revalidatePath('/culinary/costing')
  revalidatePath('/culinary/ingredients')
  revalidatePath('/dictionary')
}

export async function searchCulinaryDictionary(input: unknown) {
  await requireChef()
  const parsed = SearchSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid dictionary search' }
  }

  try {
    const terms = await searchDictionaryTerms({
      query: parsed.data.query,
      termType: parsed.data.termType,
      publicOnly: false,
      limit: 50,
    })
    return { success: true, terms }
  } catch (error) {
    console.error('[searchCulinaryDictionary] Error:', error)
    return { success: false, error: 'Failed to search culinary dictionary' }
  }
}

export async function getCulinaryDictionaryTerm(idOrSlug: string) {
  await requireChef()
  if (!idOrSlug?.trim()) {
    return { success: false, error: 'Term is required' }
  }

  const term = await getDictionaryTermBySlug(idOrSlug.trim(), false)
  if (!term) return { success: false, error: 'Dictionary term not found' }
  return { success: true, term }
}

export async function addChefDictionaryAlias(input: unknown) {
  const user = await requireChef()
  const parsed = AddAliasSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid alias input' }

  const normalizedAlias = normalizeDictionaryAlias(parsed.data.alias)
  if (!normalizedAlias) return { success: false, error: 'Alias is invalid' }

  try {
    const termRows = await pgClient`
      SELECT id
      FROM culinary_dictionary_terms
      WHERE id::text = ${parsed.data.termId}
         OR canonical_slug = ${parsed.data.termId}
      LIMIT 1
    `

    const termId = termRows[0]?.id ? String(termRows[0].id) : null
    if (!termId) return { success: false, error: 'Dictionary term not found' }

    const db: any = createServerClient()
    const { data, error } = await db
      .from('chef_culinary_dictionary_overrides' as any)
      .insert({
        chef_id: user.entityId,
        term_id: termId,
        override_type: 'custom_alias',
        value: {
          alias: parsed.data.alias,
          normalizedAlias,
          aliasKind: parsed.data.aliasKind,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('[addChefDictionaryAlias] Error:', error)
      return { success: false, error: 'Failed to save alias' }
    }

    revalidateDictionarySurfaces()
    return { success: true, aliasId: data?.id as string | undefined }
  } catch (error) {
    console.error('[addChefDictionaryAlias] Error:', error)
    return { success: false, error: 'Dictionary tables are not available yet' }
  }
}

export async function addChefDictionaryAliasForm(formData: FormData): Promise<void> {
  const result = await addChefDictionaryAlias({
    termId: String(formData.get('termId') ?? ''),
    alias: String(formData.get('alias') ?? ''),
    aliasKind: String(formData.get('aliasKind') ?? 'synonym'),
  })
  if (!result.success) {
    console.error('[addChefDictionaryAliasForm] Error:', result.error)
  }
}

export async function hideChefDictionaryAlias(input: unknown) {
  const user = await requireChef()
  const parsed = HideAliasSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid alias' }

  try {
    const db: any = createServerClient()
    const { error } = await db.from('chef_culinary_dictionary_overrides' as any).insert({
      chef_id: user.entityId,
      alias_id: parsed.data.aliasId,
      override_type: 'hide_alias',
      value: {},
    })

    if (error) return { success: false, error: 'Failed to hide alias' }
    revalidateDictionarySurfaces()
    return { success: true }
  } catch (error) {
    console.error('[hideChefDictionaryAlias] Error:', error)
    return { success: false, error: 'Dictionary tables are not available yet' }
  }
}

export async function createChefDictionaryTerm(input: unknown) {
  const user = await requireChef()
  const parsed = CreateTermSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid dictionary term' }

  const normalizedValue = normalizeDictionaryAlias(parsed.data.canonicalName)
  if (!normalizedValue) return { success: false, error: 'Dictionary term is invalid' }

  try {
    const db: any = createServerClient()
    const { data, error } = await db
      .from('culinary_dictionary_review_queue' as any)
      .insert({
        chef_id: user.entityId,
        source_surface: 'chef_dictionary',
        source_value: parsed.data.canonicalName,
        normalized_value: normalizedValue,
        confidence: null,
        status: 'pending',
        resolution: {
          canonicalName: parsed.data.canonicalName,
          canonicalSlug: slugifyCulinaryTerm(parsed.data.canonicalName),
          termType: parsed.data.termType,
          definition: parsed.data.definition ?? null,
          aliases: parsed.data.aliases ?? [],
        },
      })
      .select('id')
      .single()

    if (error) return { success: false, error: 'Failed to queue dictionary term' }
    revalidateDictionarySurfaces()
    return { success: true, reviewId: data?.id as string | undefined }
  } catch (error) {
    console.error('[createChefDictionaryTerm] Error:', error)
    return { success: false, error: 'Dictionary tables are not available yet' }
  }
}

export async function resolveDictionaryReviewItem(input: unknown) {
  const user = await requireChef()
  const parsed = ResolveReviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid review decision' }

  try {
    const db: any = createServerClient()
    const { data: reviewItem, error: readError } = await db
      .from('culinary_dictionary_review_queue' as any)
      .select('id, source_value, normalized_value, suggested_term_id, status')
      .eq('id', parsed.data.reviewId)
      .eq('chef_id', user.entityId)
      .maybeSingle()

    if (readError) return { success: false, error: 'Failed to load review item' }
    if (!reviewItem) return { success: false, error: 'Review item not found' }
    if (reviewItem.status !== 'pending') {
      return { success: false, error: 'Review item is already resolved' }
    }

    const sourceValue = String(reviewItem.source_value ?? '').trim()
    const normalizedValue = String(reviewItem.normalized_value ?? '').trim()
    if (!sourceValue || !normalizedValue) return { success: false, error: 'Review item is invalid' }

    const resolutionAction =
      parsed.data.resolutionAction ??
      (parsed.data.decision === 'approved' && parsed.data.termId
        ? 'add_alias_to_existing_term'
        : parsed.data.decision === 'approved'
          ? 'approve_new_private_term'
          : parsed.data.decision === 'rejected'
            ? 'reject'
            : 'dismiss')

    const status =
      resolutionAction === 'reject'
        ? 'rejected'
        : resolutionAction === 'dismiss'
          ? 'dismissed'
          : 'approved'

    if (status !== parsed.data.decision) {
      return { success: false, error: 'Review decision does not match resolution action' }
    }

    const fallbackTermId = reviewItem.suggested_term_id
      ? String(reviewItem.suggested_term_id)
      : undefined
    const termId = parsed.data.termId || fallbackTermId
    const now = new Date().toISOString()
    let suggestedTermId: string | null | undefined
    let resolution: Record<string, unknown>

    if (resolutionAction === 'approve_new_private_term') {
      const canonicalName = parsed.data.canonicalName || sourceValue
      const canonicalSlug = slugifyCulinaryTerm(canonicalName)
      const termType = parsed.data.termType ?? 'ingredient'
      if (!canonicalName || !canonicalSlug) {
        return { success: false, error: 'Private term name is required' }
      }

      suggestedTermId = null
      resolution = {
        action: resolutionAction,
        decidedAt: now,
        canonicalName,
        canonicalSlug,
        termType,
        definition: parsed.data.definition || null,
        aliases: canonicalName === sourceValue ? [] : [sourceValue],
      }
    } else if (resolutionAction === 'add_alias_to_existing_term') {
      const alias = parsed.data.alias || sourceValue
      const normalizedAlias = normalizeDictionaryAlias(alias)
      if (!termId) return { success: false, error: 'Suggested term is required for alias approval' }
      if (!normalizedAlias) return { success: false, error: 'Alias is invalid' }

      suggestedTermId = termId
      resolution = {
        action: resolutionAction,
        decidedAt: now,
        termId,
        alias,
        normalizedAlias,
        aliasKind: parsed.data.aliasKind ?? 'synonym',
      }
    } else {
      suggestedTermId = termId
      resolution = {
        action: resolutionAction,
        decidedAt: now,
        reason: resolutionAction === 'reject' ? 'Rejected by chef' : 'Dismissed by chef',
      }
    }

    const { data, error } = await db
      .from('culinary_dictionary_review_queue' as any)
      .update({
        status,
        suggested_term_id: suggestedTermId,
        resolution,
        resolved_at: now,
      })
      .eq('id', parsed.data.reviewId)
      .eq('chef_id', user.entityId)
      .eq('status', 'pending')
      .select('id')

    if (error) return { success: false, error: 'Failed to update review item' }
    if (!data || data.length === 0) return { success: false, error: 'Review item not found' }

    revalidateDictionarySurfaces()
    return { success: true }
  } catch (error) {
    console.error('[resolveDictionaryReviewItem] Error:', error)
    return { success: false, error: 'Dictionary tables are not available yet' }
  }
}

export async function resolveDictionaryReviewItemForm(formData: FormData): Promise<void> {
  const result = await resolveDictionaryReviewItem({
    reviewId: String(formData.get('reviewId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    resolutionAction: String(formData.get('resolutionAction') ?? '') || undefined,
    termId: String(formData.get('termId') ?? '') || undefined,
    canonicalName: String(formData.get('canonicalName') ?? '') || undefined,
    termType: String(formData.get('termType') ?? '') || undefined,
    definition: String(formData.get('definition') ?? '') || undefined,
    alias: String(formData.get('alias') ?? '') || undefined,
    aliasKind: String(formData.get('aliasKind') ?? '') || undefined,
  })
  if (!result.success) {
    console.error('[resolveDictionaryReviewItemForm] Error:', result.error)
  }
}

export async function getDictionaryReviewQueue() {
  const user = await requireChef()
  try {
    const items = await readDictionaryReviewQueue(user.entityId)
    return { success: true, items }
  } catch (error) {
    console.error('[getDictionaryReviewQueue] Error:', error)
    return { success: false, error: 'Failed to load review queue' }
  }
}
