'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseCSV } from './csv-parser'

// ---- Types ----

export type ColumnMapping = {
  sourceColumn: string
  targetField: string
}

export type ImportResult = {
  imported: number
  skipped: number
  errors: string[]
}

export type CSVPreview = {
  headers: string[]
  sampleRows: string[][]
  totalRows: number
  detectedDelimiter: string
}

export type MXPRecipe = {
  name: string
  category: string
  servings: string
  ingredients: string[]
  instructions: string
  notes: string
}

export type ImportHistoryEntry = {
  id: string
  import_type: string
  imported_count: number
  skipped_count: number
  error_count: number
  created_at: string
  metadata: Record<string, unknown> | null
}

type MappedRow = Record<string, string>

// Field definitions moved to ./csv-import-constants.ts

// ---- Server Actions ----

/**
 * Parse CSV text and return a preview (first 10 rows + metadata).
 */
export async function parseCSVPreview(csvText: string, hasHeaders?: boolean): Promise<CSVPreview> {
  await requireChef()

  const { detectDelimiter } = await import('./csv-parser')
  const delimiter = detectDelimiter(csvText)
  const parsed = parseCSV(csvText, delimiter)

  return {
    headers: parsed.headers,
    sampleRows: parsed.rows.slice(0, 10),
    totalRows: parsed.rows.length,
    detectedDelimiter: delimiter === '\t' ? 'tab' : delimiter,
  }
}

/**
 * Import clients from mapped CSV rows.
 */
