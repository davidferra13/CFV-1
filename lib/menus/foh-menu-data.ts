// Front-of-House Menu - Presentation Data Layer
// Normalizes raw ChefFlow menu/event data into a clean presentation format
// consumed by the FrontOfHouseMenu React component.

export type FOHCourse = {
  /** Display label like "First Course", "Dessert", etc. */
  label: string
  /** Course position (1-based) */
  number: number
  /** Dish name if different from course label */
  dishName: string | null
  /** Ingredient list or short description */
  description: string | null
  /** e.g. ["vegan", "gluten-free"] */
  dietaryTags: string[]
  /** e.g. ["tree nuts", "shellfish"] */
  allergenFlags: string[]
  /** Wine or beverage pairing text */
  beveragePairing: string | null
}

export type FOHMenuData = {
  /** Menu or event title (occasion, menu name, etc.) */
  title: string
  /** Optional subtitle (e.g. "to Kaleigh & Marc") */
  subtitle: string | null
  /** Chef or business name attribution */
  chefName: string | null
  /** Tagline from chef profile */
  tagline: string | null
  /** Event date formatted for display, or null */
  date: string | null
  /** Structured course list */
  courses: FOHCourse[]
  /** Optional footer note */
  footerNote: string | null
  /** Service style label (e.g. "Tasting Menu", "Family Style") */
  serviceStyle: string | null
  /** Guest count if available */
  guestCount: number | null
  /** Client name if event-linked */
  clientName: string | null
}

const SERVICE_LABELS: Record<string, string> = {
  plated: 'Plated Dinner',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail Reception',
  tasting_menu: 'Tasting Menu',
  other: '',
}

/**
 * Maps raw menu data (from getMenuById) + optional event/chef data into
 * the normalized FOHMenuData for rendering.
 */
export function mapToFOHMenuData(opts: {
  menu: {
    name: string
    description: string | null
    service_style: string | null
    cuisine_type: string | null
    target_guest_count: number | null
    notes: string | null
    simple_mode?: boolean
    simple_mode_content?: string | null
    dishes: Array<{
      course_name: string
      course_number: number
      name?: string | null
      description: string | null
      dietary_tags: string[]
      allergen_flags: string[]
      beverage_pairing?: string | null
      components?: Array<{ name: string; description: string | null }>
    }>
  }
  event?: {
    occasion: string | null
    event_date: string | Date | null
    guest_count: number | null
    client_name: string | null
  } | null
  chefName?: string | null
  tagline?: string | null
}): FOHMenuData {
  const { menu, event, chefName, tagline } = opts

  // Title priority: event occasion > menu name
  const title = event?.occasion?.trim() || menu.name

  // Subtitle: if event occasion was used as title, menu name becomes subtitle (if different)
  let subtitle: string | null = null
  if (event?.occasion?.trim() && menu.name !== event.occasion.trim()) {
    subtitle = menu.name
  }

  // Date formatting
  let date: string | null = null
  if (event?.event_date) {
    try {
      const d = typeof event.event_date === 'string' ? new Date(event.event_date) : event.event_date
      date = d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      date = null
    }
  }

  // Service style label
  const serviceStyle = menu.service_style
    ? (SERVICE_LABELS[menu.service_style] ?? menu.service_style)
    : null

  // Map courses
  const courses: FOHCourse[] = menu.dishes.map((dish) => ({
    label: dish.course_name,
    number: dish.course_number,
    dishName: dish.name || null,
    description: dish.description || null,
    dietaryTags: dish.dietary_tags ?? [],
    allergenFlags: dish.allergen_flags ?? [],
    beveragePairing: (dish as any).beverage_pairing || null,
  }))

  return {
    title,
    subtitle,
    chefName: chefName || null,
    tagline: tagline || null,
    date,
    courses,
    footerNote: null,
    serviceStyle,
    guestCount: event?.guest_count ?? menu.target_guest_count ?? null,
    clientName: event?.client_name || null,
  }
}
