'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface MenuSuggestion {
  name: string
  courses: { course: string; dish: string; description: string }[]
  rationale: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function getAIMenuSuggestions(eventId: string): Promise<MenuSuggestion[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event details
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

  const prompt = `You are a creative chef assistant. Suggest 3 distinct menu options for this event:

Event: ${event.occasion || 'Private Dinner'}
Guests: ${event.guest_count}
Dietary restrictions: ${(event.dietary_restrictions as string[] | null)?.join(', ') || 'None specified'}
Allergies: ${(event.allergies as string[] | null)?.join(', ') || 'None'}
Special requests: ${event.special_requests || 'None'}

Chef's available recipes (for inspiration): ${recipes?.map((r) => r.name).join(', ') || 'Various'}

Return a JSON array with exactly 3 menu options. Each option: { "name": "Menu theme name", "courses": [{"course": "Appetizer|Main|Dessert", "dish": "Dish name", "description": "1 sentence"}], "rationale": "Why this menu fits the event" }

Return ONLY valid JSON, no markdown.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const suggestions = JSON.parse(text) as MenuSuggestion[]
    return suggestions.slice(0, 3)
  } catch (err) {
    console.error('[menu-suggestions] Error:', err)
    throw new Error('Could not generate menu suggestions. Please try again.')
  }
}
