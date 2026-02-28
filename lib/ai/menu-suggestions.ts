'use server'

// Menu Suggestions Generator
// PRIVACY: Sends dietary restrictions, allergies, client event data — must stay local.
// Output is DRAFT ONLY — suggestions for the chef's consideration.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export interface MenuSuggestion {
  name: string
  courses: { course: string; dish: string; description: string }[]
  rationale: string
}

const CourseSchema = z.object({
  course: z.string(),
  dish: z.string(),
  description: z.string(),
})

const MenuSuggestionSchema = z.object({
  name: z.string(),
  courses: z.array(CourseSchema).min(2),
  rationale: z.string(),
})

const MenuSuggestionsSchema = z.array(MenuSuggestionSchema).min(3).max(3)

const SYSTEM_PROMPT = `You are assisting a private chef by suggesting menu structures for an upcoming event.

IMPORTANT: You are NOT creating recipes. You are suggesting menu structures using dishes the chef already knows or has in their recipe book. You are organizing courses and suggesting pairings — the chef decides how to execute.

RULES:
- Suggest exactly 3 distinct menu options with different themes/approaches
- Each menu should have 3-5 courses (appetizer, salad, main, dessert, etc.)
- If the chef's recipe list is provided, prioritize dishes from it
- All dishes must respect the dietary restrictions and allergies — no exceptions
- Allergies are SAFETY-CRITICAL: never suggest a dish that could contain a listed allergen
- Rationale should explain why this menu fits THIS specific event (occasion, guest count, season)
- Keep dish descriptions to 1 sentence — the chef knows how to cook, they don't need instructions

EXAMPLE OUTPUT:
[
  {
    "name": "Rustic Italian",
    "courses": [
      { "course": "Appetizer", "dish": "Burrata with roasted tomatoes", "description": "Creamy burrata over slow-roasted heirloom tomatoes with basil oil." },
      { "course": "Main", "dish": "Braised short ribs", "description": "Red wine braised short ribs with creamy polenta and gremolata." },
      { "course": "Dessert", "dish": "Panna cotta", "description": "Vanilla bean panna cotta with seasonal berry compote." }
    ],
    "rationale": "A comforting Italian menu that works well for an intimate fall dinner of 6 guests — hearty, shareable, and low-stress to plate."
  }
]

Return ONLY a valid JSON array of exactly 3 menu options.`

export async function getAIMenuSuggestions(eventId: string): Promise<MenuSuggestion[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('occasion, guest_count, dietary_restrictions, allergies, special_requests')
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) throw new Error('Event not found')

  // Fetch chef's recipes for context
  const { data: recipes } = await supabase
    .from('recipes')
    .select('name, category, dietary_tags')
    .eq('tenant_id', user.entityId)
    .limit(30)

  const userContent = `Suggest 3 menu options for this event:

Event: ${event.occasion || 'Private Dinner'}
Guests: ${event.guest_count || 'TBD'}
Dietary restrictions: ${(event.dietary_restrictions as string[] | null)?.join(', ') || 'None specified'}
Allergies: ${(event.allergies as string[] | null)?.join(', ') || 'None'}
Special requests: ${event.special_requests || 'None'}

Chef's recipe book (use these when possible): ${recipes?.map((r: any) => r.name).join(', ') || 'No recipes on file yet'}`

  try {
    const suggestions = await parseWithOllama(SYSTEM_PROMPT, userContent, MenuSuggestionsSchema, {
      modelTier: 'standard',
      maxTokens: 1024,
    })
    return suggestions
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[menu-suggestions] Error:', err)
    throw new Error('Could not generate menu suggestions. Please try again.')
  }
}
