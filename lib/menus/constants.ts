// Menu constants — exported separately from server actions so they can be
// used in client components without triggering the 'use server' object export restriction.

export const COMPONENT_CATEGORIES = [
  'sauce', 'protein', 'starch', 'vegetable', 'fruit',
  'dessert', 'garnish', 'bread', 'cheese', 'condiment', 'beverage', 'other'
] as const

export const TRANSPORT_CATEGORIES = ['cold', 'frozen', 'room_temp', 'fragile', 'liquid'] as const

export type ComponentCategory = typeof COMPONENT_CATEGORIES[number]
export type TransportCategory = typeof TRANSPORT_CATEGORIES[number]
