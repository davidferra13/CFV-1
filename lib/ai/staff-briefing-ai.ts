// @ts-nocheck
'use server'

// AI Staff Briefing Generator
// PRIVACY: Sends guest names, allergens, client vibe notes, staff names — must stay local.
// Output is DRAFT ONLY — chef edits and approves before sharing with staff.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export interface AIStaffBriefing {
  subject: string // document title
  openingParagraph: string // context setter for staff
  serviceProtocol: string // how service should flow
  menuNarrative: string // chef's intent for each course
  clientVibeNotes: string // how to read and serve this client
  allergenAlerts: string // safety-critical dietary section
  keyTimings: string // critical moments
  dresscodeAndPresentation: string
  cleanupProtocol: string
  closingNote: string // motivational / expectation setter
  fullDocument: string // assembled single-page briefing
  generatedAt: string
}

const StaffBriefingSchema = z.object({
  subject: z.string(),
  openingParagraph: z.string(),
  serviceProtocol: z.string(),
  menuNarrative: z.string(),
  clientVibeNotes: z.string(),
  allergenAlerts: z.string(),
  keyTimings: z.string(),
  dresscodeAndPresentation: z.string(),
  cleanupProtocol: z.string(),
  closingNote: z.string(),
  fullDocument: z.string(),
})

export async function generateAIStaffBriefing(eventId: string): Promise<AIStaffBriefing> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, menuResult, guestsResult, staffResult, chefResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, arrival_time, location_address, service_style, dietary_restrictions, allergies, special_requests, notes'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('event_menu_components')
      .select('name, course_type, description, allergen_tags')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    supabase
      .from('event_guests')
      .select('name, dietary_restrictions, allergies')
      .eq('event_id', eventId),
    supabase
      .from('event_staff')
      .select('role, staff_members(full_name, role)')
      .eq('event_id', eventId),
    supabase.from('chefs').select('full_name, business_name').eq('id', user.tenantId!).single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = menuResult.data ?? []
  const guests = guestsResult.data ?? []
  const staff = staffResult.data ?? []
  const chef = chefResult.data

  const staffList = staff
    .map(
      (s: any) =>
        `${s.staff_members?.full_name ?? 'Staff'} (${s.role ?? s.staff_members?.role ?? 'general'})`
    )
    .join(', ')
  const allergenSummary = [
    ...((event.dietary_restrictions as string[]) ?? []),
    ...((event.allergies as string[]) ?? []),
    ...guests.flatMap((g) => [
      ...((g.dietary_restrictions as string[]) ?? []),
      ...((g.allergies as string[]) ?? []),
    ]),
  ].filter(Boolean)

  const systemPrompt = `You are a private chef drafting a professional staff briefing document for an upcoming event.
Write it as if you are the chef, speaking directly to your team.
Tone: warm, professional, precise. Use "we" when referring to the team.
The briefing must fit on ONE printed page — be comprehensive but concise.
Do NOT invent information not provided. Use "TBD" for missing details.
Return ONLY valid JSON.`

  const userContent = `Event Details:
  Chef: ${chef?.full_name ?? 'Chef'}
  Business: ${chef?.business_name ?? ''}
  Occasion: ${event.occasion ?? 'Private Event'}
  Date: ${event.event_date ?? 'TBD'}
  Guests: ${event.guest_count ?? 'TBD'}, Service style: ${event.service_style ?? 'plated'}
  Location: ${event.location_address ?? 'TBD'}
  Chef arrival: ${event.arrival_time ?? 'TBD'}, Service start: ${event.serve_time ?? 'TBD'}
  Staff present: ${staffList || 'Chef only'}
  Special requests: ${event.special_requests ?? 'None'}
  Internal notes: ${event.notes ?? 'None'}

Menu:
${menu.map((m) => `  [${m.course_type ?? 'Course'}] ${m.name}${m.description ? ': ' + m.description : ''}${m.allergen_tags ? ' ! ' + (m.allergen_tags as string[]).join(', ') : ''}`).join('\n') || '  Menu not yet assigned'}

Allergen Alerts (CRITICAL):
${allergenSummary.length > 0 ? allergenSummary.map((a) => '  ! ' + a).join('\n') : '  None noted — verify with client'}

Guest List (${guests.length} RSVPd):
${guests.map((g) => `  ${g.name}${((g.dietary_restrictions as string[]) ?? []).length ? ': ' + (g.dietary_restrictions as string[]).join(', ') : ''}${((g.allergies as string[]) ?? []).length ? ' | allergies: ' + (g.allergies as string[]).join(', ') : ''}`).join('\n') || '  No individual guest list yet'}

Return JSON: {
  "subject": "Staff Briefing — [occasion + date]",
  "openingParagraph": "...",
  "serviceProtocol": "...",
  "menuNarrative": "...",
  "clientVibeNotes": "...",
  "allergenAlerts": "...",
  "keyTimings": "...",
  "dresscodeAndPresentation": "...",
  "cleanupProtocol": "...",
  "closingNote": "...",
  "fullDocument": "complete assembled single-page briefing as plain text"
}`

  try {
    const result = await parseWithOllama(systemPrompt, userContent, StaffBriefingSchema)
    return { ...result, generatedAt: new Date().toISOString() }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[staff-briefing-ai] Failed:', err)
    throw new Error('Could not generate staff briefing. Please try again.')
  }
}
