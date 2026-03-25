'use server'

// AI Staff Briefing Generator
// PRIVACY: Sends guest names, allergens, client vibe notes, staff names - must stay local.
// Output is DRAFT ONLY - chef edits and approves before sharing with staff.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import { generateStaffBriefingTemplate } from '@/lib/templates/staff-briefing'

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
  _aiSource?: string
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

interface MenuComponentRow {
  name: string
  course_type: string | null
  description: string | null
  allergen_tags: string[] | null
}

interface StaffAssignmentRow {
  role_override: string | null
  staff_members: { name: string; role: string } | null
}

export async function generateAIStaffBriefing(eventId: string): Promise<AIStaffBriefing> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [eventResult, menuResult, guestsResult, staffResult, chefResult] = await Promise.all([
    db
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, arrival_time, location_address, service_style, dietary_restrictions, allergies, special_requests, kitchen_notes'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (db as any)
      .from('event_menu_components')
      .select('name, course_type, description, allergen_tags')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    db
      .from('event_guests')
      .select('full_name, dietary_restrictions, allergies')
      .eq('event_id', eventId),
    db
      .from('event_staff_assignments')
      .select('role_override, staff_members(name, role)')
      .eq('event_id', eventId),
    db.from('chefs').select('display_name, business_name').eq('id', user.tenantId!).single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = (menuResult.data ?? []) as MenuComponentRow[]
  const guests = guestsResult.data ?? []
  const staff = (staffResult.data ?? []) as StaffAssignmentRow[]
  const chef = chefResult.data

  const staffList = staff
    .map(
      (s) =>
        `${s.staff_members?.name ?? 'Staff'} (${s.role_override ?? s.staff_members?.role ?? 'general'})`
    )
    .join(', ')
  const allergenSummary = [
    ...(event.dietary_restrictions ?? []),
    ...(event.allergies ?? []),
    ...guests.flatMap((g: any) => [...(g.dietary_restrictions ?? []), ...(g.allergies ?? [])]),
  ].filter(Boolean)

  const systemPrompt = `You are a private chef drafting a professional staff briefing document for an upcoming event.
Write it as if you are the chef, speaking directly to your team.
Tone: warm, professional, precise. Use "we" when referring to the team.
The briefing must fit on ONE printed page - be comprehensive but concise.
Do NOT invent information not provided. Use "TBD" for missing details.
Return ONLY valid JSON.`

  const userContent = `Event Details:
  Chef: ${chef?.display_name ?? 'Chef'}
  Business: ${chef?.business_name ?? ''}
  Occasion: ${event.occasion ?? 'Private Event'}
  Date: ${event.event_date ?? 'TBD'}
  Guests: ${event.guest_count ?? 'TBD'}, Service style: ${event.service_style ?? 'plated'}
  Location: ${event.location_address ?? 'TBD'}
  Chef arrival: ${event.arrival_time ?? 'TBD'}, Service start: ${event.serve_time ?? 'TBD'}
  Staff present: ${staffList || 'Chef only'}
  Special requests: ${event.special_requests ?? 'None'}
  Kitchen notes: ${event.kitchen_notes ?? 'None'}

Menu:
${menu.map((m) => `  [${m.course_type ?? 'Course'}] ${m.name}${m.description ? ': ' + m.description : ''}${m.allergen_tags ? ' ! ' + m.allergen_tags.join(', ') : ''}`).join('\n') || '  Menu not yet assigned'}

Allergen Alerts (CRITICAL):
${allergenSummary.length > 0 ? allergenSummary.map((a: any) => '  ! ' + a).join('\n') : '  None noted - verify with client'}

Guest List (${guests.length} RSVPd):
${guests.map((g: any) => `  ${g.full_name}${(g.dietary_restrictions ?? []).length ? ': ' + (g.dietary_restrictions ?? []).join(', ') : ''}${(g.allergies ?? []).length ? ' | allergies: ' + (g.allergies ?? []).join(', ') : ''}`).join('\n') || '  No individual guest list yet'}

Return JSON: {
  "subject": "Staff Briefing - [occasion + date]",
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

  const { result, source } = await withAiFallback(
    // Template: structured briefing with variable substitution - deterministic
    () =>
      generateStaffBriefingTemplate({
        chefName: chef?.display_name ?? 'Chef',
        businessName: chef?.business_name ?? undefined,
        occasion: event.occasion ?? 'Private Event',
        eventDate: event.event_date ?? 'TBD',
        serveTime: event.serve_time ?? undefined,
        arrivalTime: event.arrival_time ?? undefined,
        guestCount: event.guest_count ?? 0,
        locationAddress: event.location_address ?? undefined,
        serviceStyle: event.service_style ?? undefined,
        dietaryRestrictions: event.dietary_restrictions ?? undefined,
        allergies: event.allergies ?? undefined,
        specialRequests: event.special_requests ?? undefined,
        notes: event.kitchen_notes ?? undefined,
        menuItems: menu.map((m) => ({
          name: m.name,
          courseType: m.course_type ?? undefined,
          description: m.description ?? undefined,
          allergenTags: m.allergen_tags ? m.allergen_tags : undefined,
        })),
        guests: guests.map((g: any) => ({
          name: g.full_name ?? 'Guest',
          dietaryRestrictions: g.dietary_restrictions ?? undefined,
          allergies: g.allergies ?? undefined,
        })),
        staff: staff.map((s) => ({
          name: s.staff_members?.name ?? 'Staff',
          role: s.role_override ?? s.staff_members?.role ?? 'general',
        })),
      }),
    // AI: enhanced briefing with personalized tone (when Ollama is online)
    async () => {
      const aiResult = await parseWithOllama(systemPrompt, userContent, StaffBriefingSchema)
      return { ...aiResult, generatedAt: new Date().toISOString() }
    }
  )

  return { ...result, _aiSource: source }
}
