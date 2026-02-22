'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type SmartField = {
  id: string
  chefId: string
  fieldKey: string
  fieldValue: string
  createdAt: string
  updatedAt: string
}

export type RenderedTemplate = {
  original: string
  rendered: string
  tokensReplaced: string[]
  tokensMissing: string[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const SaveSmartFieldSchema = z.object({
  fieldKey: z.string().min(1, 'Field key is required'),
  fieldValue: z.string().min(1, 'Field value is required'),
})

const RenderSmartFieldsSchema = z.object({
  template: z.string(),
  context: z
    .object({
      clientName: z.string().optional(),
      eventDate: z.string().optional(),
      guestCount: z.number().int().optional(),
    })
    .optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function getSmartFields(): Promise<SmartField[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('smart_field_values')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('field_key', { ascending: true })

  if (error) throw new Error(`Failed to fetch smart fields: ${error.message}`)

  return (data || []).map(mapSmartField)
}

export async function saveSmartField(fieldKey: string, fieldValue: string): Promise<SmartField> {
  const user = await requireChef()
  const parsed = SaveSmartFieldSchema.parse({ fieldKey, fieldValue })
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('smart_field_values')
    .upsert(
      {
        chef_id: user.tenantId!,
        field_key: parsed.fieldKey,
        field_value: parsed.fieldValue,
      },
      { onConflict: 'chef_id,field_key' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save smart field: ${error.message}`)

  revalidatePath('/proposals')
  revalidatePath('/settings')

  return mapSmartField(data)
}

/**
 * Replace {tokens} in a template string with smart field values
 * and optional context values (clientName, eventDate, guestCount).
 *
 * Token syntax: {field_key} or {clientName}, {eventDate}, {guestCount}
 */
export async function renderSmartFields(
  template: string,
  context?: { clientName?: string; eventDate?: string; guestCount?: number }
): Promise<RenderedTemplate> {
  const user = await requireChef()
  const parsed = RenderSmartFieldsSchema.parse({ template, context })
  const supabase = createServerClient()

  // Fetch all smart fields for this chef
  const { data, error } = await supabase
    .from('smart_field_values')
    .select('field_key, field_value')
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to fetch smart fields for rendering: ${error.message}`)

  // Build lookup map: smart fields + context overrides
  const fieldMap: Record<string, string> = {}
  for (const row of data || []) {
    fieldMap[row.field_key] = row.field_value
  }

  // Context values override smart fields with the same key
  if (parsed.context?.clientName) fieldMap['clientName'] = parsed.context.clientName
  if (parsed.context?.eventDate) fieldMap['eventDate'] = parsed.context.eventDate
  if (parsed.context?.guestCount !== undefined)
    fieldMap['guestCount'] = String(parsed.context.guestCount)

  // Find all tokens in the template
  const tokenRegex = /\{([^}]+)\}/g
  const tokensReplaced: string[] = []
  const tokensMissing: string[] = []

  const rendered = parsed.template.replace(tokenRegex, (match, tokenKey: string) => {
    const trimmedKey = tokenKey.trim()
    if (trimmedKey in fieldMap) {
      tokensReplaced.push(trimmedKey)
      return fieldMap[trimmedKey]
    } else {
      tokensMissing.push(trimmedKey)
      return match // Leave unreplaced token as-is
    }
  })

  return {
    original: parsed.template,
    rendered,
    tokensReplaced: [...new Set(tokensReplaced)],
    tokensMissing: [...new Set(tokensMissing)],
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapSmartField(row: any): SmartField {
  return {
    id: row.id,
    chefId: row.chef_id,
    fieldKey: row.field_key,
    fieldValue: row.field_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
