// AI Directory Search NL Parser
// Takes a natural language chef search query and extracts structured filters.
// e.g. "Italian chef for a wedding near Boston under $200/person"
//   -> { cuisine: "italian", serviceType: "wedding", location: "Boston, MA", priceRange: "premium" }

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const SearchFiltersSchema = z.object({
  query: z.string().optional().default(''),
  cuisine: z.string().optional().default(''),
  serviceType: z.string().optional().default(''),
  location: z.string().optional().default(''),
  priceRange: z.string().optional().default(''),
  dietary: z.string().optional().default(''),
})

export type ParsedSearchFilters = z.infer<typeof SearchFiltersSchema>

export async function parseDirectorySearch(text: string): Promise<ParsedSearchFilters> {
  const result = await parseWithOllama(
    `You extract structured search filters from a natural language chef search query. Return JSON with:
- query: remaining text not captured by filters (chef name, specific keywords), empty if fully captured
- cuisine: one of: italian, french, mediterranean, japanese, mexican, american, asian_fusion, indian, thai, chinese, korean, latin, cajun_creole, middle_eastern, african, caribbean, farm_to_table, seafood, bbq_grill, vegan_plant_based, desserts_pastry, other (pick closest, empty if not mentioned)
- serviceType: one of: private_dinner, meal_prep, catering, wedding, cooking_class, corporate_events, yacht_charter, retreat_wellness, pop_up, other (pick closest, empty if not mentioned)
- location: city and/or state if mentioned, empty if not
- priceRange: one of: budget, mid, premium, luxury (empty if not mentioned, "under $100" = budget, "$100-200" = mid, "$200-400" = premium, "$400+" = luxury)
- dietary: one of: vegan, vegetarian, gluten_free, dairy_free, allergy_aware (empty if not mentioned)

Only extract what is explicitly stated. Never use em dashes.`,
    text,
    SearchFiltersSchema,
    { modelTier: 'fast', maxTokens: 150, timeoutMs: 6000 }
  )

  return result
}
