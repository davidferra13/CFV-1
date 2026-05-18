'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ClauseCategory } from './default-clauses'

const VALID_CATEGORIES: ClauseCategory[] = [
  'cancellation',
  'reschedule',
  'liability',
  'kitchen',
  'ip',
  'confidentiality',
  'force_majeure',
  'dispute',
  'payment',
  'scope',
  'custom',
]

const CreateClauseSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.enum(VALID_CATEGORIES as [string, ...string[]]),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

const UpdateClauseSchema = CreateClauseSchema.partial().extend({
  id: z.string().uuid(),
})

export async function getClauses(category?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('contract_clauses')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data: data ?? [] }
}

export async function getDefaultClauses() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contract_clauses')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })

  if (error) return { success: false as const, error: error.message }
  return { success: true as const, data: data ?? [] }
}

export async function createClause(input: z.infer<typeof CreateClauseSchema>) {
  const user = await requireChef()
  const parsed = CreateClauseSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contract_clauses')
    .insert({
      chef_id: user.tenantId!,
      slug: parsed.slug,
      title: parsed.title,
      body: parsed.body,
      category: parsed.category,
      is_default: parsed.is_default ?? false,
      sort_order: parsed.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return { success: false as const, error: error.message }

  revalidatePath('/contracts')
  return { success: true as const, data }
}

export async function updateClause(input: z.infer<typeof UpdateClauseSchema>) {
  const user = await requireChef()
  const parsed = UpdateClauseSchema.parse(input)
  const db: any = createServerClient()

  const { id, ...updates } = parsed
  const updatePayload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('contract_clauses')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) return { success: false as const, error: error.message }

  revalidatePath('/contracts')
  return { success: true as const, data }
}

export async function deleteClause(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('contract_clauses')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false as const, error: error.message }

  revalidatePath('/contracts')
  return { success: true as const }
}