export async function importClients(mappedRows: MappedRow[]): Promise<ImportResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  for (let i = 0; i < mappedRows.length; i++) {
    const row = mappedRows[i]
    const rowNum = i + 1

    // full_name and email are required
    if (!row.full_name?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field "full_name"`)
      result.skipped++
      continue
    }
    if (!row.email?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field "email"`)
      result.skipped++
      continue
    }

    // Check for duplicate email within this tenant
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', row.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      result.errors.push(`Row ${rowNum}: Client with email "${row.email}" already exists`)
      result.skipped++
      continue
    }

    const insertData: Record<string, unknown> = {
      tenant_id: tenantId,
      full_name: row.full_name.trim(),
      email: row.email.trim().toLowerCase(),
      status: 'active' as const,
    }

    if (row.phone?.trim()) insertData.phone = row.phone.trim()
    if (row.address?.trim()) insertData.address = row.address.trim()
    if (row.preferred_name?.trim()) insertData.preferred_name = row.preferred_name.trim()
    if (row.partner_name?.trim()) insertData.partner_name = row.partner_name.trim()
    if (row.kitchen_size?.trim()) insertData.kitchen_size = row.kitchen_size.trim()
    if (row.allergies?.trim()) {
      insertData.allergies = row.allergies
        .split(',')
        .map((a: string) => a.trim())
        .filter(Boolean)
    }
    if (row.dietary_restrictions?.trim()) {
      insertData.dietary_restrictions = row.dietary_restrictions
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean)
    }

    const { error } = await supabase.from('clients').insert(insertData)

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`)
      result.skipped++
    } else {
      result.imported++
    }
  }

  // Log import history
  await logImportHistory(supabase, tenantId, 'clients', result)

  return result
}

/**
 * Import recipes from mapped CSV rows.
 */
export async function importRecipes(mappedRows: MappedRow[]): Promise<ImportResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  const validCategories = [
    'sauce',
    'protein',
    'starch',
    'vegetable',
    'fruit',
    'dessert',
    'bread',
    'pasta',
    'soup',
    'salad',
    'appetizer',
    'condiment',
    'beverage',
    'other',
  ]

  for (let i = 0; i < mappedRows.length; i++) {
    const row = mappedRows[i]
    const rowNum = i + 1

    if (!row.name?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field "name"`)
      result.skipped++
      continue
    }

    const category = row.category?.trim().toLowerCase() || 'other'
    const resolvedCategory = validCategories.includes(category) ? category : 'other'

    const insertData: Record<string, unknown> = {
      tenant_id: tenantId,
      name: row.name.trim(),
      category: resolvedCategory,
      method: row.method?.trim() || 'Imported - no method provided',
    }

    if (row.description?.trim()) insertData.description = row.description.trim()
    if (row.notes?.trim()) insertData.notes = row.notes.trim()
    if (row.yield_description?.trim()) insertData.yield_description = row.yield_description.trim()
    if (row.yield_unit?.trim()) insertData.yield_unit = row.yield_unit.trim()

    const prepTime = parseInt(row.prep_time_minutes, 10)
    if (!isNaN(prepTime) && prepTime > 0) insertData.prep_time_minutes = prepTime

    const cookTime = parseInt(row.cook_time_minutes, 10)
    if (!isNaN(cookTime) && cookTime > 0) insertData.cook_time_minutes = cookTime

    const yieldQty = parseFloat(row.yield_quantity)
    if (!isNaN(yieldQty) && yieldQty > 0) insertData.yield_quantity = yieldQty

    if (row.dietary_tags?.trim()) {
      insertData.dietary_tags = row.dietary_tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    }

    const { error } = await supabase.from('recipes').insert(insertData)

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`)
      result.skipped++
    } else {
      result.imported++
    }
  }

  await logImportHistory(supabase, tenantId, 'recipes', result)

  return result
}

/**
 * Import events from mapped CSV rows.
 * Requires client_id lookup by email or name.
 */
export async function importEvents(mappedRows: MappedRow[]): Promise<ImportResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  for (let i = 0; i < mappedRows.length; i++) {
    const row = mappedRows[i]
    const rowNum = i + 1

    if (!row.event_date?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field "event_date"`)
      result.skipped++
      continue
    }

    if (!row.guest_count?.trim()) {
      result.errors.push(`Row ${rowNum}: Missing required field "guest_count"`)
      result.skipped++
      continue
    }

    const guestCount = parseInt(row.guest_count, 10)
    if (isNaN(guestCount) || guestCount < 1) {
      result.errors.push(`Row ${rowNum}: Invalid guest_count "${row.guest_count}"`)
      result.skipped++
      continue
    }

    // Events need a client - try to find one by name or use first client
    let clientId: string | null = null

    if (row.client_name?.trim()) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('full_name', row.client_name.trim())
        .maybeSingle()
      clientId = client?.id || null
    }

    if (!clientId && row.client_email?.trim()) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', row.client_email.trim().toLowerCase())
        .maybeSingle()
      clientId = client?.id || null
    }

    if (!clientId) {
      result.errors.push(
        `Row ${rowNum}: Could not find matching client. Provide client_name or client_email.`
      )
      result.skipped++
      continue
    }

    const insertData: Record<string, unknown> = {
      tenant_id: tenantId,
      client_id: clientId,
      event_date: row.event_date.trim(),
      guest_count: guestCount,
      status: 'draft' as const,
      location_address: row.location_address?.trim() || 'TBD',
      location_city: row.location_city?.trim() || 'TBD',
      location_state: row.location_state?.trim() || 'TBD',
      location_zip: row.location_zip?.trim() || '00000',
    }

    if (row.occasion?.trim()) insertData.occasion = row.occasion.trim()
    if (row.kitchen_notes?.trim()) insertData.kitchen_notes = row.kitchen_notes.trim()

    if (row.dietary_restrictions?.trim()) {
      insertData.dietary_restrictions = row.dietary_restrictions
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean)
    }
    if (row.allergies?.trim()) {
      insertData.allergies = row.allergies
        .split(',')
        .map((a: string) => a.trim())
        .filter(Boolean)
    }

    const { error } = await supabase.from('events').insert(insertData)

    if (error) {
      result.errors.push(`Row ${rowNum}: ${error.message}`)
      result.skipped++
    } else {
      result.imported++
    }
  }

  await logImportHistory(supabase, tenantId, 'events', result)

  return result
}

/**
 * Parse a MasterCook MXP file (plain text with markers) into recipe objects.
 */
export async function parseMXPFile(content: string): Promise<MXPRecipe[]> {
  await requireChef()

  const recipes: MXPRecipe[] = []
  // MXP format uses markers like * Exported from MasterCook *
  // Each recipe starts with a line of dashes or a recipe title marker
  const blocks = content.split(/\n\s*\*\s*Exported from MasterCook\s*\*/i)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.length < 10) continue

    const recipe = parseSingleMXPRecipe(trimmed)
    if (recipe) {
      recipes.push(recipe)
    }
  }

  // If no standard markers found, try line-based splitting
  if (recipes.length === 0) {
    const altBlocks = content.split(/^-{5,}$/m)
    for (const block of altBlocks) {
      const trimmed = block.trim()
      if (!trimmed || trimmed.length < 10) continue
      const recipe = parseSingleMXPRecipe(trimmed)
      if (recipe) {
        recipes.push(recipe)
      }
    }
  }

  return recipes
}

