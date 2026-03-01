'use server'

// Menu Nutritional Summary
// AI estimates per-serving nutritional breakdown for the full proposed menu.
// Routed to Gemini (nutritional knowledge, not PII).
// Output is ESTIMATE ONLY — clearly labeled as approximate, not medical advice.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const CourseNutritionSchema = z.object({
  courseName: z.string(),
  dishName: z.string(),
  servingSize: z.string(),
  calories: z.number().nullable(),
  proteinG: z.number().nullable(),
  carbsG: z.number().nullable(),
  fatG: z.number().nullable(),
  fiberG: z.number().nullable(),
  sodiumMg: z.number().nullable(),
  keyAllergens: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']),
})

const MenuNutritionalResponseSchema = z.object({
  totalCaloriesPerGuest: z.number().nullable(),
  totalProteinG: z.number().nullable(),
  totalCarbsG: z.number().nullable(),
  totalFatG: z.number().nullable(),
  courses: z.array(CourseNutritionSchema),
  highlights: z.array(z.string()).default([]),
  dietarySuitability: z.array(z.string()).default([]),
})

export interface CourseNutrition {
  courseName: string
  dishName: string
  servingSize: string // e.g. "1 portion (~6oz)"
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
  sodiumMg: number | null
  keyAllergens: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface MenuNutritionalSummary {
  totalCaloriesPerGuest: number | null
  totalProteinG: number | null
  totalCarbsG: number | null
  totalFatG: number | null
  courses: CourseNutrition[]
  highlights: string[] // e.g. "High protein meal — ~48g per guest"
  dietarySuitability: string[] // e.g. "Suitable for: gluten-free guests (courses 1-3 only)"
  disclaimer: string
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function getMenuNutritionalSummary(eventId: string): Promise<MenuNutritionalSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, menuResult] = await Promise.all([
    supabase
      .from('events')
      .select('guest_count, dietary_restrictions, allergies')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('menus')
      .select(
        `
        dishes(name, course_name, description, allergen_flags,
          dish_components(recipe:recipes(name, servings, recipe_ingredients(ingredient_name, quantity, unit)))
        )
      `
      )
      .eq('event_id', eventId)
      .limit(1)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  // Extract dishes from the menu join — menus.dishes[] with nested dish_components.recipe
  const rawDishes = (menuResult.data?.dishes ?? []) as unknown as Array<{
    name: string
    course_name: string | null
    description: string | null
    allergen_flags: string[] | null
    dish_components: Array<{
      recipe: {
        name: string
        servings: number | null
        recipe_ingredients: Array<{
          ingredient_name: string
          quantity: number | null
          unit: string | null
        }>
      } | null
    }>
  }>
  const menuItems = rawDishes.map((d) => ({
    name: d.name,
    course_type: d.course_name,
    description: d.description,
    allergen_tags: d.allergen_flags,
    recipes: d.dish_components?.[0]?.recipe ?? null,
  }))

  if (menuItems.length === 0) {
    return {
      totalCaloriesPerGuest: null,
      totalProteinG: null,
      totalCarbsG: null,
      totalFatG: null,
      courses: [],
      highlights: ['No menu items assigned yet.'],
      dietarySuitability: [],
      disclaimer:
        'All nutritional values are AI estimates and should not be used for medical dietary planning.',
      generatedAt: new Date().toISOString(),
    }
  }

  const prompt = `You are a registered dietitian nutritionist estimating nutritional content for a private chef's menu.
Provide per-serving estimates for each course.
Be conservative and realistic — use typical portion sizes for fine dining.
Clearly note confidence level based on ingredient detail available.
These are estimates for general awareness, NOT medical nutrition advice.

Menu courses:
${menuItems
  .map((m) => {
    const recipe = Array.isArray(m.recipes) ? m.recipes[0] : m.recipes
    const ingredients = recipe?.recipe_ingredients
      ? Array.isArray(recipe.recipe_ingredients)
        ? recipe.recipe_ingredients
        : []
      : []
    return `- [${m.course_type ?? 'Course'}] ${m.name}${m.description ? ': ' + m.description : ''}
  Ingredients: ${ingredients.map((i: { quantity: number | null; unit: string | null; ingredient_name: string }) => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.ingredient_name}`).join(', ') || 'Not listed'}
  Allergen tags: ${m.allergen_tags ? m.allergen_tags.join(', ') : 'None noted'}`
  })
  .join('\n\n')}

Guest dietary restrictions: ${[...(event.dietary_restrictions ?? []), ...(event.allergies ?? [])].join(', ') || 'None'}

Return JSON: {
  "totalCaloriesPerGuest": number|null,
  "totalProteinG": number|null,
  "totalCarbsG": number|null,
  "totalFatG": number|null,
  "courses": [{
    "courseName": "Appetizer|Salad|Soup|Main|Dessert|etc",
    "dishName": "...",
    "servingSize": "...",
    "calories": number|null,
    "proteinG": number|null,
    "carbsG": number|null,
    "fatG": number|null,
    "fiberG": number|null,
    "sodiumMg": number|null,
    "keyAllergens": ["..."],
    "confidence": "high|medium|low"
  }],
  "highlights": ["..."],
  "dietarySuitability": ["..."]
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const raw = JSON.parse(text)
    const validated = MenuNutritionalResponseSchema.safeParse(raw)
    if (!validated.success) {
      console.error('[menu-nutritional] Zod validation failed:', validated.error.format())
      throw new Error('Nutritional response did not match expected format. Please try again.')
    }
    return {
      ...validated.data,
      disclaimer:
        'All nutritional values are AI estimates only. They should not be used for medical dietary planning. Consult a registered dietitian for precise nutritional information.',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[menu-nutritional] Failed:', err)
    throw new Error('Could not estimate nutritional content. Please try again.')
  }
}
