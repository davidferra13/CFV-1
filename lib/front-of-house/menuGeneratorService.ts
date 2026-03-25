'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  FrontOfHouseContextSchema,
  FrontOfHouseEventTypeSchema,
  MenuTemplateSchema,
  type FrontOfHouseContext,
} from './menuTemplateSchema'
import { generateFrontOfHouseMenuPayload } from './generateFrontOfHouseMenu'

const SaveTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['default', 'holiday', 'special_event']),
  event_type: FrontOfHouseEventTypeSchema.optional().nullable(),
  theme: z.string().optional().nullable(),
  layout: z.record(z.string(), z.any()).default({}),
  placeholders: z.array(z.string()).default([]),
  styles: z.record(z.string(), z.any()).default({}),
  default_fields: z.record(z.string(), z.boolean()).default({}),
})

const GenerateSchema = z.object({
  menuId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  context: FrontOfHouseContextSchema.optional(),
})

export async function listFrontOfHouseTemplates() {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data, error } = await (db as any)
    .from('menu_templates')
    .select('*')
    .or(`tenant_id.eq.${user.tenantId},and(is_system.eq.true,tenant_id.is.null)`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error('Failed to load menu templates')
  }

  return ((data ?? []) as unknown[]).map((row) => MenuTemplateSchema.parse(row))
}

export async function saveFrontOfHouseTemplate(input: z.infer<typeof SaveTemplateSchema>) {
  const user = await requireChef()
  const parsed = SaveTemplateSchema.parse(input)
  const db: any = createServerClient()

  const table = (db as any).from('menu_templates')
  const payload = {
    tenant_id: user.tenantId!,
    slug: parsed.slug,
    name: parsed.name,
    description: parsed.description ?? null,
    type: parsed.type,
    event_type: parsed.event_type ?? null,
    theme: parsed.theme ?? null,
    layout: parsed.layout,
    placeholders: parsed.placeholders,
    styles: parsed.styles,
    default_fields: parsed.default_fields,
    is_system: false,
    updated_by: user.id,
  }

  let error: { message?: string } | null = null
  if (parsed.id) {
    const result = await table
      .update(payload)
      .eq('id', parsed.id)
      .eq('tenant_id', user.tenantId!)
      .eq('is_system', false)
    error = result.error
  } else {
    const result = await table.insert({
      ...payload,
      created_by: user.id,
    })
    error = result.error
  }

  if (error) {
    throw new Error(error.message || 'Failed to save menu template')
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

export async function deleteFrontOfHouseTemplate(templateId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const { error } = await (db as any)
    .from('menu_templates')
    .delete()
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_system', false)

  if (error) {
    throw new Error('Failed to delete menu template')
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

export async function generateAndSaveFrontOfHouseMenu(input: z.infer<typeof GenerateSchema>) {
  const user = await requireChef()
  const parsed = GenerateSchema.parse(input)
  const db: any = createServerClient()

  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('id, status, tenant_id, event_id')
    .eq('id', parsed.menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Menu not found')
  }

  const payload = await generateFrontOfHouseMenuPayload(
    parsed.menuId,
    parsed.templateId,
    parsed.context
  )

  const { data: saved, error } = await (db as any)
    .from('front_of_house_menus')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: parsed.menuId,
      event_id: menu.event_id ?? null,
      template_id: parsed.templateId ?? null,
      event_type: payload.eventType,
      context: {
        ...(payload.context as FrontOfHouseContext),
        theme: payload.theme ?? payload.context.theme ?? null,
      },
      rendered_html: payload.html,
      generated_by: user.id,
    })
    .select('id, generated_at, event_type')
    .single()

  if (error || !saved) {
    throw new Error('Failed to save front-of-house menu')
  }

  revalidatePath(`/menus/${parsed.menuId}`)
  if (menu.event_id) {
    revalidatePath(`/events/${menu.event_id}`)
  }

  return {
    id: saved.id as string,
    generatedAt: saved.generated_at as string,
    eventType: saved.event_type as string,
    html: payload.html,
  }
}

export async function getLatestFrontOfHouseMenu(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await (db as any)
    .from('front_of_house_menus')
    .select('id, template_id, event_type, context, rendered_html, generated_at')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function autoGenerateFrontOfHouseMenuForMenu(
  menuId: string,
  context?: FrontOfHouseContext
) {
  return generateAndSaveFrontOfHouseMenu({
    menuId,
    context,
  })
}
