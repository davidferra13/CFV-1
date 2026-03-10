// Service Style Templates - deterministic configuration data
// Pre-defined service configurations with auto-staffing ratios and equipment lists.
// No database needed; these are constants used by the service style picker and actions.

export type ServiceStyleId =
  | 'plated_dinner'
  | 'buffet'
  | 'family_style'
  | 'cocktail_reception'
  | 'stations'
  | 'drop_off'

export interface StaffRatio {
  /** 1 server per N guests (0 = no servers needed) */
  serversPerGuests: number
  /** 1 kitchen staff per N guests */
  kitchenStaffPerGuests: number
}

export interface ServiceStyleTemplate {
  id: ServiceStyleId
  name: string
  description: string
  staffRatio: StaffRatio
  suggestedEquipment: string[]
  typicalCourses: number
  serviceNotes: string
  minGuests: number
  maxGuests: number
}

export const SERVICE_STYLE_TEMPLATES: ServiceStyleTemplate[] = [
  {
    id: 'plated_dinner',
    name: 'Plated Dinner',
    description: 'Individual plates prepared in kitchen, served to each guest at the table',
    staffRatio: { serversPerGuests: 20, kitchenStaffPerGuests: 40 },
    suggestedEquipment: ['plate covers', 'garnish containers', 'warming lamps', 'tray jacks'],
    typicalCourses: 4,
    serviceNotes: 'Requires plating space in kitchen. Each course fires on command.',
    minGuests: 2,
    maxGuests: 200,
  },
  {
    id: 'buffet',
    name: 'Buffet Service',
    description: 'Guests serve themselves from a centralized food display',
    staffRatio: { serversPerGuests: 30, kitchenStaffPerGuests: 50 },
    suggestedEquipment: [
      'chafing dishes',
      'sterno',
      'serving spoons',
      'sneeze guards',
      'bus tubs',
      'linen',
    ],
    typicalCourses: 1,
    serviceNotes: 'Need clear traffic flow. Replenish trays every 20 minutes.',
    minGuests: 15,
    maxGuests: 500,
  },
  {
    id: 'family_style',
    name: 'Family Style',
    description: 'Large platters placed on tables for guests to share',
    staffRatio: { serversPerGuests: 25, kitchenStaffPerGuests: 40 },
    suggestedEquipment: ['large platters', 'serving bowls', 'serving utensils', 'lazy susans'],
    typicalCourses: 3,
    serviceNotes: 'Calculate portions at 1.5x per person to account for self-service waste.',
    minGuests: 8,
    maxGuests: 150,
  },
  {
    id: 'cocktail_reception',
    name: 'Cocktail Reception',
    description: 'Passed appetizers and small bites with standing guests',
    staffRatio: { serversPerGuests: 15, kitchenStaffPerGuests: 30 },
    suggestedEquipment: [
      'cocktail napkins',
      'small plates',
      'passing trays',
      'high-top tables',
      'bar setup',
    ],
    typicalCourses: 0,
    serviceNotes:
      'Plan 8-12 pieces per person for 2-hour reception. Heavier for dinner replacement.',
    minGuests: 20,
    maxGuests: 300,
  },
  {
    id: 'stations',
    name: 'Food Stations',
    description: 'Multiple themed stations around the venue, each with different cuisine',
    staffRatio: { serversPerGuests: 20, kitchenStaffPerGuests: 25 },
    suggestedEquipment: [
      'station signage',
      'chafing dishes',
      'small plates',
      'station tables',
      'extension cords',
    ],
    typicalCourses: 0,
    serviceNotes: 'One chef per station ideal. Stagger opening to manage flow.',
    minGuests: 30,
    maxGuests: 400,
  },
  {
    id: 'drop_off',
    name: 'Drop-Off Catering',
    description: 'Food prepared and delivered, no on-site service staff',
    staffRatio: { serversPerGuests: 0, kitchenStaffPerGuests: 50 },
    suggestedEquipment: [
      'disposable chafing dishes',
      'sterno',
      'serving utensils',
      'setup instructions card',
    ],
    typicalCourses: 1,
    serviceNotes: 'Include written setup and reheating instructions. Label all containers.',
    minGuests: 10,
    maxGuests: 200,
  },
]

/** Look up a service style template by ID */
export function getServiceStyleTemplate(id: ServiceStyleId): ServiceStyleTemplate | undefined {
  return SERVICE_STYLE_TEMPLATES.find((s) => s.id === id)
}

/**
 * Calculate recommended staff count for a given guest count and style.
 * Pure deterministic math, no AI.
 */
export function calculateStaffing(
  guestCount: number,
  ratio: StaffRatio
): {
  servers: number
  kitchenStaff: number
  totalStaff: number
} {
  const servers = ratio.serversPerGuests > 0 ? Math.ceil(guestCount / ratio.serversPerGuests) : 0
  const kitchenStaff =
    ratio.kitchenStaffPerGuests > 0 ? Math.ceil(guestCount / ratio.kitchenStaffPerGuests) : 0
  return { servers, kitchenStaff, totalStaff: servers + kitchenStaff }
}

/**
 * Recommend a service style based on guest count.
 * Returns the best-fit style (deterministic logic).
 */
export function recommendServiceStyle(guestCount: number): ServiceStyleTemplate {
  // Simple logic: pick the style that best fits the guest count
  if (guestCount <= 10) return SERVICE_STYLE_TEMPLATES[0] // plated dinner
  if (guestCount <= 30) return SERVICE_STYLE_TEMPLATES[2] // family style
  if (guestCount <= 60) return SERVICE_STYLE_TEMPLATES[0] // plated dinner (still works)
  if (guestCount <= 150) return SERVICE_STYLE_TEMPLATES[1] // buffet
  return SERVICE_STYLE_TEMPLATES[4] // stations for large events
}
