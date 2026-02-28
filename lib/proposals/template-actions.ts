'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type ProposalTemplate = {
  id: string
  chefId: string
  name: string
  coverPhotoUrl: string | null
  description: string | null
  defaultMenuId: string | null
  basePriceCents: number
  includedServices: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  coverPhotoUrl: z.string().url().optional(),
  description: z.string().optional(),
  defaultMenuId: z.string().uuid().optional(),
  basePriceCents: z.number().int().min(0),
  includedServices: z.record(z.string(), z.unknown()).optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function createProposalTemplate(
  input: z.infer<typeof CreateTemplateSchema>
): Promise<ProposalTemplate> {
  const user = await requireChef()
  const parsed = CreateTemplateSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('proposal_templates')
    .insert({
      chef_id: user.tenantId!,
      name: parsed.name,
      cover_photo_url: parsed.coverPhotoUrl || null,
      description: parsed.description || null,
      default_menu_id: parsed.defaultMenuId || null,
      base_price_cents: parsed.basePriceCents,
      included_services: parsed.includedServices || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create proposal template: ${error.message}`)

  revalidatePath('/proposals')

  return mapTemplate(data)
}

export async function listProposalTemplates(): Promise<ProposalTemplate[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to list proposal templates: ${error.message}`)

  return (data || []).map(mapTemplate)
}

export async function getProposalTemplate(id: string): Promise<ProposalTemplate> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Failed to get proposal template: ${error.message}`)

  return mapTemplate(data)
}

export async function deleteProposalTemplate(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('proposal_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete proposal template: ${error.message}`)

  revalidatePath('/proposals')
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapTemplate(row: any): ProposalTemplate {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    coverPhotoUrl: row.cover_photo_url,
    description: row.description,
    defaultMenuId: row.default_menu_id,
    basePriceCents: row.base_price_cents,
    includedServices: row.included_services,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
