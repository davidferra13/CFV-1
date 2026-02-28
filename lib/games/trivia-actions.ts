'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

const TriviaQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  funFact: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  confidence: z.number().int().min(1).max(5),
})

const TriviaSchema = z.object({
  questions: z.array(TriviaQuestionSchema).min(1),
})

export type TriviaQuestion = z.infer<typeof TriviaSchema>['questions'][number]

export async function generateTriviaQuestions(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  previousIds: string[] = []
): Promise<{ questions: TriviaQuestion[]; error?: string }> {
  try {
    const avoidClause =
      previousIds.length > 0
        ? `\nIMPORTANT: The player has already seen questions with these IDs — do NOT reuse them or ask similar questions: ${previousIds.slice(-30).join(', ')}`
        : ''

    const result = await parseWithOllama(
      `You are Remy, ChefFlow's culinary AI. You LOVE teaching chefs new things through fun trivia.
Generate exactly 5 multiple-choice culinary trivia questions. Each must have exactly 4 choices with one correct answer.
Make questions genuinely educational — the chef should learn something new from each one.
Vary question types: history, technique, science, ingredients, culture, famous chefs, food safety.

Rules:
- Each question gets a unique short ID like "q_sauces_01" (topic + number)
- correctIndex is 0-based (0, 1, 2, or 3)
- funFact should be a short, interesting tidbit the chef can remember
- Difficulty level: ${difficulty}

SOURCE & CITATION RULES (CRITICAL):
- Every question MUST include "source" and "sourceUrl" fields.
- "source" is a readable label — the name of the reference (e.g., "On Food and Cooking — Harold McGee", "The Professional Chef — CIA", "Wikipedia: Mother sauce")
- "sourceUrl" is a real URL on a well-known, trustworthy website where the chef can verify the answer. Use:
  * Wikipedia (en.wikipedia.org/wiki/...) for history, famous chefs, cuisine origins, food science
  * Serious Eats (seriouseats.com/...) for techniques, recipes, food science articles
  * FDA/USDA (fda.gov, usda.gov) for food safety
  * King Arthur Baking (kingarthurbaking.com) for baking/pastry
  * Wine Folly (winefolly.com) for wine pairing
- When in doubt, use a Wikipedia article. Wikipedia is always acceptable.
- The URL MUST be a real page. Construct it from the topic: e.g., en.wikipedia.org/wiki/Mirepoix_(cooking)

CONFIDENCE RULES (CRITICAL):
- Every question MUST include a "confidence" field: an integer from 1 to 5.
- 5 = absolute certainty (well-known culinary fact, easily verifiable)
- 4 = very confident (widely accepted, standard culinary knowledge)
- 3 = fairly confident (commonly taught but has nuance)
- 2 = uncertain (could be debated or varies by tradition)
- 1 = speculative (may not be factually correct)
- ONLY generate questions you rate 4 or 5. If you cannot be confident, pick a different question.
- Do NOT generate questions rated 1-3. Replace them with questions you are confident about.

- ALWAYS return valid JSON matching the schema exactly${avoidClause}`,
      `Generate 5 ${difficulty} culinary trivia questions about: ${topic}

Return JSON: { "questions": [{ "id": "unique_id", "question": "...", "choices": ["A", "B", "C", "D"], "correctIndex": 0, "funFact": "...", "source": "Reference Name", "sourceUrl": "https://...", "confidence": 5 }, ...] }`,
      TriviaSchema,
      { modelTier: 'standard', maxTokens: 2048, timeoutMs: 120000 }
    )

    // Filter out any low-confidence questions (keep only 4+)
    const highConfidence = result.questions.filter((q) => q.confidence >= 4)
    if (highConfidence.length === 0) {
      return {
        questions: [],
        error: 'Could not generate high-confidence questions. Try a different topic.',
      }
    }

    return { questions: highConfidence }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      return { questions: [], error: 'ollama-offline' }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[trivia] Generation failed:', message)
    return { questions: [], error: message }
  }
}

/**
 * Fetch the chef's internal business data and generate trivia questions from it.
 * Sources link back to ChefFlow pages so the chef can verify every answer.
 */
