// Client Taste Profile Server Actions
// Fetch and upsert per-client flavor preferences, spice tolerance, etc.
// Chef-entered data only. AI must NOT generate taste profiles.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ClientTasteProfile = {
  id: string
  clientId: string
  tenantId: string
  favoriteCuisines: string[]
  dislikedIngredients: string[]
  spiceTolerance: number
  texturePreferences: string[]
  flavorNotes: string | null
  preferredProteins: string[]
  avoids: string[]
  specialOccasionsNotes: string | null
  createdAt: string
  updatedAt: string
}

// --- Schema ---

const TasteProfileSchema = z.object({
  favoriteCuisines: z.array(z.string()).default([]),
  dislikedIngredients: z.array(z.string()).default([]),
  spiceTolerance: z.number().int().min(1).max(5).default(3),
  texturePreferences: z.array(z.string()).default([]),
  flavorNotes: z.string().nullable().default(null),
  preferredProteins: z.array(z.string()).default([]),
  avoids: z.array(z.string()).default([]),
  specialOccasionsNotes: z.string().nullable().default(null),
})

export type TasteProfileInput = z.infer<typeof TasteProfileSchema>

// --- Helpers ---

function rowToProfile(row: Record<string, unknown>): ClientTasteProfile {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    tenantId: row.tenant_id as string,
    favoriteCuisines: (row.favorite_cuisines as string[]) ?? [],
    dislikedIngredients: (row.disliked_ingredients as string[]) ?? [],
    spiceTolerance: (row.spice_tolerance as number) ?? 3,
    texturePreferences: (row.texture_preferences as string[]) ?? [],
    flavorNotes: (row.flavor_notes as string) ?? null,
    preferredProteins: (row.preferred_proteins as string[]) ?? [],
    avoids: (row.avoids as string[]) ?? [],
    specialOccasionsNotes: (row.special_occasions_notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// --- Actions ---

export async function getTasteProfile(
  clientId: string
): Promise<ClientTasteProfile | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_taste_profiles')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) {
    console.error('[taste-profile] fetch failed', error)
    throw new Error('Failed to load taste profile')
  }

  if (!data) return null
  return rowToProfile(data)
}

export async function upsertTasteProfile(
  clientId: string,
  input: TasteProfileInput
): Promise<ClientTasteProfile> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = TasteProfileSchema.parse(input)

  const row = {
    client_id: clientId,
    tenant_id: user.tenantId!,
    favorite_cuisines: parsed.favoriteCuisines,
    disliked_ingredients: parsed.dislikedIngredients,
    spice_tolerance: parsed.spiceTolerance,
    texture_preferences: parsed.texturePreferences,
    flavor_notes: parsed.flavorNotes || null,
    preferred_proteins: parsed.preferredProteins,
    avoids: parsed.avoids,
    special_occasions_notes: parsed.specialOccasionsNotes || null,
  }

  const { data, error } = await supabase
    .from('client_taste_profiles')
    .upsert(row, { onConflict: 'client_id,tenant_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[taste-profile] upsert failed', error)
    throw new Error('Failed to save taste profile')
  }

  revalidatePath(`/clients/${clientId}`)

  return rowToProfile(data)
}
