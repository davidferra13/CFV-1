'use server'

// Prospecting Hub - Call Script CRUD
// Admin-only. Manages reusable cold-calling scripts.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { CallScript } from './types'

// ── Schema ───────────────────────────────────────────────────────────────────

const ScriptSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).nullable().optional(),
  script_body: z.string().min(1).max(10000),
  is_default: z.boolean().default(false),
})

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getCallScripts(): Promise<CallScript[]> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('prospect_call_scripts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getCallScripts] Error:', error)
    return []
  }
  return (data ?? []) as CallScript[]
}

export async function getCallScript(id: string): Promise<CallScript | null> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('prospect_call_scripts')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) return null
  return data as CallScript
}

export async function getScriptForCategory(category: string): Promise<CallScript | null> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Try exact category match first
  const { data: exact } = await db
    .from('prospect_call_scripts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('category', category)
    .limit(1)
    .maybeSingle()

  if (exact) return exact as CallScript

  // Fall back to default script
  const { data: defaultScript } = await db
    .from('prospect_call_scripts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  return (defaultScript as CallScript) ?? null
}

export async function createCallScript(input: z.infer<typeof ScriptSchema>) {
  await requireAdmin()
  const user = await requireChef()
  const validated = ScriptSchema.parse(input)
  const db: any = createServerClient()

  // If setting as default, unset any existing default
  if (validated.is_default) {
    await db
      .from('prospect_call_scripts')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('prospect_call_scripts')
    .insert({
      ...validated,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[createCallScript] Error:', error)
    throw new Error('Failed to create script')
  }

  revalidatePath('/prospecting/scripts')
  return { success: true as const, script: data as CallScript }
}

export async function updateCallScript(id: string, input: Partial<z.infer<typeof ScriptSchema>>) {
  await requireAdmin()
  const user = await requireChef()
  const validated = ScriptSchema.partial().parse(input)
  const db: any = createServerClient()

  // If setting as default, unset any existing default
  if (validated.is_default) {
    await db
      .from('prospect_call_scripts')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data, error } = await db
    .from('prospect_call_scripts')
    .update(validated)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateCallScript] Error:', error)
    throw new Error('Failed to update script')
  }

  revalidatePath('/prospecting/scripts')
  return { success: true as const, script: data as CallScript }
}

export async function deleteCallScript(id: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('prospect_call_scripts')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteCallScript] Error:', error)
    throw new Error('Failed to delete script')
  }

  revalidatePath('/prospecting/scripts')
  return { success: true as const }
}