function parseSingleMXPRecipe(block: string): MXPRecipe | null {
  const lines = block.split('\n').map((l) => l.trimEnd())

  // Find the recipe title - first non-empty, non-dash line
  let name = ''
  let startIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && !line.match(/^-+$/) && !line.match(/^\*/) && line.length > 1) {
      name = line
      startIdx = i + 1
      break
    }
  }

  if (!name) return null

  // Parse sections
  let category = 'other'
  let servings = ''
  const ingredients: string[] = []
  const instructionLines: string[] = []
  const noteLines: string[] = []
  let section: 'meta' | 'ingredients' | 'instructions' | 'notes' = 'meta'

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Section markers
    if (trimmedLine.match(/^-+\s*$/)) continue

    if (/^Recipe By\s*:/i.test(trimmedLine)) continue

    if (/^Serving Size\s*:/i.test(trimmedLine)) {
      const match = trimmedLine.match(/^Serving Size\s*:\s*(.+)/i)
      if (match) servings = match[1].trim()
      continue
    }

    if (/^Categories\s*:/i.test(trimmedLine)) {
      const match = trimmedLine.match(/^Categories\s*:\s*(.+)/i)
      if (match) category = match[1].trim()
      continue
    }

    if (/^Preparation Time\s*:/i.test(trimmedLine)) continue

    // Detect section transitions
    if (trimmedLine === '' && section === 'meta' && i > startIdx + 2) {
      section = 'ingredients'
      continue
    }

    if (/^-\s*-\s*-/i.test(trimmedLine)) {
      if (section === 'ingredients') {
        section = 'instructions'
      } else if (section === 'instructions') {
        section = 'notes'
      }
      continue
    }

    if (section === 'meta' && trimmedLine) {
      // Could be an ingredient line if it has amounts
      if (/^\d|^[½¼¾⅓⅔⅛]/.test(trimmedLine) || /^\s{2,}\d/.test(line)) {
        section = 'ingredients'
        ingredients.push(trimmedLine)
      }
      continue
    }

    if (section === 'ingredients' && trimmedLine) {
      ingredients.push(trimmedLine)
      continue
    }

    if (section === 'instructions' && trimmedLine) {
      instructionLines.push(trimmedLine)
      continue
    }

    if (section === 'notes' && trimmedLine) {
      noteLines.push(trimmedLine)
      continue
    }
  }

  return {
    name,
    category,
    servings,
    ingredients,
    instructions: instructionLines.join('\n'),
    notes: noteLines.join('\n'),
  }
}

/**
 * Get import history for the current tenant.
 */
export async function getImportHistory(): Promise<ImportHistoryEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('activity_events')
    .select('id, event_type, metadata, created_at')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'data_import')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[import-history] Failed to fetch:', error.message)
    return []
  }

  return (data || []).map((row: any) => {
    const meta = (row.metadata || {}) as Record<string, unknown>
    return {
      id: row.id,
      import_type: (meta.import_type as string) || 'unknown',
      imported_count: (meta.imported_count as number) || 0,
      skipped_count: (meta.skipped_count as number) || 0,
      error_count: (meta.error_count as number) || 0,
      created_at: row.created_at,
      metadata: meta,
    }
  })
}

// ---- Internal helpers ----

async function logImportHistory(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  importType: string,
  result: ImportResult
) {
  try {
    await supabase.from('activity_events').insert({
      tenant_id: tenantId,
      event_type: 'data_import',
      actor_type: 'chef',
      metadata: {
        import_type: importType,
        imported_count: result.imported,
        skipped_count: result.skipped,
        error_count: result.errors.length,
        errors: result.errors.slice(0, 20), // Cap stored errors
      },
    })
  } catch (err) {
    console.error('[non-blocking] Failed to log import history', err)
  }
}