export async function generateInternalTriviaQuestions(
  focus: 'upcoming' | 'clients' | 'all',
  difficulty: 'easy' | 'medium' | 'hard',
  previousIds: string[] = []
): Promise<{ questions: TriviaQuestion[]; error?: string }> {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    // Fetch events with client info
    const { data: events } = await supabase
      .from('events')
      .select(
        `
        id, event_date, serve_time, guest_count, occasion, service_style,
        dietary_restrictions, allergies, special_requests, status,
        location_city, location_state, quoted_price_cents,
        client:clients(id, full_name, preferred_name, dietary_restrictions, allergies,
          favorite_cuisines, favorite_dishes, spice_tolerance, birthday, anniversary)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .order('event_date', { ascending: true })

    // Fetch clients
    const { data: clients } = await supabase
      .from('clients')
      .select(
        `
        id, full_name, preferred_name, dietary_restrictions, allergies,
        favorite_cuisines, favorite_dishes, spice_tolerance, birthday, anniversary,
        total_events_completed, typical_guest_count, referral_source,
        dislikes, dietary_protocols, wine_beverage_preferences
      `
      )
      .eq('tenant_id', user.tenantId!)

    // Fetch menus with dishes
    const { data: menus } = await supabase
      .from('menus')
      .select(
        `
        id, name, cuisine_type, service_style, target_guest_count,
        event_id, status,
        dishes(id, name, course_name, course_number, dietary_tags, allergen_flags)
      `
      )
      .eq('tenant_id', user.tenantId!)

    // Build a data summary for Ollama
    const now = new Date().toISOString().split('T')[0]
    const upcomingEvents = (events || []).filter(
      (e: any) => e.event_date >= now && e.status !== 'cancelled'
    )
    const pastEvents = (events || []).filter(
      (e: any) => e.event_date < now && e.status !== 'cancelled'
    )

    let dataContext = ''

    if (focus === 'upcoming' || focus === 'all') {
      dataContext += `\n\nUPCOMING EVENTS (${upcomingEvents.length}):\n`
      for (const ev of upcomingEvents.slice(0, 15)) {
        const client = ev.client as {
          id: string
          full_name: string
          preferred_name?: string
          dietary_restrictions?: string[]
          allergies?: string[]
          favorite_cuisines?: string[]
          spice_tolerance?: string
        } | null
        dataContext += `- Event ${ev.id.slice(0, 8)}: ${client?.full_name || 'Unknown'} on ${ev.event_date}`
        dataContext += ` | ${ev.guest_count} guests | ${ev.occasion || 'no occasion'} | ${ev.service_style || 'TBD'}`
        dataContext += ` | Location: ${ev.location_city || '?'}, ${ev.location_state || '?'}`
        if (ev.dietary_restrictions?.length)
          dataContext += ` | Dietary: ${ev.dietary_restrictions.join(', ')}`
        if (ev.allergies?.length) dataContext += ` | Allergies: ${ev.allergies.join(', ')}`
        if (ev.special_requests) dataContext += ` | Notes: ${ev.special_requests.slice(0, 100)}`
        dataContext += '\n'
      }
    }

    if (focus === 'clients' || focus === 'all') {
      dataContext += `\n\nCLIENTS (${(clients || []).length}):\n`
      for (const c of (clients || []).slice(0, 20)) {
        dataContext += `- ${c.full_name} (ID: ${c.id.slice(0, 8)})`
        if (c.dietary_restrictions?.length)
          dataContext += ` | Dietary: ${(c.dietary_restrictions as string[]).join(', ')}`
        if (c.allergies?.length)
          dataContext += ` | Allergies: ${(c.allergies as string[]).join(', ')}`
        if (c.favorite_cuisines?.length)
          dataContext += ` | Fav cuisines: ${(c.favorite_cuisines as string[]).join(', ')}`
        if (c.favorite_dishes?.length)
          dataContext += ` | Fav dishes: ${(c.favorite_dishes as string[]).join(', ')}`
        if (c.spice_tolerance) dataContext += ` | Spice: ${c.spice_tolerance}`
        if (c.dislikes?.length) dataContext += ` | Dislikes: ${(c.dislikes as string[]).join(', ')}`
        if (c.dietary_protocols?.length)
          dataContext += ` | Protocols: ${(c.dietary_protocols as string[]).join(', ')}`
        if (c.total_events_completed) dataContext += ` | Events done: ${c.total_events_completed}`
        if (c.birthday) dataContext += ` | Birthday: ${c.birthday}`
        dataContext += '\n'
      }
    }

    if (focus === 'all') {
      dataContext += `\n\nMENUS (${(menus || []).length}):\n`
      for (const m of (menus || []).slice(0, 10)) {
        const dishes = m.dishes as
          | {
              id: string
              name: string
              course_name: string
              course_number: number
              dietary_tags?: string[]
              allergen_flags?: string[]
            }[]
          | null
        dataContext += `- ${m.name} (${m.cuisine_type || 'no cuisine'}) | ${m.service_style || 'TBD'} | ${m.target_guest_count || '?'} guests`
        if (dishes?.length) {
          dataContext += ` | Courses: ${dishes.map((d) => `${d.course_name}: ${d.name}`).join(', ')}`
        }
        dataContext += '\n'
      }
    }

    if (!dataContext.trim() || ((events || []).length === 0 && (clients || []).length === 0)) {
      return {
        questions: [],
        error:
          'Not enough business data yet to generate trivia. Add some events and clients first!',
      }
    }

    const avoidClause =
      previousIds.length > 0
        ? `\nIMPORTANT: Do NOT reuse or ask similar questions to these IDs: ${previousIds.slice(-30).join(', ')}`
        : ''

    const result = await parseWithOllama(
      `You are Remy, ChefFlow's culinary AI. You are generating a STUDY QUIZ for a private chef based on THEIR OWN business data.
The chef wants to practice remembering details about their upcoming events, clients, and menus.

HERE IS THE CHEF'S ACTUAL DATA:
${dataContext}

Generate exactly 5 multiple-choice quiz questions based ONLY on the data above. The questions should help the chef remember important details about their business.

Rules:
- Each question gets a unique short ID like "q_internal_01"
- correctIndex is 0-based (0, 1, 2, or 3)
- funFact should be a helpful reminder or tip related to the question
- Difficulty level: ${difficulty}
- Easy = straightforward recall (dates, names, counts)
- Medium = connecting details (which client has which restriction, what event is when)
- Hard = tricky details (specific allergies for specific events, cross-referencing data)

SOURCE RULES (CRITICAL — EVERY ANSWER MUST HAVE A SOURCE):
- "source" must name the specific ChefFlow record: e.g., "ChefFlow — Client: Jane Smith", "ChefFlow — Event: Smith Dinner (Jan 15)", "ChefFlow — Menu: Winter Tasting"
- "sourceUrl" must be a ChefFlow app link where the chef can verify the answer:
  * For client questions: "/clients/[client-id]" (use the actual client ID from the data)
  * For event questions: "/events/[event-id]" (use the actual event ID from the data)
  * For menu questions: "/events/[event-id]" (since menus are viewed on the event page)
- NEVER make up data that isn't in the provided data above.

CONFIDENCE RULES:
- "confidence" is 1-5. Since you are reading real data, all answers should be 5 (directly from the database).
- If data is ambiguous or missing, set confidence to 3 and note it in funFact.
- Only generate questions where the answer is clearly present in the data.

- ALWAYS return valid JSON matching the schema exactly${avoidClause}`,
      `Generate 5 ${difficulty} quiz questions from the chef's business data above.

Return JSON: { "questions": [{ "id": "unique_id", "question": "...", "choices": ["A", "B", "C", "D"], "correctIndex": 0, "funFact": "...", "source": "ChefFlow — ...", "sourceUrl": "/clients/...", "confidence": 5 }, ...] }`,
      TriviaSchema,
      { modelTier: 'standard', maxTokens: 2048, timeoutMs: 120000 }
    )

    // Filter to high confidence only
    const highConfidence = result.questions.filter((q) => q.confidence >= 4)
    if (highConfidence.length === 0) {
      return {
        questions: [],
        error:
          'Could not generate confident questions from your data. Try adding more events or client details.',
      }
    }

    return { questions: highConfidence }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      return { questions: [], error: 'ollama-offline' }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[trivia-internal] Generation failed:', message)
    return { questions: [], error: message }
  }
}
