// Starter Template Actions - Load archetype-specific templates into entity_templates
// Server actions for managing starter template loading on first setup.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getArchetypeSelection } from './archetype-actions'
import {
  getStarterTemplatesForArchetype,
  TEMPLATE_TYPE_LABELS,
  type StarterTemplate,
  type StarterTemplateType,
} from './starter-templates'

// ---- Helpers ----------------------------------------------------------------

/** Map StarterTemplateType to entity_templates template_type column */
function mapToEntityTemplateType(type: StarterTemplateType): string {
  // Store as the StarterTemplateType value directly.
  // The entity_templates table uses a text column, so any string works.
  return type
}

/** Build template_data JSONB from a StarterTemplate */
function buildTemplateData(template: StarterTemplate): Record<string, any> {
  const data: Record<string, any> = {
    body: template.body,
    starter_template: true,
    archetype: template.archetypeId,
  }
  if (template.subject) {
    data.subject = template.subject
  }
  return data
}

// ---- Public Actions ---------------------------------------------------------

/**
 * Get starter templates for the chef's current archetype(s).
 * If archetypeKey is provided, uses that instead of the stored selection.
 * Returns the template definitions (not DB records).
 */
export async function getStarterTemplates(archetypeKey?: string) {
  await requireChef()

  if (archetypeKey) {
    return getStarterTemplatesForArchetype(archetypeKey as any)
  }

  // Use the chef's stored archetype selection
  const selections = await getArchetypeSelection()
  if (selections.length === 0) {
    // No archetype selected, return all templates
    return getStarterTemplatesForArchetype()
  }

  // Return templates for the primary archetype
  return getStarterTemplatesForArchetype(selections[0])
}

/**
 * Check if starter templates have already been loaded for the current chef.
 * Looks for any entity_template with starter_template=true in template_data.
 */
export async function hasLoadedStarterTemplates(): Promise<boolean> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('entity_templates')
    .select('id')
    .eq('tenant_id', tenantId)
    .contains('template_data', { starter_template: true })
    .limit(1)

  if (error) {
    console.error('[hasLoadedStarterTemplates] Query error:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Load starter templates into entity_templates for the current chef.
 * Uses the chef's archetype selection to determine which templates to load.
 * Prevents duplicate loading by checking hasLoadedStarterTemplates first.
 * Returns the number of templates loaded.
 */
export async function loadStarterTemplates(): Promise<{
  loaded: number
  skipped: boolean
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Check for duplicates
  const alreadyLoaded = await hasLoadedStarterTemplates()
  if (alreadyLoaded) {
    return { loaded: 0, skipped: true }
  }

  // Get the chef's archetype
  const selections = await getArchetypeSelection()
  const primaryArchetype = selections.length > 0 ? selections[0] : undefined

  // Get templates for this archetype
  const templates = getStarterTemplatesForArchetype(primaryArchetype)

  if (templates.length === 0) {
    return { loaded: 0, skipped: false }
  }

  // Build insert rows
  const rows = templates.map((t) => ({
    tenant_id: tenantId,
    name: t.name,
    template_type: mapToEntityTemplateType(t.templateType),
    template_data: buildTemplateData(t),
    description: TEMPLATE_TYPE_LABELS[t.templateType],
  }))

  const { error } = await supabase.from('entity_templates').insert(rows)

  if (error) {
    console.error('[loadStarterTemplates] Insert error:', error)
    throw new Error('Failed to load starter templates')
  }

  revalidatePath('/templates')
  revalidatePath('/settings')

  return { loaded: templates.length, skipped: false }
}

/**
 * Get the count of loaded starter templates for the current chef.
 * Useful for the UI to show status.
 */
export async function getStarterTemplateCount(): Promise<number> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { count, error } = await supabase
    .from('entity_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .contains('template_data', { starter_template: true })

  if (error) {
    console.error('[getStarterTemplateCount] Query error:', error)
    return 0
  }

  return count ?? 0
}
