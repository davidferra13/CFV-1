export const TEMPERATURE_LOCATIONS = [
  { id: 'walk_in_cooler', label: 'Walk-in Cooler', minF: 33, maxF: 40 },
  { id: 'walk_in_freezer', label: 'Walk-in Freezer', minF: -10, maxF: 0 },
  { id: 'prep_fridge', label: 'Prep Fridge', minF: 33, maxF: 40 },
  { id: 'hot_holding', label: 'Hot Holding', minF: 135, maxF: 165 },
  { id: 'cold_holding', label: 'Cold Holding', minF: 33, maxF: 40 },
  { id: 'dish_machine', label: 'Dish Machine Final Rinse', minF: 180, maxF: 220 },
] as const

export const DEFAULT_CLEANING_TASKS = {
  kitchen: [
    'Sanitize cutting boards',
    'Clean prep surfaces',
    'Degrease range hood',
    'Clean fryers',
    'Sanitize sinks',
    'Clean floor drains',
  ],
  foh: [
    'Wipe tables and chairs',
    'Clean bar top',
    'Sanitize menus',
    'Clean glass/mirrors',
    'Vacuum/sweep/mop',
  ],
  restroom: [
    'Clean toilets',
    'Restock supplies',
    'Sanitize surfaces',
    'Mop floors',
    'Check soap/towels',
  ],
  storage: ['Organize walk-in', 'FIFO check', 'Check expiry dates', 'Clean shelving'],
} as const
