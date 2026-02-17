// @ts-nocheck
// TODO: References menu_sections/menu_items tables that don't exist in current schema.
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ─── Types ──────────────────────────────────────────────────────────────────

export type CourseType =
  | 'AMUSE' | 'APP' | 'SOUP' | 'SALAD' | 'FISH'
  | 'INTERMEZZO' | 'MAIN' | 'CHEESE' | 'DESSERT' | 'PETIT_FOUR'

export const COURSE_COLORS: Record<CourseType, string> = {
  AMUSE: '#8b5cf6',
  APP: '#3b82f6',
  SOUP: '#ef4444',
  SALAD: '#22c55e',
  FISH: '#06b6d4',
  INTERMEZZO: '#a855f7',
  MAIN: '#f59e0b',
  CHEESE: '#eab308',
  DESSERT: '#ec4899',
  PETIT_FOUR: '#f97316',
}

export const COURSE_ORDER: CourseType[] = [
  'AMUSE', 'APP', 'SOUP', 'SALAD', 'FISH',
  'INTERMEZZO', 'MAIN', 'CHEESE', 'DESSERT', 'PETIT_FOUR',
]

export interface FireOrderCourse {
  id: string
  courseType: CourseType
  name: string
  components: {
    id: string
    name: string
    station: string
    leadTimeMinutes: number
  }[]
  fireTimeMinutes: number // minutes from service start
  fired: boolean
}

export interface FireOrderResult {
  eventId: string
  eventTitle: string
  courses: FireOrderCourse[]
  totalCourses: number
  totalComponents: number
  estimatedServiceMinutes: number
}

// ─── Station Types ──────────────────────────────────────────────────────────

export type StationType =
  | 'SAUCIER' | 'POISSONNIER' | 'ROTISSEUR' | 'GRILLARDIN'
  | 'FRITURIER' | 'ENTREMETIER' | 'TOURNANT' | 'PATISSIER'
  | 'GARDE_MANGER' | 'BOUCHER'

export const STATION_LABELS: Record<StationType, string> = {
  SAUCIER: 'Saucier (Sauces)',
  POISSONNIER: 'Poissonnier (Fish)',
  ROTISSEUR: 'Rotisseur (Roast)',
  GRILLARDIN: 'Grillardin (Grill)',
  FRITURIER: 'Friturier (Fry)',
  ENTREMETIER: 'Entremetier (Veg/Starch)',
  TOURNANT: 'Tournant (Swing)',
  PATISSIER: 'Patissier (Pastry)',
  GARDE_MANGER: 'Garde Manger (Cold)',
  BOUCHER: 'Boucher (Butchery)',
}

// ─── Get Fire Order for Event ───────────────────────────────────────────────

export async function getFireOrder(eventId: string): Promise<FireOrderResult> {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Fetch event with menu
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, event_date, menu_id')
    .eq('id', eventId)
    .eq('chef_id', chef.id)
    .single()

  if (eventErr || !event) throw new Error('Event not found')

  // Fetch menu sections and items
  const { data: sections } = await supabase
    .from('menu_sections')
    .select('id, name, position, menu_items(id, name, position)')
    .eq('menu_id', event.menu_id)
    .order('position')

  if (!sections || sections.length === 0) {
    return {
      eventId: event.id,
      eventTitle: event.title || `Event ${event.event_date}`,
      courses: [],
      totalCourses: 0,
      totalComponents: 0,
      estimatedServiceMinutes: 0,
    }
  }

  // Map sections to courses with fire timing
  let fireTime = 0
  const COURSE_GAP = 15 // minutes between courses

  const courses: FireOrderCourse[] = sections.map((section, idx) => {
    const courseType = inferCourseType(section.name, idx)
    const items = (section.menu_items || []) as { id: string; name: string; position: number }[]

    const course: FireOrderCourse = {
      id: section.id,
      courseType,
      name: section.name,
      components: items.map(item => ({
        id: item.id,
        name: item.name,
        station: inferStation(item.name, courseType),
        leadTimeMinutes: inferLeadTime(courseType),
      })),
      fireTimeMinutes: fireTime,
      fired: false,
    }

    fireTime += COURSE_GAP
    return course
  })

  const totalComponents = courses.reduce((s, c) => s + c.components.length, 0)

  return {
    eventId: event.id,
    eventTitle: event.title || `Event ${event.event_date}`,
    courses,
    totalCourses: courses.length,
    totalComponents,
    estimatedServiceMinutes: fireTime,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferCourseType(sectionName: string, index: number): CourseType {
  const name = sectionName.toLowerCase()
  if (name.includes('amuse')) return 'AMUSE'
  if (name.includes('appetizer') || name.includes('starter') || name.includes('app')) return 'APP'
  if (name.includes('soup')) return 'SOUP'
  if (name.includes('salad')) return 'SALAD'
  if (name.includes('fish') || name.includes('seafood')) return 'FISH'
  if (name.includes('intermezzo') || name.includes('sorbet')) return 'INTERMEZZO'
  if (name.includes('main') || name.includes('entree') || name.includes('entrée')) return 'MAIN'
  if (name.includes('cheese') || name.includes('fromage')) return 'CHEESE'
  if (name.includes('dessert') || name.includes('sweet')) return 'DESSERT'
  if (name.includes('petit') || name.includes('mignardise')) return 'PETIT_FOUR'
  // Default based on position
  return COURSE_ORDER[Math.min(index, COURSE_ORDER.length - 1)]
}

function inferStation(itemName: string, courseType: CourseType): string {
  const name = itemName.toLowerCase()
  if (courseType === 'DESSERT' || courseType === 'PETIT_FOUR') return 'PATISSIER'
  if (courseType === 'SALAD' || courseType === 'AMUSE') return 'GARDE_MANGER'
  if (courseType === 'FISH') return 'POISSONNIER'
  if (courseType === 'SOUP') return 'ENTREMETIER'
  if (name.includes('grill')) return 'GRILLARDIN'
  if (name.includes('roast') || name.includes('braised')) return 'ROTISSEUR'
  if (name.includes('sauce') || name.includes('jus')) return 'SAUCIER'
  if (name.includes('fried') || name.includes('frit')) return 'FRITURIER'
  return 'TOURNANT'
}

function inferLeadTime(courseType: CourseType): number {
  switch (courseType) {
    case 'AMUSE': return 5
    case 'APP': return 10
    case 'SOUP': return 15
    case 'SALAD': return 5
    case 'FISH': return 12
    case 'INTERMEZZO': return 5
    case 'MAIN': return 20
    case 'CHEESE': return 5
    case 'DESSERT': return 15
    case 'PETIT_FOUR': return 10
    default: return 10
  }
}
