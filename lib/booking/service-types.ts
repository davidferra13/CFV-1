const SERVICE_TYPE_ALIASES: Record<string, string> = {
  dinner_party: 'private_dinner',
  private_dinner: 'private_dinner',
  private_dining: 'private_dinner',
  personal_chef: 'private_dinner',
  meal_prep: 'meal_prep',
  catering: 'catering',
  wedding: 'wedding',
  corporate: 'corporate',
  corporate_dining: 'corporate',
  cooking_class: 'cooking_class',
  event_chef: 'event_chef',
  other: 'other',
}

export function canonicalizeBookingServiceType(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return ''
  return SERVICE_TYPE_ALIASES[normalized] ?? normalized
}

export function isPrivateDinnerServiceType(value: string | null | undefined): boolean {
  return canonicalizeBookingServiceType(value) === 'private_dinner'
}
