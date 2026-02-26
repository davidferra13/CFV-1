// Fire Order Constants
// Lives in a separate file (no 'use server') so these can be imported by client
// components if needed, without triggering the 'use server' object export restriction.

export type CourseType =
  | 'AMUSE'
  | 'APP'
  | 'SOUP'
  | 'SALAD'
  | 'FISH'
  | 'INTERMEZZO'
  | 'MAIN'
  | 'CHEESE'
  | 'DESSERT'
  | 'PETIT_FOUR'

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
  'AMUSE',
  'APP',
  'SOUP',
  'SALAD',
  'FISH',
  'INTERMEZZO',
  'MAIN',
  'CHEESE',
  'DESSERT',
  'PETIT_FOUR',
]

export type StationType =
  | 'SAUCIER'
  | 'POISSONNIER'
  | 'ROTISSEUR'
  | 'GRILLARDIN'
  | 'FRITURIER'
  | 'ENTREMETIER'
  | 'TOURNANT'
  | 'PATISSIER'
  | 'GARDE_MANGER'
  | 'BOUCHER'

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
